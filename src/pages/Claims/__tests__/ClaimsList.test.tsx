import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClaimsList } from '@/pages/Claims/ClaimsList';

vi.mock('@/api/claims', () => ({
  getClaims: vi.fn(),
}));

import { getClaims } from '@/api/claims';

describe('ClaimsList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loading state initially', () => {
    vi.mocked(getClaims).mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><ClaimsList /></MemoryRouter>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders claims table after data loads', async () => {
    vi.mocked(getClaims).mockResolvedValueOnce({
      data: [
        { id: 1, patientName: 'Jane Doe', status: 'pending', amount: 250.00, submittedDate: null, organizationId: 7, createdAt: '2026-01-01' },
      ],
      pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    });

    render(<MemoryRouter><ClaimsList /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('$250.00')).toBeInTheDocument();
    });
  });

  it('shows error when getClaims rejects', async () => {
    vi.mocked(getClaims).mockRejectedValueOnce(new Error('network error'));

    render(<MemoryRouter><ClaimsList /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
