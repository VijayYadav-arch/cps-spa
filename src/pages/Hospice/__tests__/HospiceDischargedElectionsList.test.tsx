import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HospiceDischargedElectionsList } from '@/pages/Hospice/HospiceDischargedElectionsList';
import * as hospiceApi from '@/api/hospice';

vi.mock('@/api/hospice');

describe('HospiceDischargedElectionsList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders list of discharges', async () => {
    vi.mocked(hospiceApi.listDischarges).mockResolvedValueOnce([
      { id: 1, reason: 'Transfer', effectiveDate: '2026-02-01' } as any,
      { id: 2, reason: 'ForCause', effectiveDate: '2026-02-15' } as any,
    ]);
    render(<MemoryRouter><HospiceDischargedElectionsList /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('2026-02-01')).toBeInTheDocument());
    expect(screen.getByText('2026-02-15')).toBeInTheDocument();
  });

  it('reason filter calls listDischarges with reason arg', async () => {
    vi.mocked(hospiceApi.listDischarges).mockResolvedValue([] as any);
    render(<MemoryRouter><HospiceDischargedElectionsList /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/filter by reason/i), { target: { value: 'ForCause' } });
    await waitFor(() => expect(hospiceApi.listDischarges).toHaveBeenCalledWith('ForCause'));
  });
});
