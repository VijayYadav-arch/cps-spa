import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SurveyorBundlePage } from '@/pages/Compliance/SurveyorBundlePage';
import type { SurveyorBundleManifest } from '@/api/compliance';

vi.mock('@/api/compliance', () => ({
  getSurveyorBundleManifest: vi.fn(),
  downloadSurveyorBundle: vi.fn(),
}));

import {
  downloadSurveyorBundle,
  getSurveyorBundleManifest,
} from '@/api/compliance';

function renderPage() {
  return render(
    <MemoryRouter>
      <SurveyorBundlePage />
    </MemoryRouter>,
  );
}

function manifest(over: Partial<SurveyorBundleManifest> = {}): SurveyorBundleManifest {
  return {
    generatedAtUtc: '2026-05-19T12:00:00Z',
    patientId: 100,
    patientName: 'Doe, Jane',
    medicareId: '1EG4-TE5-MK74',
    admittedAt: '2026-03-01',
    dateOfDeath: null,
    windowFrom: '2026-01-01',
    windowTo: '2026-05-19',
    electionCount: 1,
    certificationCount: 2,
    faceToFaceCount: 1,
    carePlanReviewCount: 3,
    idgMeetingCount: 4,
    volunteerHoursTotal: 12,
    files: [
      { fileName: 'elections.csv', contentType: 'text/csv', rowCount: 1 },
      { fileName: 'certifications.csv', contentType: 'text/csv', rowCount: 2 },
      { fileName: 'manifest.json', contentType: 'application/json', rowCount: 0 },
    ],
    ...over,
  };
}

describe('SurveyorBundlePage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('previews the manifest after entering a patient', async () => {
    const user = userEvent.setup();
    vi.mocked(getSurveyorBundleManifest).mockResolvedValueOnce(manifest());

    renderPage();
    await user.type(screen.getByLabelText('Patient ID'), '100');
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => {
      expect(getSurveyorBundleManifest).toHaveBeenCalledWith(
        100,
        expect.any(String),
        expect.any(String),
      );
    });
    expect(screen.getByText(/Doe, Jane/i)).toBeInTheDocument();
    expect(screen.getByText(/Medicare ID/i)).toBeInTheDocument();
    expect(screen.getByText('Elections')).toBeInTheDocument();
    expect(screen.getByText('Volunteer Hours')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Download Bundle/i }),
    ).toBeInTheDocument();
  });

  it('shows the bundle file table', async () => {
    const user = userEvent.setup();
    vi.mocked(getSurveyorBundleManifest).mockResolvedValueOnce(manifest());

    renderPage();
    await user.type(screen.getByLabelText('Patient ID'), '100');
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => {
      expect(screen.getByText('elections.csv')).toBeInTheDocument();
    });
    expect(screen.getByText('certifications.csv')).toBeInTheDocument();
    expect(screen.getByText('manifest.json')).toBeInTheDocument();
  });

  it('downloads the bundle when the download button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getSurveyorBundleManifest).mockResolvedValueOnce(manifest());
    vi.mocked(downloadSurveyorBundle).mockResolvedValueOnce('bundle.zip');

    renderPage();
    await user.type(screen.getByLabelText('Patient ID'), '100');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByRole('button', { name: /Download Bundle/i });
    await user.click(screen.getByRole('button', { name: /Download Bundle/i }));

    await waitFor(() => {
      expect(downloadSurveyorBundle).toHaveBeenCalledWith(
        100, expect.any(String), expect.any(String),
      );
    });
    expect(screen.getByText(/Downloaded/i)).toBeInTheDocument();
  });

  it('shows error when manifest fetch fails', async () => {
    const user = userEvent.setup();
    vi.mocked(getSurveyorBundleManifest).mockRejectedValueOnce({
      response: { data: { error: 'Patient 100 not found.' } },
    });
    renderPage();
    await user.type(screen.getByLabelText('Patient ID'), '100');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await waitFor(() => {
      expect(screen.getByText(/Patient 100 not found/i)).toBeInTheDocument();
    });
  });
});
