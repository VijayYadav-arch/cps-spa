import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ClinicianVisits } from '@/pages/Clinician/ClinicianVisits';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

import { apiClient } from '@/api/client';

beforeEach(() => {
  vi.clearAllMocks();
});

function visit(id: number, patientId: number) {
  return {
    id,
    patientId,
    visitType: 'skilled-nursing',
    visitDate: '2026-06-01T10:00:00Z',
    status: 'completed',
  };
}

function patient(id: number) {
  return { id, firstName: `First${id}`, lastName: `Last${id}` };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ClinicianVisits />
    </MemoryRouter>
  );
}

describe('ClinicianVisits', () => {
  it('renders the list with resolved patient names', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: { data: [visit(1, 100), visit(2, 200)] },
      } as never)
      .mockResolvedValueOnce({ data: { data: patient(100) } } as never)
      .mockResolvedValueOnce({ data: { data: patient(200) } } as never);

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('visit-row-1').textContent).toContain('Last100, First100');
      expect(screen.getByTestId('visit-row-2').textContent).toContain('Last200, First200');
    });
  });

  it('opens the summary modal when the AI summary button is clicked', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: { data: [visit(7, 100)] },
      } as never)
      .mockResolvedValueOnce({ data: { data: patient(100) } } as never);
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        data: {
          summary: 'Patient stable.',
          inputTokens: 1,
          outputTokens: 1,
          correlationId: 'c',
        },
      },
    } as never);

    renderPage();

    await waitFor(() => screen.getByTestId('summarize-7'));
    await userEvent.click(screen.getByTestId('summarize-7'));

    await waitFor(() => {
      expect(screen.getByTestId('summary-text').textContent).toContain('Patient stable');
    });
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith('/clinician/visits/7/summarize');
  });

  it('renders empty state when no visits', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });
  });
});
