import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { B2cMigrationPage } from '@/pages/Admin/B2cMigration/B2cMigrationPage';

vi.mock('@/api/b2cMigration', async () => {
  const actual = await vi.importActual<typeof import('@/api/b2cMigration')>(
    '@/api/b2cMigration'
  );
  return {
    ...actual,
    listB2cOrganizations: vi.fn(),
    migrateOrgToB2c: vi.fn(),
  };
});

import { listB2cOrganizations, migrateOrgToB2c } from '@/api/b2cMigration';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function buildOrg(overrides: Partial<{ b2CMigrated: boolean }> = {}) {
  return {
    orgId: 1,
    orgName: 'Acme Hospice',
    slug: 'acme-hospice',
    b2CMigrated: overrides.b2CMigrated ?? false,
    b2CMigratedAt: null,
    totalUsers: 10,
    activeUsers: 7,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <B2cMigrationPage />
    </MemoryRouter>
  );
}

describe('B2cMigrationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user holds platform:admin so existing behaviour tests see an
    // enabled Send Invitations button. Permission-gating tests override.
    setPermissions(['platform:admin']);
  });

  it('renders heading + loads org cards', async () => {
    vi.mocked(listB2cOrganizations).mockResolvedValueOnce([
      buildOrg(),
      { ...buildOrg(), orgId: 2, orgName: 'Beta Health', slug: 'beta', b2CMigrated: true, b2CMigratedAt: '2026-05-01T00:00:00Z' },
    ]);
    renderPage();

    expect(screen.getByRole('heading', { name: /b2c migration/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Acme Hospice')).toBeInTheDocument();
      expect(screen.getByText('Beta Health')).toBeInTheDocument();
    });
    expect(screen.getByText(/b2c migrated/i)).toBeInTheDocument();
  });

  it('shows error when listB2cOrganizations rejects', async () => {
    vi.mocked(listB2cOrganizations).mockRejectedValueOnce(new Error('Unauthorized'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load organizations/i);
    });
  });

  it('disables Send Invitations button when org already migrated', async () => {
    vi.mocked(listB2cOrganizations).mockResolvedValueOnce([
      { ...buildOrg(), b2CMigrated: true },
    ]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send invitations/i })).toBeDisabled();
    });
  });

  it('calls migrateOrgToB2c and shows result on click', async () => {
    vi.mocked(listB2cOrganizations).mockResolvedValueOnce([buildOrg()]);
    vi.mocked(migrateOrgToB2c).mockResolvedValueOnce({ invited: 5, skipped: 2, failed: 0 });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByRole('button', { name: /send invitations/i }));
    await user.click(screen.getByRole('button', { name: /send invitations/i }));

    await waitFor(() => {
      expect(migrateOrgToB2c).toHaveBeenCalledWith(1);
      expect(screen.getByText(/5 invited.*2 skipped.*0 failed/i)).toBeInTheDocument();
    });
  });

  it('shows graph-API unreachable hint on 502 error', async () => {
    vi.mocked(listB2cOrganizations).mockResolvedValueOnce([buildOrg()]);
    vi.mocked(migrateOrgToB2c).mockRejectedValueOnce({ status: 502, message: 'Bad Gateway' });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByRole('button', { name: /send invitations/i }));
    await user.click(screen.getByRole('button', { name: /send invitations/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/graph api unreachable/i);
    });
  });

  describe('permission gating', () => {
    it('disables Send Invitations with a permission tooltip when the user lacks platform:admin', async () => {
      setPermissions([]); // no platform:admin
      vi.mocked(listB2cOrganizations).mockResolvedValueOnce([buildOrg()]);
      renderPage();

      const btn = await screen.findByRole('button', { name: /send invitations/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Send Invitations when the user has platform:admin', async () => {
      setPermissions(['platform:admin']);
      vi.mocked(listB2cOrganizations).mockResolvedValueOnce([buildOrg()]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send invitations/i })).toBeEnabled();
      });
    });
  });
});
