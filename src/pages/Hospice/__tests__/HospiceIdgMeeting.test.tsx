import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HospiceIdgMeeting } from '@/pages/Hospice/HospiceIdgMeeting';
import type { IdgMeeting } from '@/api/hospice';

vi.mock('@/api/hospice', () => ({
  getIdgMeeting: vi.fn(),
  completeIdgMeeting: vi.fn(),
  cancelIdgMeeting: vi.fn(),
}));

import { getIdgMeeting } from '@/api/hospice';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue(
    { data: { permissions } } as unknown as ReturnType<typeof useUserRoles>,
  );
}

function meeting(over: Partial<IdgMeeting> = {}): IdgMeeting {
  return {
    id: 3,
    meetingDate: '2026-05-20T09:00:00Z',
    hospiceElectionId: 7,
    facilitatorUserId: null,
    status: 'Scheduled',
    attendees: '[]',
    patientsReviewed: '[]',
    notes: null,
    actionItems: null,
    nextMeetingDate: null,
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/hospice/idg-meetings/3']}>
      <Routes>
        <Route path="/hospice/idg-meetings/:meetingId" element={<HospiceIdgMeeting />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user holds hospice:manage so the action buttons render enabled.
  setPermissions(['hospice:view', 'hospice:manage']);
});

describe('HospiceIdgMeeting — permission gating', () => {
  it('enables Mark Completed / Cancel Meeting when the user has hospice:manage', async () => {
    vi.mocked(getIdgMeeting).mockResolvedValue(meeting());
    renderPage();
    expect(await screen.findByRole('button', { name: /Mark Completed/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Cancel Meeting/i })).toBeEnabled();
  });

  it('disables Mark Completed with a permission tooltip when the user lacks hospice:manage', async () => {
    setPermissions(['hospice:view']); // no hospice:manage
    vi.mocked(getIdgMeeting).mockResolvedValue(meeting());
    renderPage();
    const btn = await screen.findByRole('button', { name: /Mark Completed/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });

  it('disables Cancel Meeting when the user lacks hospice:manage', async () => {
    setPermissions(['hospice:view']); // no hospice:manage
    vi.mocked(getIdgMeeting).mockResolvedValue(meeting());
    renderPage();
    expect(await screen.findByRole('button', { name: /Cancel Meeting/i })).toBeDisabled();
  });
});
