import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomeHealthOasisSection } from '@/pages/HomeHealth/HomeHealthOasisSection';
import * as hhApi from '@/api/homehealth';

vi.mock('@/api/homehealth');

describe('HomeHealthOasisSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hhApi.listOasis).mockResolvedValue([]);
  });

  it('shows empty state then creates an OASIS with functional items', async () => {
    vi.mocked(hhApi.createOasis).mockResolvedValue({
      id: 1, episodeId: 42, periodNumber: 1, assessmentType: 'start-of-care', assessmentDate: '2026-06-01',
      status: 'draft', functional: { grooming: 2, dressUpper: 0, dressLower: 0, bathing: 0, toiletTransferring: 0, transferring: 0, ambulation: 0 },
      functionalPoints: 2, functionalLevel: 'low', completedAt: null,
    });

    render(<HomeHealthOasisSection episodeId={42} canManage />);
    await waitFor(() => expect(screen.getByText(/no oasis assessment yet/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new oasis/i }));
    fireEvent.change(screen.getByLabelText(/grooming/i), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /create oasis/i }));

    await waitFor(() =>
      expect(hhApi.createOasis).toHaveBeenCalledWith(42, expect.objectContaining({ assessmentType: 'start-of-care', grooming: 2 })),
    );
  });

  it('renders functional level + completes a draft', async () => {
    vi.mocked(hhApi.listOasis).mockResolvedValue([{
      id: 9, episodeId: 42, periodNumber: 1, assessmentType: 'start-of-care', assessmentDate: '2026-06-01',
      status: 'draft', functional: { grooming: 3, dressUpper: 3, dressLower: 3, bathing: 3, toiletTransferring: 3, transferring: 3, ambulation: 3 },
      functionalPoints: 21, functionalLevel: 'high', completedAt: null,
    }]);
    vi.mocked(hhApi.completeOasis).mockResolvedValue({} as hhApi.HomeHealthOasis);

    render(<HomeHealthOasisSection episodeId={42} canManage />);
    await waitFor(() => expect(screen.getByText(/high \(21\)/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /complete/i }));
    await waitFor(() => expect(hhApi.completeOasis).toHaveBeenCalledWith(9));
  });
});
