import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomeHealthEpisodeDetail } from '@/pages/HomeHealth/HomeHealthEpisodeDetail';
import * as hhApi from '@/api/homehealth';

vi.mock('@/permissions/usePermission', () => ({ usePermission: () => true }));
vi.mock('@/api/homehealth');

const episode: hhApi.HomeHealthEpisode = {
  id: 42, patientId: 5, startOfCareDate: '2026-06-01', admissionSource: 'community',
  status: 'active', certFromDate: '2026-06-01', certToDate: '2026-07-30', periodNumber: 1,
};

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/patients/5/home-health/42']}>
      <Routes>
        <Route path="/patients/:id/home-health/:episodeId" element={<HomeHealthEpisodeDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HomeHealthEpisodeDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hhApi.getHomeHealthEpisode).mockResolvedValue(episode);
    vi.mocked(hhApi.listPlansOfCare).mockResolvedValue([]);
    vi.mocked(hhApi.listOasis).mockResolvedValue([]);
  });

  it('renders episode details + empty POC state', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Home Health Episode #42')).toBeInTheDocument());
    expect(screen.getByText(/no plan of care yet/i)).toBeInTheDocument();
  });

  it('creates a plan of care', async () => {
    vi.mocked(hhApi.createPlanOfCare).mockResolvedValue({
      id: 1, episodeId: 42, periodNumber: 1, certifyingPhysicianName: 'Dr. Smith',
      certifyingPhysicianNpi: null, faceToFaceDate: '2026-05-20', orders: null, goals: null,
      status: 'draft', signedBy: null, signedAt: null,
    });
    renderDetail();
    await waitFor(() => screen.getByText('Home Health Episode #42'));

    fireEvent.click(screen.getByRole('button', { name: /new plan of care/i }));
    fireEvent.change(screen.getByLabelText(/certifying physician/i), { target: { value: 'Dr. Smith' } });
    fireEvent.click(screen.getByRole('button', { name: /create plan of care/i }));

    await waitFor(() =>
      expect(hhApi.createPlanOfCare).toHaveBeenCalledWith(42, expect.objectContaining({ certifyingPhysicianName: 'Dr. Smith' })),
    );
  });

  it('recertifies the episode', async () => {
    vi.mocked(hhApi.recertifyEpisode).mockResolvedValue({ ...episode, periodNumber: 2, certFromDate: '2026-07-31', certToDate: '2026-09-28' });
    renderDetail();
    await waitFor(() => screen.getByText('Home Health Episode #42'));

    fireEvent.click(screen.getByRole('button', { name: /recertify/i }));

    await waitFor(() => expect(hhApi.recertifyEpisode).toHaveBeenCalledWith(42));
  });

  it('signs a draft plan of care', async () => {
    vi.mocked(hhApi.listPlansOfCare).mockResolvedValue([{
      id: 9, episodeId: 42, periodNumber: 1, certifyingPhysicianName: 'Dr. Smith',
      certifyingPhysicianNpi: null, faceToFaceDate: '2026-05-20', orders: null, goals: null,
      status: 'draft', signedBy: null, signedAt: null,
    }]);
    vi.mocked(hhApi.signPlanOfCare).mockResolvedValue({} as hhApi.HomeHealthPlanOfCare);
    vi.spyOn(window, 'prompt').mockReturnValue('Dr. Smith');

    renderDetail();
    await waitFor(() => screen.getByRole('button', { name: 'Sign' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));

    await waitFor(() => expect(hhApi.signPlanOfCare).toHaveBeenCalledWith(9, 'Dr. Smith'));
  });
});
