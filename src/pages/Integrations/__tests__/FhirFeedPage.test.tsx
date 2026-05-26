import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FhirFeedPage } from '@/pages/Integrations/FhirFeedPage';
import type { FhirFeedRow } from '@/api/integrations';

vi.mock('@/api/integrations', () => ({
  listFhirFeed: vi.fn(),
}));

import { listFhirFeed } from '@/api/integrations';

beforeEach(() => vi.clearAllMocks());

function row(over: Partial<FhirFeedRow> = {}) {
  return {
    id: 1,
    receivedAtUtc: '2026-05-20T10:00:00Z',
    resourceType: 'Patient',
    resourceId: 42,
    status: 'created' as const,
    diagnostics: 'Patient/42 created',
    bundleEntryIndex: null,
    ...over,
  };
}

describe('FhirFeedPage', () => {
  it('renders the recent feed rows', async () => {
    vi.mocked(listFhirFeed).mockResolvedValue({
      data: [row(), row({ id: 2, status: 'validation-error', diagnostics: 'birthDate invalid' })],
      count: 2,
    });

    render(<FhirFeedPage />);

    expect(await screen.findByText('Patient/42 created')).toBeInTheDocument();
    expect(screen.getByText('birthDate invalid')).toBeInTheDocument();
    // Two status cells
    expect(screen.getByText('created')).toBeInTheDocument();
    expect(screen.getByText('validation-error')).toBeInTheDocument();
  });

  it('shows empty state when no rows', async () => {
    vi.mocked(listFhirFeed).mockResolvedValue({ data: [], count: 0 });
    render(<FhirFeedPage />);
    expect(await screen.findByText(/No FHIR ingestion activity/i)).toBeInTheDocument();
  });

  it('re-fetches when the status filter changes', async () => {
    const user = userEvent.setup();
    vi.mocked(listFhirFeed).mockResolvedValue({ data: [], count: 0 });
    render(<FhirFeedPage />);

    // Initial call with no filter
    await waitFor(() => {
      expect(listFhirFeed).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined, resourceType: undefined }),
      );
    });

    await user.selectOptions(
      screen.getByLabelText('Filter by status'),
      'validation-error',
    );

    await waitFor(() => {
      expect(listFhirFeed).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'validation-error' }),
      );
    });
  });

  it('shows the API error when the load fails', async () => {
    vi.mocked(listFhirFeed).mockRejectedValueOnce({
      response: { data: { error: 'forbidden' } },
    });
    render(<FhirFeedPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('forbidden');
  });
});
