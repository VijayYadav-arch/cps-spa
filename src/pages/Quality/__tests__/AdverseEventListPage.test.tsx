import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdverseEventListPage } from '@/pages/Quality/AdverseEventListPage';
import * as qapiApi from '@/api/qapi';

vi.mock('@/api/qapi');

function makeEvent(overrides: Partial<qapiApi.HospiceAdverseEvent> = {}): qapiApi.HospiceAdverseEvent {
  return {
    id: 1,
    organizationId: 1,
    category: 'PatientFall',
    severity: 'Moderate',
    source: 'Manual',
    status: 'Active',
    eventDate: '2026-03-10',
    reportedByUserId: 2,
    patientId: 100,
    summary: 'Patient fall in hallway',
    immediateActionTaken: 'Called nurse',
    sourceAuditEventCode: null,
    notes: null,
    closedAt: null,
    closedByUserId: null,
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
    rca: null,
    ...overrides,
  };
}

describe('AdverseEventListPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders event rows', async () => {
    vi.mocked(qapiApi.listAdverseEvents).mockResolvedValueOnce([
      makeEvent({ id: 1, summary: 'Patient fall in hallway', eventDate: '2026-03-10', status: 'Active' }),
      makeEvent({ id: 2, summary: 'Missed medication dose', category: 'MedicationError', severity: 'Minor', status: 'Closed', eventDate: '2026-03-15' }),
    ]);

    render(<MemoryRouter><AdverseEventListPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('Patient fall in hallway')).toBeInTheDocument());
    expect(screen.getByText('Missed medication dose')).toBeInTheDocument();
    expect(screen.getByText('2026-03-10')).toBeInTheDocument();
    expect(screen.getByText('2026-03-15')).toBeInTheDocument();
  });

  it('Draft row gets row-draft class', async () => {
    vi.mocked(qapiApi.listAdverseEvents).mockResolvedValueOnce([
      makeEvent({ id: 3, status: 'Draft', summary: 'Draft event' }),
    ]);

    render(<MemoryRouter><AdverseEventListPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('Draft event')).toBeInTheDocument());
    const row = screen.getByText('Draft event').closest('tr');
    expect(row).toHaveClass('row-draft');
  });
});
