import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAnyPermission } from '@/permissions/useAnyPermission';
import { PERMISSIONS } from '@/permissions/permissions';

// Mock the /me query seam so useAnyPermission resolves synchronously without a
// QueryClientProvider. Real useAnyPermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setData(data: unknown) {
  vi.mocked(useUserRoles).mockReturnValue({ data } as unknown as ReturnType<typeof useUserRoles>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAnyPermission', () => {
  it('returns true when the user has at least one of the listed permissions', () => {
    setData({ permissions: [PERMISSIONS.PLATFORM_API_KEYS] });
    expect(useAnyPermission([PERMISSIONS.ORG_API_KEYS, PERMISSIONS.PLATFORM_API_KEYS])).toBe(true);
  });

  it('returns false when the user has none of the listed permissions', () => {
    setData({ permissions: ['claims:view'] });
    expect(useAnyPermission([PERMISSIONS.ORG_API_KEYS, PERMISSIONS.PLATFORM_API_KEYS])).toBe(false);
  });

  it('returns false when the /me query has no data', () => {
    setData(undefined);
    expect(useAnyPermission([PERMISSIONS.ORG_API_KEYS, PERMISSIONS.PLATFORM_API_KEYS])).toBe(false);
  });

  it('returns false for an empty required array', () => {
    setData({ permissions: [PERMISSIONS.ORG_API_KEYS] });
    expect(useAnyPermission([])).toBe(false);
  });
});
