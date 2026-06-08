import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisitNoteSummaryModal } from '@/components/VisitNoteSummaryModal';
import type { AiStreamHandlers, AiStreamErrorEvent } from '@/api/aiStream';

interface SummaryDoneEvent {
  summary: string;
  inputTokens: number;
  outputTokens: number;
  correlationId: string;
}

const streamSpy = vi.fn();
vi.mock('@/api/aiStream', () => ({
  consumeAiStream: (...args: unknown[]) => streamSpy(...args),
}));
vi.mock('@/api/staffAuthHeaders', () => ({
  staffAuthHeaders: vi.fn(async () => ({ Authorization: 'Bearer fake-jwt' })),
}));

const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

function makeStreamSuccess(deltas: string[], done: Partial<SummaryDoneEvent>) {
  return async (
    _req: unknown,
    handlers: AiStreamHandlers<SummaryDoneEvent>
  ) => {
    for (const d of deltas) handlers.onDelta(d);
    handlers.onDone({
      summary: done.summary ?? deltas.join(''),
      inputTokens: done.inputTokens ?? 0,
      outputTokens: done.outputTokens ?? 0,
      correlationId: done.correlationId ?? 'visit-note-summary-7-x',
    });
  };
}

function makeStreamError(event: Partial<AiStreamErrorEvent>) {
  return async (
    _req: unknown,
    handlers: AiStreamHandlers<SummaryDoneEvent>
  ) => {
    handlers.onError({
      status: event.status ?? 0,
      error: event.error ?? 'unknown',
      message: event.message,
    });
  };
}

describe('VisitNoteSummaryModal (streaming)', () => {
  it('paints deltas as they arrive and finalises on done', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess(
      ['BP stable; ', 'pain managed; ', 'continue regimen.'],
      { summary: 'BP stable; pain managed; continue regimen.' },
    ));

    render(<VisitNoteSummaryModal visitId={7} visitLabel="Doe, Jane" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('summary-text').textContent).toContain('continue regimen.');
    });
    // The done event replaces the live-streamed text with the final summary.
    expect(screen.getByTestId('summary-text').textContent).toContain('BP stable');
    // Cursor disappears once `done` lands.
    expect(screen.queryByTestId('streaming-cursor')).toBeNull();
    expect(streamSpy.mock.calls[0][0]).toMatchObject({
      url: '/api/v2/clinician/visits/7/summarize/stream',
      headers: { Authorization: 'Bearer fake-jwt' },
    });
  });

  it('renders the streaming cursor while text is arriving', async () => {
    // Hold the stream open by never calling onDone.
    streamSpy.mockImplementationOnce(async (
      _req: unknown,
      handlers: AiStreamHandlers<SummaryDoneEvent>,
    ) => {
      handlers.onDelta('partial output');
      // never resolves -- mimics an in-flight stream
      await new Promise<void>(() => { /* hang */ });
    });

    render(<VisitNoteSummaryModal visitId={7} visitLabel="Doe, Jane" onClose={onClose} />);
    await waitFor(() => expect(screen.getByTestId('streaming-cursor')).toBeInTheDocument());
    expect(screen.getByTestId('summary-text').textContent).toContain('partial output');
  });

  it('maps 429 / rate_limited to a friendly retryable error with retry button', async () => {
    streamSpy.mockImplementationOnce(makeStreamError({ status: 429, error: 'rate_limited' }));

    render(<VisitNoteSummaryModal visitId={7} visitLabel="Doe, Jane" onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByTestId('summary-error').textContent).toMatch(/Too many/i);
    });
    expect(screen.getByTestId('summary-retry')).toBeTruthy();
  });

  it('maps ai_not_available to a non-retryable opt-in message', async () => {
    streamSpy.mockImplementationOnce(makeStreamError({ status: 503, error: 'ai_not_available' }));

    render(<VisitNoteSummaryModal visitId={7} visitLabel="Doe, Jane" onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByTestId('summary-error').textContent).toMatch(/not available/i);
    });
    expect(screen.queryByTestId('summary-retry')).toBeNull();
  });

  it('retry refires the request and clears partial state', async () => {
    streamSpy
      .mockImplementationOnce(makeStreamError({ error: 'ai_provider_unreachable' }))
      .mockImplementationOnce(makeStreamSuccess(['On retry: stable.'], { summary: 'On retry: stable.' }));

    render(<VisitNoteSummaryModal visitId={7} visitLabel="Doe, Jane" onClose={onClose} />);
    await waitFor(() => screen.getByTestId('summary-retry'));
    await userEvent.click(screen.getByTestId('summary-retry'));

    await waitFor(() => {
      expect(screen.getByTestId('summary-text').textContent).toContain('On retry');
    });
    expect(streamSpy).toHaveBeenCalledTimes(2);
  });

  it('close button calls onClose', async () => {
    streamSpy.mockImplementationOnce(makeStreamSuccess(['x'], { summary: 'x' }));

    render(<VisitNoteSummaryModal visitId={7} visitLabel="Doe, Jane" onClose={onClose} />);
    await waitFor(() => screen.getByTestId('summary-close'));
    await userEvent.click(screen.getByTestId('summary-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
