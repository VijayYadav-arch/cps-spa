import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from '@/api/client';

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePermission', () => {
  it('returns false while /me is loading', () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => usePermission(PERMISSIONS.CLAIMS_VIEW), {
      wrapper: makeWrapper(),
    });
    expect(result.current).toBe(false);
  });

  it('returns true when user has the required permission', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        userId: 1,
        email: 'x@example.com',
        organizationId: 1,
        organizationName: 'X',
        roles: [],
        permissions: ['claims:view'],
        serverTime: new Date().toISOString(),
      },
    });
    const { result } = renderHook(() => usePermission(PERMISSIONS.CLAIMS_VIEW), {
      wrapper: makeWrapper(),
    });
    await vi.waitFor(() => expect(result.current).toBe(true));
  });

  it('returns false when user lacks the required permission', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        userId: 1,
        email: 'x@example.com',
        organizationId: 1,
        organizationName: 'X',
        roles: [],
        permissions: ['admin:manage_users'],
        serverTime: new Date().toISOString(),
      },
    });
    const { result } = renderHook(() => usePermission(PERMISSIONS.CLAIMS_VIEW), {
      wrapper: makeWrapper(),
    });
    await vi.waitFor(() => expect(result.current).toBe(false));
  });

  it('returns true only when user has ALL of multiple required permissions', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        userId: 1,
        email: 'x@example.com',
        organizationId: 1,
        organizationName: 'X',
        roles: [],
        permissions: ['claims:view', 'claims:submit'],
        serverTime: new Date().toISOString(),
      },
    });
    const { result } = renderHook(
      () => usePermission([PERMISSIONS.CLAIMS_VIEW, PERMISSIONS.CLAIMS_SUBMIT]),
      { wrapper: makeWrapper() }
    );
    await vi.waitFor(() => expect(result.current).toBe(true));
  });
});
