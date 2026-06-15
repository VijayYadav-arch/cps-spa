import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NewPatientForm } from '@/pages/Patients/NewPatientForm';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { data: [{ id: 7, name: 'Acme Hospice' }] } }),
    post: vi.fn(),
  },
}));

vi.mock('@/pages/Patients/intake/intakeApi', () => ({
  intakeApi: { submitFinal: vi.fn() },
}));

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_PERMS = ['patients:view', 'patients:create'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NewPatientForm />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
  // Default: user holds every permission this page uses so existing
  // behaviour tests see enabled buttons. Permission-gating tests override.
  setPermissions(ALL_PERMS);
});

describe('NewPatientForm — render', () => {
  it('renders the Create Patient submit button', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /Create Patient/i })).toBeInTheDocument();
  });
});

describe('NewPatientForm — permission gating', () => {
  it('disables Create Patient with a permission tooltip when the user lacks patients:create', async () => {
    setPermissions(['patients:view']); // no patients:create
    renderPage();

    const btn = await screen.findByRole('button', { name: /Create Patient/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });

  it('enables Create Patient when the user has patients:create', async () => {
    setPermissions(['patients:view', 'patients:create']);
    renderPage();

    expect(await screen.findByRole('button', { name: /Create Patient/i })).toBeEnabled();
  });
});
