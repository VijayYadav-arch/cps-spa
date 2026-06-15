import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HospiceBereavementProgramDetail } from '@/pages/Hospice/HospiceBereavementProgramDetail';
import type {
  BereavementContact,
  BereavementProgram,
} from '@/api/hospice';

vi.mock('@/api/hospice', () => ({
  getBereavementProgram: vi.fn(),
  listBereavementContacts: vi.fn(),
  listBereavementEncounters: vi.fn(),
  completeBereavementProgram: vi.fn(),
  closeBereavementProgram: vi.fn(),
  addRiskAssessment: vi.fn(),
  setPrimaryContact: vi.fn(),
  optOutContact: vi.fn(),
  deleteBereavementContact: vi.fn(),
  // imported by the child forms this page renders
  createBereavementContact: vi.fn(),
  recordBereavementEncounter: vi.fn(),
}));

import {
  getBereavementProgram,
  listBereavementContacts,
  listBereavementEncounters,
} from '@/api/hospice';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue(
    { data: { permissions } } as unknown as ReturnType<typeof useUserRoles>,
  );
}

function program(over: Partial<BereavementProgram> = {}): BereavementProgram {
  return {
    id: 9,
    patientId: 42,
    dateOfDeath: '2025-05-01',
    programEndDate: '2026-06-01',
    daysUntilProgramEnd: 100,
    status: 'Active',
    coordinatorUserId: null,
    initialAssessmentDate: null,
    initialRiskLevel: null,
    riskHistory: '[]',
    closureReason: null,
    createdAt: '2025-05-02T00:00:00Z',
    ...over,
  };
}

function contact(over: Partial<BereavementContact> = {}): BereavementContact {
  return {
    id: 100,
    bereavementProgramId: 9,
    firstName: 'Jane',
    lastName: 'Roe',
    relationship: 'Spouse',
    contactPreference: 'Phone',
    phone: '555-0100',
    email: null,
    address: null,
    isPrimaryContact: false,
    optedOut: false,
    optedOutAt: null,
    notes: null,
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/hospice/bereavement/9']}>
      <Routes>
        <Route path="/hospice/bereavement/:programId" element={<HospiceBereavementProgramDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user holds hospice:bereavement so the action buttons render enabled.
  setPermissions(['hospice:view', 'hospice:bereavement']);
  vi.mocked(getBereavementProgram).mockResolvedValue(program());
  vi.mocked(listBereavementContacts).mockResolvedValue({ data: [contact()] });
  vi.mocked(listBereavementEncounters).mockResolvedValue({ data: [] });
});

describe('HospiceBereavementProgramDetail — permission gating', () => {
  it('enables state-changing buttons when the user has hospice:bereavement', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /Complete Program/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Close Program/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Add Risk Assessment/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Set Primary/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Opt Out/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeEnabled();
  });

  it('disables Complete Program with a permission tooltip when the user lacks hospice:bereavement', async () => {
    setPermissions(['hospice:view']); // no hospice:bereavement
    renderPage();
    const btn = await screen.findByRole('button', { name: /Complete Program/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });

  it('disables Close / Add Risk / contact-row actions when the user lacks hospice:bereavement', async () => {
    setPermissions(['hospice:view']); // no hospice:bereavement
    renderPage();
    expect(await screen.findByRole('button', { name: /Close Program/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Add Risk Assessment/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Set Primary/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Opt Out/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeDisabled();
  });
});
