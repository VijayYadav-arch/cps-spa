import axios from 'axios';

/**
 * Axios instance for family-member API calls (uses FamilyJwt scheme).
 *
 * Token source: sessionStorage 'cps-family-token' (managed by PortalAuthContext.loginAsFamily).
 * 401 handling: clear family-* keys + redirect to /family/login?reason=expired.
 *
 * Do NOT use this instance for staff API calls — use apiClient (src/api/client.ts) instead.
 * Do NOT use this instance for patient-self-service API calls — use portalApi/portalClient instead.
 *
 * baseURL chosen to match the cps-dotnet FamilyJwt scheme route prefix (/family-api/...).
 * Family pages should call e.g. familyApi.get('/dashboard') which maps to /family-api/dashboard.
 */
export const familyApi = axios.create({
  baseURL: '/family-api',
});

familyApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('cps-family-token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

familyApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      sessionStorage.removeItem('cps-family-token');
      sessionStorage.removeItem('cps-family-expires-at');
      sessionStorage.removeItem('cps-family-patient-id');
      sessionStorage.removeItem('cps-family-access-id');
      // Redirect to family login. Use window.location.href to fully reset React state.
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/family/login')) {
        window.location.href = '/family/login?reason=expired';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Server-Sent-Events payload from POST /family-api/patients/{patientId}/chat/stream.
 * Three event types arrive on the wire:
 *   - `delta` carries `{ text }` for an incremental answer chunk
 *   - `done` carries the assembled metadata (sources, correlationId, followUps, tokens)
 *   - `error` carries `{ error, message }` and ends the stream
 *
 * The streaming helper translates each event into one of the callback fires
 * below so the caller doesn't have to parse SSE itself.
 */
export interface FamilyChatStreamDoneEvent {
  sources: string[];
  correlationId: string;
  followUps: string[];
  inputTokens: number;
  outputTokens: number;
}

export interface FamilyChatStreamErrorEvent {
  /**
   * Either an HTTP-level status (when the stream never started, e.g. 429 / 503 / 502)
   * or 0 when the stream opened OK and surfaced an in-stream `event: error` frame.
   */
  status: number;
  /** Short tag matching the non-streaming endpoint shape: rate_limited, ai_not_available, etc. */
  error: string;
  message?: string;
}

export interface StreamFamilyChatBody {
  question: string;
  locale: string;
  includeVisitDetails?: boolean;
  recentTurns?: { question: string; answer: string }[];
}

export interface StreamFamilyChatHandlers {
  onDelta: (text: string) => void;
  onDone: (event: FamilyChatStreamDoneEvent) => void;
  onError: (event: FamilyChatStreamErrorEvent) => void;
}

/**
 * Calls the backend SSE chat endpoint, parses the event stream, and routes
 * each event to the appropriate callback. Returns a Promise that resolves
 * once the stream is fully consumed (or rejects on a transport-level error
 * that occurred before the response was readable -- network down, CORS, etc).
 *
 * The Promise resolving does not imply success: an in-stream error event
 * fires onError and then the Promise resolves normally because the wire
 * stream itself completed cleanly. Callers should treat `onDone` and
 * `onError` as mutually exclusive terminal states.
 */
export async function streamFamilyChat(
  patientId: number,
  body: StreamFamilyChatBody,
  handlers: StreamFamilyChatHandlers,
  signal?: AbortSignal
): Promise<void> {
  const token = sessionStorage.getItem('cps-family-token');
  const res = await fetch(`/family-api/patients/${patientId}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    // Pre-stream JSON envelope -- same shape as POST /chat.
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = (await res.json()) as { error?: string; message?: string };
    } catch {
      // body wasn't JSON; surface a generic error
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
        dispatchFrame(frame, handlers);
        sep = buffer.indexOf('\n\n');
      }
    }
    // Flush any trailing frame that didn't have a closing blank line.
    if (buffer.trim().length > 0) dispatchFrame(buffer, handlers);
  } catch (err) {
    // Reader threw -- transport-level interruption, surface as a generic error.
    if ((err as { name?: string })?.name === 'AbortError') return;
    handlers.onError({ status: 0, error: 'ai_provider_unreachable' });
  }
}

function dispatchFrame(frame: string, handlers: StreamFamilyChatHandlers): void {
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
    const d = parsed as Partial<FamilyChatStreamDoneEvent>;
    handlers.onDone({
      sources: d.sources ?? [],
      correlationId: d.correlationId ?? '',
      followUps: d.followUps ?? [],
      inputTokens: d.inputTokens ?? 0,
      outputTokens: d.outputTokens ?? 0,
    });
  } else if (eventName === 'error') {
    const e = parsed as { error?: string; message?: string };
    handlers.onError({ status: 0, error: e.error ?? 'unknown', message: e.message });
  }
}

function mapStatusToError(status: number): string {
  switch (status) {
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
