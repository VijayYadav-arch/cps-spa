import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { CommercialSettingsSSOPage } from '@/pages/Portal/CommercialSettingsSSOPage';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
}));
import { apiClient } from '@/api/client';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue(
    { data: { permissions } } as unknown as ReturnType<typeof useUserRoles>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user holds platform:sso so behaviour tests see an enabled Save
  // button. Permission-gating tests override.
  setPermissions(['platform:sso']);
  // /users/me → org 1, then /auth/sso/config/1 → 404 (defaults).
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    if (url === '/users/me') {
      return Promise.resolve({ data: { data: { organizationId: 1 } } });
    }
    return Promise.reject(new Error('404'));
  });
});

describe('CommercialSettingsSSOPage — permission gating', () => {
  it('disables Save Configuration with a permission tooltip when the user lacks platform:sso', async () => {
    setPermissions([]); // no platform:sso

    render(<CommercialSettingsSSOPage />);
    await screen.findByTestId('page-title');

    const btn = screen.getByTestId('submit-sso');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });

  it('enables Save Configuration when the user has platform:sso', async () => {
    setPermissions(['platform:sso']);

    render(<CommercialSettingsSSOPage />);
    await screen.findByTestId('page-title');

    await waitFor(() => {
      expect(screen.getByTestId('submit-sso')).toBeEnabled();
    });
  });
});
