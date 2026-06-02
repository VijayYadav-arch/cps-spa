import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { MeResponse } from './types';

/**
 * Fetches the current user's identity + roles + permissions from /api/v2/me.
 * Cached in TanStack Query with 5-min stale time + tab-focus refetch.
 *
 * Note: apiClient.baseURL is already '/api/v2', so the request path is '/me'.
 */
export function useUserRoles() {
  return useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => apiClient.get<MeResponse>('/me').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
