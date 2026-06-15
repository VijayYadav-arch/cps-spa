import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdverseEventDetailPage } from '@/pages/Quality/AdverseEventDetailPage';
import * as qapiApi from '@/api/qapi';

vi.mock('@/api/qapi');

vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function makeEvent(overrides: Partial<qapiApi.HospiceAdverseEvent> = {}): qapiApi.HospiceAdverseEvent {
  return {
    id: 5,
    organizationId: 1,
    category: 'MedicationError',
    severity: 'Major',
    source: 'Manual',
    status: 'Active',
    eventDate: '2026-04-01',
    reportedByUserId: 3,
    patientId: 200,
    summary: 'Wrong dose administered',
    immediateActionTaken: 'Notified physician',
    sourceAuditEventCode: null,
    notes: null,
    closedAt: null,
    closedByUserId: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    rca: null,
    ...overrides,
  };
}

function renderDetail(eventId = '5') {
  return render(
    <MemoryRouter initialEntries={[`/quality/qapi/adverse-events/${eventId}`]}>
      <Routes>
        <Route path="/quality/qapi/adverse-events/:eventId" element={<AdverseEventDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdverseEventDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(['hospice:qapi_adverse_event_view', 'hospice:qapi_adverse_event_manage']);
  });

  it('shows RCA form when event has no rca and is not dismissed', async () => {
    vi.mocked(qapiApi.getAdverseEvent).mockResolvedValueOnce(makeEvent({ rca: null, status: 'Active' }));

    renderDetail();

    await waitFor(() =>
      expect(screen.getByText(/Root Cause Analysis/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/RCA form/i)).toBeInTheDocument();
  });

  it('shows existing RCA data when rca is present', async () => {
    vi.mocked(qapiApi.getAdverseEvent).mockResolvedValueOnce(makeEvent({
      status: 'Closed',
      rca: {
        id: 10,
        eventId: 5,
        rcaMethod: 'FiveWhys',
        contributingFactors: 'Understaffing at shift handoff',
        rootCauseSummary: 'Inadequate handoff protocol',
        rcaCompletedAt: '2026-04-10T00:00:00Z',
        rcaCompletedByUserId: 3,
        linkedPipId: null,
      },
    }));

    renderDetail();

    await waitFor(() =>
      expect(screen.getByText(/Inadequate handoff protocol/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Understaffing at shift handoff/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/RCA form/i)).not.toBeInTheDocument();
  });

  describe('permission gating', () => {
    it('disables status-transition buttons with a tooltip when the user lacks adverse-event-manage', async () => {
      setPermissions(['hospice:qapi_adverse_event_view']); // no manage
      vi.mocked(qapiApi.getAdverseEvent).mockResolvedValueOnce(makeEvent({ status: 'Active' }));

      renderDetail();

      const btn = await screen.findByRole('button', { name: /Move to Closed/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables status-transition buttons when the user has adverse-event-manage', async () => {
      setPermissions(['hospice:qapi_adverse_event_view', 'hospice:qapi_adverse_event_manage']);
      vi.mocked(qapiApi.getAdverseEvent).mockResolvedValueOnce(makeEvent({ status: 'Active' }));

      renderDetail();

      expect(await screen.findByRole('button', { name: /Move to Closed/i })).toBeEnabled();
    });
  });
});
