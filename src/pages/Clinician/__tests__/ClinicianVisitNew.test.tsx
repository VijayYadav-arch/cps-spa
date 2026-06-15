import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClinicianVisitNew } from '@/pages/Clinician/ClinicianVisitNew';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));
import { apiClient } from '@/api/client';

// useAuth supplies the signed-in clinician. ClinicianVisitNew reads
// auth.user.roles[0] + auth.user.userId.
vi.mock('@/auth/useAuth', () => ({ useAuth: vi.fn() }));
import { useAuth } from '@/auth/useAuth';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_VISIT_PERMS = ['clinical:visit_notes'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: signed-in nurse holding clinical:visit_notes so existing
  // behaviour sees enabled buttons. Permission-gating tests override.
  vi.mocked(useAuth).mockReturnValue({
    auth: { isAuthenticated: true, user: { userId: 42, organizationId: 1, roles: ['nurse'] } },
    loginWithSSO: vi.fn(),
    logout: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
  setPermissions(ALL_VISIT_PERMS);
  // Patient list load resolves to an empty list — the form still renders.
  vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } } as never);
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/clinician/visits/new']}>
      <ClinicianVisitNew />
    </MemoryRouter>,
  );
}

describe('ClinicianVisitNew', () => {
  it('renders the visit form', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('visit-form')).toBeInTheDocument();
    });
    expect(screen.getByTestId('submit-visit')).toBeInTheDocument();
  });
});

describe('ClinicianVisitNew — permission gating', () => {
  it('disables Save Visit Note with a permission tooltip when the user lacks clinical:visit_notes', async () => {
    setPermissions([]); // no clinical:visit_notes
    renderPage();
    await waitFor(() => screen.getByTestId('submit-visit'));

    const btn = screen.getByTestId('submit-visit');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });

  it('enables Save Visit Note when the user has clinical:visit_notes', async () => {
    setPermissions(['clinical:visit_notes']);
    renderPage();
    await waitFor(() => screen.getByTestId('submit-visit'));

    expect(screen.getByTestId('submit-visit')).toBeEnabled();
  });
});
