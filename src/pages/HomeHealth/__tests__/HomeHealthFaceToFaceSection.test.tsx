import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeHealthFaceToFaceSection } from '@/pages/HomeHealth/HomeHealthFaceToFaceSection';

vi.mock('@/api/homehealth', () => ({
  listFaceToFace: vi.fn(),
  recordFaceToFace: vi.fn(),
}));
import { listFaceToFace, recordFaceToFace } from '@/api/homehealth';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listFaceToFace).mockResolvedValue([] as never);
});

describe('HomeHealthFaceToFaceSection', () => {
  it('shows the empty state and records a face-to-face', async () => {
    vi.mocked(recordFaceToFace).mockResolvedValue({
      id: 1, episodeId: 500, encounterDate: '2026-06-20', clinicianUserId: 7,
      clinicianType: 'Physician', attestationText: 'Related.', createdAt: '2026-06-21T00:00:00Z',
    } as never);

    render(<HomeHealthFaceToFaceSection episodeId={500} canManage />);
    await waitFor(() => expect(screen.getByTestId('hh-ftf-empty')).toBeInTheDocument());

    await userEvent.type(screen.getByTestId('hh-ftf-date'), '2026-06-20');
    await userEvent.clear(screen.getByTestId('hh-ftf-clinician'));
    await userEvent.type(screen.getByTestId('hh-ftf-clinician'), '7');
    await userEvent.type(screen.getByTestId('hh-ftf-attestation'), 'Related.');
    await userEvent.click(screen.getByTestId('hh-ftf-submit'));

    await waitFor(() =>
      expect(vi.mocked(recordFaceToFace)).toHaveBeenCalledWith(500, expect.objectContaining({
        encounterDate: '2026-06-20', clinicianUserId: 7, clinicianType: 'Physician', attestationText: 'Related.',
      })),
    );
    await waitFor(() => expect(screen.getByTestId('hh-ftf-1')).toBeInTheDocument());
  });

  it('disables submit without manage permission', async () => {
    render(<HomeHealthFaceToFaceSection episodeId={500} canManage={false} />);
    await waitFor(() => expect(screen.getByTestId('hh-ftf-empty')).toBeInTheDocument());
    const btn = screen.getByTestId('hh-ftf-submit');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });
});
