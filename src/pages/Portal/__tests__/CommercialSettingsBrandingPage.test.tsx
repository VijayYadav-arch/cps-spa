import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { CommercialSettingsBrandingPage } from '@/pages/Portal/CommercialSettingsBrandingPage';

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
  // Default: user holds portal:branding so behaviour tests see an enabled
  // Save button. Permission-gating tests override.
  setPermissions(['portal:branding']);
  // /users/me → org 1, then /branding/1 → no branding configured (defaults).
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    if (url === '/users/me') {
      return Promise.resolve({ data: { data: { organizationId: 1 } } });
    }
    return Promise.resolve({ data: { data: { message: 'No branding configured' } } });
  });
});

describe('CommercialSettingsBrandingPage — permission gating', () => {
  it('disables Save Branding with a permission tooltip when the user lacks portal:branding', async () => {
    setPermissions([]); // no portal:branding

    render(<CommercialSettingsBrandingPage />);
    await screen.findByTestId('page-title');

    const btn = screen.getByTestId('submit-branding');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });

  it('enables Save Branding when the user has portal:branding', async () => {
    setPermissions(['portal:branding']);

    render(<CommercialSettingsBrandingPage />);
    await screen.findByTestId('page-title');

    await waitFor(() => {
      expect(screen.getByTestId('submit-branding')).toBeEnabled();
    });
  });
});
