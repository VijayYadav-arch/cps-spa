import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisitNoteSummaryModal } from '@/components/VisitNoteSummaryModal';

vi.mock('@/api/client', () => ({
  apiClient: { post: vi.fn() },
}));

import { apiClient } from '@/api/client';

const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VisitNoteSummaryModal', () => {
  it('shows loading then renders the summary', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        data: {
          summary: 'BP stable; pain managed; continue regimen.',
          inputTokens: 100,
          outputTokens: 20,
          correlationId: 'visit-note-summary-7-abc',
        },
      },
    } as never);

    render(<VisitNoteSummaryModal visitId={7} visitLabel="Doe, Jane" onClose={onClose} />);

    expect(screen.getByTestId('summary-loading')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId('summary-text')).toBeTruthy();
    });
    expect(screen.getByTestId('summary-text').textContent).toContain('BP stable');
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith('/clinician/visits/7/summarize');
  });

  it('maps 429 to a friendly retryable error with a retry button', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { status: 429 } });

    render(<VisitNoteSummaryModal visitId={7} visitLabel="Doe, Jane" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('summary-error').textContent).toMatch(/Too many/i);
    });
    expect(screen.getByTestId('summary-retry')).toBeTruthy();
  });

  it('maps 503 to a non-retryable opt-in message', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { status: 503 } });

    render(<VisitNoteSummaryModal visitId={7} visitLabel="Doe, Jane" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('summary-error').textContent).toMatch(/not available/i);
    });
    expect(screen.queryByTestId('summary-retry')).toBeNull();
  });

  it('retry refires the request', async () => {
    vi.mocked(apiClient.post)
      .mockRejectedValueOnce({ response: { status: 502 } })
      .mockResolvedValueOnce({
        data: {
          data: {
            summary: 'On retry: stable.',
            inputTokens: 80,
            outputTokens: 5,
            correlationId: 'visit-note-summary-7-retry',
          },
        },
      } as never);

    render(<VisitNoteSummaryModal visitId={7} visitLabel="Doe, Jane" onClose={onClose} />);

    await waitFor(() => screen.getByTestId('summary-retry'));
    await userEvent.click(screen.getByTestId('summary-retry'));

    await waitFor(() => {
      expect(screen.getByTestId('summary-text').textContent).toContain('On retry');
    });
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledTimes(2);
  });

  it('close button calls onClose', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        data: { summary: 's', inputTokens: 1, outputTokens: 1, correlationId: 'c' },
      },
    } as never);

    render(<VisitNoteSummaryModal visitId={7} visitLabel="Doe, Jane" onClose={onClose} />);
    await waitFor(() => screen.getByTestId('summary-close'));
    await userEvent.click(screen.getByTestId('summary-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
