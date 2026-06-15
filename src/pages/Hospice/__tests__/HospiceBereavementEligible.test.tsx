import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HospiceBereavementEligible } from '@/pages/Hospice/HospiceBereavementEligible';
import type { BereavementProgram } from '@/api/hospice';

vi.mock('@/api/hospice', () => ({
  listEligibleForCompletion: vi.fn(),
  completeBereavementProgram: vi.fn(),
}));

import { listEligibleForCompletion } from '@/api/hospice';

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
    id: 11,
    patientId: 42,
    dateOfDeath: '2025-05-01',
    programEndDate: '2026-06-01',
    daysUntilProgramEnd: 0,
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

function renderPage() {
  return render(
    <MemoryRouter>
      <HospiceBereavementEligible />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user holds hospice:bereavement so the Complete button renders enabled.
  setPermissions(['hospice:view', 'hospice:bereavement']);
});

describe('HospiceBereavementEligible — permission gating', () => {
  it('enables Complete when the user has hospice:bereavement', async () => {
    vi.mocked(listEligibleForCompletion).mockResolvedValue({ data: [program()] });
    renderPage();
    expect(await screen.findByRole('button', { name: /^Complete$/i })).toBeEnabled();
  });

  it('disables Complete with a permission tooltip when the user lacks hospice:bereavement', async () => {
    setPermissions(['hospice:view']); // no hospice:bereavement
    vi.mocked(listEligibleForCompletion).mockResolvedValue({ data: [program()] });
    renderPage();
    const btn = await screen.findByRole('button', { name: /^Complete$/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });
});
