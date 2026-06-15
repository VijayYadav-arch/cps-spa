import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommercialApiKeysPage } from '@/pages/Portal/CommercialApiKeysPage';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));
import { apiClient } from '@/api/client';

// Mock the /me query seam so useAnyPermission resolves synchronously without a
// QueryClientProvider. Real useAnyPermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue(
    { data: { permissions } } as unknown as ReturnType<typeof useUserRoles>,
  );
}

const activeKey = {
  id: 1,
  prefix: 'cps_live_abc',
  name: 'Partner X',
  scope: 'read',
  lastUsedAt: null,
  createdAt: '2026-06-01T00:00:00Z',
  isActive: true,
  expiresAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user holds ONE of the two api-key permissions so the existing
  // behaviour renders enabled buttons. Gating tests override.
  setPermissions(['org:api_keys']);
  vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [activeKey] } });
});

describe('CommercialApiKeysPage — permission gating', () => {
  it('disables Create + Revoke with a tooltip when the user has NEITHER api-key permission', async () => {
    setPermissions(['claims:view']); // neither org:api_keys nor platform:api_keys
    render(<CommercialApiKeysPage />);

    const create = await screen.findByTestId('action-create-key');
    expect(create).toBeDisabled();
    expect(create).toHaveAttribute('title', expect.stringMatching(/permission/i));

    const revoke = screen.getByTestId('action-revoke-key');
    expect(revoke).toBeDisabled();
    expect(revoke).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });

  it('enables Create + Revoke when the user has org:api_keys', async () => {
    setPermissions(['org:api_keys']);
    render(<CommercialApiKeysPage />);

    expect(await screen.findByTestId('action-create-key')).toBeEnabled();
    expect(screen.getByTestId('action-revoke-key')).toBeEnabled();
  });

  it('enables Create + Revoke when the user has platform:api_keys', async () => {
    setPermissions(['platform:api_keys']);
    render(<CommercialApiKeysPage />);

    expect(await screen.findByTestId('action-create-key')).toBeEnabled();
    expect(screen.getByTestId('action-revoke-key')).toBeEnabled();
  });
});
