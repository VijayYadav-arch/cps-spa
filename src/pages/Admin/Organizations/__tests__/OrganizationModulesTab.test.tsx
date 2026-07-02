import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OrganizationModulesTab } from '@/pages/Admin/Organizations/OrganizationModulesTab';
import { MODULES } from '@/permissions';

vi.mock('@/pages/Admin/Organizations/orgsApi', () => ({
  orgsApi: { getModules: vi.fn(), setModules: vi.fn() },
}));
import { orgsApi } from '@/pages/Admin/Organizations/orgsApi';

vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue(
    { data: { permissions } } as unknown as ReturnType<typeof useUserRoles>,
  );
}

const ALL = [MODULES.HOSPICE, MODULES.HOME_HEALTH, MODULES.CLINICAL, MODULES.BILLING, MODULES.AI];

function renderTab() {
  return render(
    <MemoryRouter initialEntries={['/admin/organizations/5/modules']}>
      <Routes>
        <Route path="/admin/organizations/:id/modules" element={<OrganizationModulesTab />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setPermissions(['admin:system_config']);
});

describe('OrganizationModulesTab', () => {
  it('loads and reflects the org enabled set', async () => {
    vi.mocked(orgsApi.getModules).mockResolvedValueOnce({ enabled: [MODULES.HOSPICE], all: ALL });
    renderTab();

    await waitFor(() => expect(orgsApi.getModules).toHaveBeenCalledWith(5));
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Hospice' })).toBeChecked(),
    );
    expect(screen.getByRole('checkbox', { name: 'Home Health' })).not.toBeChecked();
  });

  it('saves the edited selection via setModules', async () => {
    vi.mocked(orgsApi.getModules).mockResolvedValueOnce({ enabled: [MODULES.HOSPICE], all: ALL });
    vi.mocked(orgsApi.setModules).mockResolvedValueOnce({
      enabled: [MODULES.HOSPICE, MODULES.BILLING],
      all: ALL,
    });
    const user = userEvent.setup();
    renderTab();

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Hospice' })).toBeChecked());
    await user.click(screen.getByRole('checkbox', { name: 'Billing' }));
    await user.click(screen.getByRole('button', { name: /save modules/i }));

    await waitFor(() =>
      expect(orgsApi.setModules).toHaveBeenCalledWith(5, [MODULES.HOSPICE, MODULES.BILLING]),
    );
    await waitFor(() => expect(screen.getByText(/saved\./i)).toBeInTheDocument());
  });

  it('disables Save without admin:system_config', async () => {
    setPermissions([]);
    vi.mocked(orgsApi.getModules).mockResolvedValueOnce({ enabled: ALL, all: ALL });
    renderTab();

    await waitFor(() => expect(screen.getByRole('button', { name: /save modules/i })).toBeDisabled());
  });
});
