import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomeHealthEpisodeWizard } from '@/pages/HomeHealth/HomeHealthEpisodeWizard';
import * as hhApi from '@/api/homehealth';

vi.mock('@/permissions/usePermission', () => ({ usePermission: () => true }));
vi.mock('@/api/homehealth');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderAt(path = '/patients/5/home-health/new?soc=2026-06-01') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/patients/:id/home-health/new" element={<HomeHealthEpisodeWizard />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HomeHealthEpisodeWizard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prefills SOC from the query param and admits to home health', async () => {
    vi.mocked(hhApi.createHomeHealthEpisode).mockResolvedValueOnce({
      id: 42, patientId: 5, startOfCareDate: '2026-06-01', admissionSource: 'community',
      status: 'active', certFromDate: '2026-06-01', certToDate: '2026-07-30', periodNumber: 1,
    });

    renderAt();
    expect(screen.getByText('Home Health Admission')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /admit to home health/i }));

    await waitFor(() =>
      expect(hhApi.createHomeHealthEpisode).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 5, startOfCareDate: '2026-06-01', admissionSource: 'community' }),
      ),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/patients/5/home-health/42');
  });

  it('surfaces a backend error', async () => {
    vi.mocked(hhApi.createHomeHealthEpisode).mockRejectedValueOnce({
      response: { data: { error: 'already has an active episode' } },
    });

    renderAt();
    fireEvent.click(screen.getByRole('button', { name: /admit to home health/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/already has an active episode/i),
    );
  });
});
