import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommercialReportsPage } from '@/pages/Portal/CommercialReportsPage';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

const mockGet = vi.mocked(apiClient.get);

const reportsEnvelope = {
  data: {
    data: [
      {
        id: 7,
        title: 'A/R Aging — May',
        type: 'ar-aging',
        period: '2026-05',
        summary: null,
        url: null,
        createdAt: '2026-05-31T00:00:00Z',
      },
    ],
  },
};

const generated = {
  data: {
    data: {
      reportId: 7,
      title: 'A/R Aging — May',
      type: 'ar-aging',
      period: '2026-05',
      generatedAt: '2026-06-01T12:00:00Z',
      result: { current: 1200, days31to60: 300, over120: 0 },
    },
  },
};

describe('CommercialReportsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generates a saved report and shows its results in a modal', async () => {
    mockGet.mockImplementation((url: string) =>
      Promise.resolve(url.includes('/generate') ? generated : reportsEnvelope) as never,
    );

    render(<CommercialReportsPage />);

    await waitFor(() => expect(screen.getByTestId('report-name')).toHaveTextContent('A/R Aging — May'));

    fireEvent.click(screen.getByTestId('report-view'));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    // money-formatted scalar from the result payload
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/reports/7/generate');
  });

  it('surfaces an error when generation fails', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('/generate')
        ? (Promise.reject(new Error('boom')) as never)
        : (Promise.resolve(reportsEnvelope) as never),
    );

    render(<CommercialReportsPage />);

    await waitFor(() => expect(screen.getByTestId('report-view')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('report-view'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Could not generate/i),
    );
  });
});
