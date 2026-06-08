import { describe, it, expect, beforeEach, vi } from 'vitest';
import { streamFamilyChat } from '@/portal/familyApi';

function sseBody(frames: string[]): Response {
  const body = frames.join('') + '';
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function errorJsonResponse(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  sessionStorage.setItem('cps-family-token', 'fake-jwt');
});

describe('streamFamilyChat', () => {
  it('dispatches delta + done events from a complete SSE response', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(sseBody([
      'event: delta\ndata: {"text":"Hello "}\n\n',
      'event: delta\ndata: {"text":"world!"}\n\n',
      'event: done\ndata: {"sources":["medications"],"correlationId":"family-chat-7-x","followUps":["More?"],"inputTokens":12,"outputTokens":3}\n\n',
    ]));

    const deltas: string[] = [];
    let done: unknown = null;
    let err: unknown = null;
    await streamFamilyChat(7, { question: 'hi', locale: 'en' }, {
      onDelta: (t) => deltas.push(t),
      onDone: (e) => { done = e; },
      onError: (e) => { err = e; },
    });

    expect(deltas).toEqual(['Hello ', 'world!']);
    expect(done).toEqual({
      sources: ['medications'],
      correlationId: 'family-chat-7-x',
      followUps: ['More?'],
      inputTokens: 12,
      outputTokens: 3,
    });
    expect(err).toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/family-api/patients/7/chat/stream',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt',
          Accept: 'text/event-stream',
        }),
      }),
    );
  });

  it('parses a frame that arrives split across two reader chunks', async () => {
    // Pre-open the wire and feed bytes manually so we can split the framing.
    const encoder = new TextEncoder();
    const chunks = [
      'event: delta\ndata: {"text":"He',
      'llo"}\n\nevent: done\ndata: {"sources":[],"correlationId":"c","followUps":[],"inputTokens":0,"outputTokens":0}\n\n',
    ];
    const stream = new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(encoder.encode(c));
        controller.close();
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );

    const deltas: string[] = [];
    await streamFamilyChat(7, { question: 'q', locale: 'en' }, {
      onDelta: (t) => deltas.push(t),
      onDone: () => {},
      onError: (e) => { throw new Error(`should not error: ${JSON.stringify(e)}`); },
    });
    expect(deltas).toEqual(['Hello']);
  });

  it('surfaces an in-stream error event via onError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(sseBody([
      'event: delta\ndata: {"text":"half "}\n\n',
      'event: error\ndata: {"error":"rate_limited","message":"too many"}\n\n',
    ]));

    const deltas: string[] = [];
    let err: { status: number; error: string; message?: string } | null = null;
    await streamFamilyChat(7, { question: 'q', locale: 'en' }, {
      onDelta: (t) => deltas.push(t),
      onDone: () => { throw new Error('should not get done'); },
      onError: (e) => { err = e; },
    });
    expect(deltas).toEqual(['half ']);
    expect(err).toEqual({ status: 0, error: 'rate_limited', message: 'too many' });
  });

  it('translates a pre-stream non-2xx response into an onError call with status mapping', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(errorJsonResponse(429, { error: 'rate_limited', message: 'slow down' }));

    let err: { status: number; error: string; message?: string } | null = null;
    await streamFamilyChat(7, { question: 'q', locale: 'en' }, {
      onDelta: () => { throw new Error('no deltas on 429'); },
      onDone: () => { throw new Error('no done on 429'); },
      onError: (e) => { err = e; },
    });
    expect(err).toEqual({ status: 429, error: 'rate_limited', message: 'slow down' });
  });

  it('falls back to a default error tag when the pre-stream body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('not json at all', { status: 503 }),
    );

    let err: { status: number; error: string } | null = null;
    await streamFamilyChat(7, { question: 'q', locale: 'en' }, {
      onDelta: () => {},
      onDone: () => {},
      onError: (e) => { err = e; },
    });
    expect(err).toEqual({ status: 503, error: 'ai_not_available' });
  });

  it('ignores malformed `data:` payloads defensively (keepalive / non-json)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(sseBody([
      ': keepalive comment\n\n',
      'data: not-json\n\n',
      'event: delta\ndata: {"text":"OK"}\n\n',
      'event: done\ndata: {"sources":[],"correlationId":"c","followUps":[],"inputTokens":0,"outputTokens":0}\n\n',
    ]));

    const deltas: string[] = [];
    await streamFamilyChat(7, { question: 'q', locale: 'en' }, {
      onDelta: (t) => deltas.push(t),
      onDone: () => {},
      onError: (e) => { throw new Error(`should not error: ${JSON.stringify(e)}`); },
    });
    expect(deltas).toEqual(['OK']);
  });
});
