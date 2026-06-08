import { describe, it, expect, beforeEach, vi } from 'vitest';
import { consumeAiStream } from '@/api/aiStream';

function sseBody(frames: string[]): Response {
  return new Response(frames.join(''), {
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
});

describe('consumeAiStream', () => {
  it('routes delta + done events from a complete SSE response', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(sseBody([
      'event: delta\ndata: {"text":"Hello "}\n\n',
      'event: delta\ndata: {"text":"world."}\n\n',
      'event: done\ndata: {"summary":"Hello world.","x":7}\n\n',
    ]));

    const deltas: string[] = [];
    let done: unknown = null;
    let err: unknown = null;
    await consumeAiStream<{ summary: string; x: number }>(
      { url: '/api/v2/feature/stream', headers: { Authorization: 'Bearer t' } },
      {
        onDelta: (t) => deltas.push(t),
        onDone: (d) => { done = d; },
        onError: (e) => { err = e; },
      },
    );

    expect(deltas).toEqual(['Hello ', 'world.']);
    expect(done).toEqual({ summary: 'Hello world.', x: 7 });
    expect(err).toBeNull();
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer t');
  });

  it('handles a frame split across two reader chunks', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'event: delta\ndata: {"text":"He',
      'llo"}\n\nevent: done\ndata: {"summary":"Hello"}\n\n',
    ];
    const stream = new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(encoder.encode(c));
        controller.close();
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    );

    const deltas: string[] = [];
    await consumeAiStream<{ summary: string }>(
      { url: '/x' },
      { onDelta: (t) => deltas.push(t), onDone: () => {}, onError: () => {} },
    );
    expect(deltas).toEqual(['Hello']);
  });

  it('surfaces in-stream error events via onError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(sseBody([
      'event: delta\ndata: {"text":"half "}\n\n',
      'event: error\ndata: {"error":"rate_limited","message":"slow down"}\n\n',
    ]));

    const deltas: string[] = [];
    let err: { status: number; error: string; message?: string } | null = null;
    await consumeAiStream<unknown>(
      { url: '/x' },
      {
        onDelta: (t) => deltas.push(t),
        onDone: () => { throw new Error('no done'); },
        onError: (e) => { err = e; },
      },
    );
    expect(deltas).toEqual(['half ']);
    expect(err).toEqual({ status: 0, error: 'rate_limited', message: 'slow down' });
  });

  it('maps pre-stream HTTP errors to onError with status preserved', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      errorJsonResponse(429, { error: 'rate_limited', message: 'slow' }),
    );

    let err: { status: number; error: string } | null = null;
    await consumeAiStream<unknown>(
      { url: '/x' },
      { onDelta: () => {}, onDone: () => {}, onError: (e) => { err = e; } },
    );
    expect(err).toEqual({ status: 429, error: 'rate_limited', message: 'slow' });
  });

  it('falls back to a default error tag when pre-stream body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('plain text', { status: 503 }),
    );

    let err: { status: number; error: string } | null = null;
    await consumeAiStream<unknown>(
      { url: '/x' },
      { onDelta: () => {}, onDone: () => {}, onError: (e) => { err = e; } },
    );
    expect(err).toEqual({ status: 503, error: 'ai_not_available' });
  });

  it('ignores malformed `data:` payloads + SSE comments defensively', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(sseBody([
      ': keepalive\n\n',
      'data: not-json\n\n',
      'event: delta\ndata: {"text":"OK"}\n\n',
      'event: done\ndata: {"summary":"OK"}\n\n',
    ]));

    const deltas: string[] = [];
    await consumeAiStream<{ summary: string }>(
      { url: '/x' },
      { onDelta: (t) => deltas.push(t), onDone: () => {}, onError: () => {} },
    );
    expect(deltas).toEqual(['OK']);
  });

  it('passes caller headers through to fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(sseBody([
      'event: done\ndata: {"summary":"x"}\n\n',
    ]));

    await consumeAiStream<unknown>(
      { url: '/x', headers: { 'X-Dev-Claims': 'abc123' } },
      { onDelta: () => {}, onDone: () => {}, onError: () => {} },
    );
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Dev-Claims']).toBe('abc123');
  });
});
