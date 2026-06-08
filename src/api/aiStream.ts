/**
 * Generic SSE consumer for AI streaming endpoints. Pairs with the
 * cps-dotnet `AiSseStreamWriter` helper: each endpoint emits exactly
 * three event types on the same wire shape, so consumer code only
 * differs in which URL + auth header to use + how to type the `done`
 * payload.
 *
 * Why `fetch` + ReadableStream and not EventSource:
 *   - EventSource can't POST and can't set custom request headers, so
 *     it can't carry the staff JWT we use for these endpoints.
 *   - fetch + ReadableStream lets us pass `Authorization`, parse SSE
 *     frames manually with a rolling buffer (handles frame split
 *     across reader chunks), and cancel via AbortController.
 */

export interface AiStreamErrorEvent<TErrorTag = string> {
  /**
   * Non-zero HTTP status when the failure happened before the SSE
   * stream opened (the response was a JSON envelope at an HTTP error
   * status); zero when the stream opened OK and an in-stream
   * `event: error` frame arrived.
   */
  status: number;
  /** Short tag matching the non-streaming endpoint shape. */
  error: TErrorTag | string;
  message?: string;
}

export interface AiStreamHandlers<TDone> {
  onDelta: (text: string) => void;
  onDone: (event: TDone) => void;
  onError: (event: AiStreamErrorEvent) => void;
}

export interface AiStreamRequest {
  url: string;
  /** Optional request body (JSON-serialised). Omit for empty POST. */
  body?: unknown;
  /**
   * Caller-supplied header builder so the helper stays transport-only.
   * Staff endpoints pass `await staffAuthHeaders()` (Bearer JWT or
   * X-Dev-Claims); family endpoints already own their own family JWT
   * pattern in `streamFamilyChat`.
   */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * POSTs to an SSE endpoint, parses the wire frames, and routes each
 * event to the appropriate callback. Resolves when the stream is
 * fully consumed (whether it ended in `done` or `error`).
 */
export async function consumeAiStream<TDone>(
  req: AiStreamRequest,
  handlers: AiStreamHandlers<TDone>
): Promise<void> {
  const res = await fetch(req.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(req.headers ?? {}),
    },
    body: req.body !== undefined ? JSON.stringify(req.body) : '{}',
    signal: req.signal,
  });

  if (!res.ok) {
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = (await res.json()) as { error?: string; message?: string };
    } catch {
      // not JSON; fall through to a status-derived tag
    }
    handlers.onError({
      status: res.status,
      error: parsed.error ?? mapStatusToError(res.status),
      message: parsed.message,
    });
    return;
  }

  if (!res.body) {
    handlers.onError({ status: 0, error: 'ai_provider_unreachable' });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE frames are separated by a blank line. Process complete frames; keep the partial tail.
      let sep = buffer.indexOf('\n\n');
      while (sep !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        dispatchFrame<TDone>(frame, handlers);
        sep = buffer.indexOf('\n\n');
      }
    }
    if (buffer.trim().length > 0) dispatchFrame<TDone>(buffer, handlers);
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return;
    handlers.onError({ status: 0, error: 'ai_provider_unreachable' });
  }
}

function dispatchFrame<TDone>(frame: string, handlers: AiStreamHandlers<TDone>): void {
  let eventName = 'message';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice('event:'.length).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trim());
  }
  if (dataLines.length === 0) return;
  const payload = dataLines.join('\n');
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return; // ignore malformed frames defensively
  }
  if (eventName === 'delta') {
    const text = (parsed as { text?: string }).text ?? '';
    if (text.length > 0) handlers.onDelta(text);
  } else if (eventName === 'done') {
    handlers.onDone(parsed as TDone);
  } else if (eventName === 'error') {
    const e = parsed as { error?: string; message?: string };
    handlers.onError({ status: 0, error: e.error ?? 'unknown', message: e.message });
  }
}

function mapStatusToError(status: number): string {
  switch (status) {
    case 404:
      return 'not_found';
    case 429:
      return 'rate_limited';
    case 503:
      return 'ai_not_available';
    case 502:
      return 'ai_provider_unreachable';
    default:
      return 'unknown';
  }
}
