import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useModuleEnabled, useEnabledModules } from '@/permissions/useModule';
import { MODULES } from '@/permissions/modules';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

import { apiClient } from '@/api/client';

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

const me = (modules?: string[]) => ({
  data: {
    userId: 1,
    email: 'x@example.com',
    organizationId: 1,
    organizationName: 'X',
    roles: [],
    permissions: [],
    serverTime: new Date().toISOString(),
    modules,
  },
});

beforeEach(() => vi.clearAllMocks());

describe('useModuleEnabled', () => {
  it('fails open while /me is loading', () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useModuleEnabled(MODULES.HOSPICE), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it('fails open when the API predates the modules field (undefined)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(me(undefined));
    const { result } = renderHook(() => useModuleEnabled(MODULES.HOSPICE), { wrapper: makeWrapper() });
    await vi.waitFor(() => expect(result.current).toBe(true));
  });

  it('returns true when the org is entitled to the module', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(me([MODULES.HOSPICE, MODULES.BILLING]));
    const { result } = renderHook(() => useModuleEnabled(MODULES.HOSPICE), { wrapper: makeWrapper() });
    await vi.waitFor(() => expect(result.current).toBe(true));
  });

  it('returns false when the module is absent from a present list', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(me([MODULES.BILLING]));
    const { result } = renderHook(() => useModuleEnabled(MODULES.HOSPICE), { wrapper: makeWrapper() });
    await vi.waitFor(() => expect(result.current).toBe(false));
  });

  it('an explicitly-empty list disables every module', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(me([]));
    const { result } = renderHook(() => useModuleEnabled(MODULES.CLINICAL), { wrapper: makeWrapper() });
    await vi.waitFor(() => expect(result.current).toBe(false));
  });
});

describe('useEnabledModules', () => {
  it('returns the list when present', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(me([MODULES.HOME_HEALTH]));
    const { result } = renderHook(() => useEnabledModules(), { wrapper: makeWrapper() });
    await vi.waitFor(() => expect(result.current).toEqual([MODULES.HOME_HEALTH]));
  });

  it('returns null when unknown', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(me(undefined));
    const { result } = renderHook(() => useEnabledModules(), { wrapper: makeWrapper() });
    await vi.waitFor(() => expect(result.current).toBeNull());
  });
});
