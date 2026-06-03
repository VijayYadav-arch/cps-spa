/**
 * API client for the /admin/organizations/* admin pages.
 *
 * Wraps the cps-dotnet PR #188 endpoints:
 *   GET    /api/v2/organizations         (paginated list with q + includeDeleted)
 *   GET    /api/v2/organizations/{id}    (detail)
 *   POST   /api/v2/organizations         (create)
 *   PUT    /api/v2/organizations/{id}    (update; 409 on soft-deleted)
 *   DELETE /api/v2/organizations/{id}    (soft-delete; idempotent)
 *   POST   /api/v2/organizations/{id}/restore (restore; idempotent)
 *
 * The shared apiClient (@/api/client) sets baseURL=/api/v2.
 */
import { apiClient } from '@/api/client';
import type {
  CreateOrgRequest,
  OrgListResponse,
  OrganizationDetail,
  UpdateOrgRequest,
} from './orgsTypes';
import type { ClaimSummary, PagedResponse } from '@/api/claims';

const BASE = '/organizations';

export const orgsApi = {
  list: (params: { q?: string; includeDeleted?: boolean; page?: number; pageSize?: number }) =>
    apiClient.get<OrgListResponse>(BASE, { params }).then((r) => r.data),
  getById: (id: number) =>
    apiClient.get<OrganizationDetail>(`${BASE}/${id}`).then((r) => r.data),
  create: (req: CreateOrgRequest) =>
    apiClient.post<OrganizationDetail>(BASE, req).then((r) => r.data),
  update: (id: number, req: UpdateOrgRequest) =>
    apiClient.put<OrganizationDetail>(`${BASE}/${id}`, req).then((r) => r.data),
  softDelete: (id: number) =>
    apiClient.delete(`${BASE}/${id}`).then(() => undefined),
  restore: (id: number) =>
    apiClient.post(`${BASE}/${id}/restore`).then(() => undefined),
  /**
   * Cross-org-admin fetch of an organization's claims. Hits
   *   GET /api/v2/claims?organizationId={orgId}&status=&page=&pageSize=
   * which the cps-dotnet ClaimsController.GetAll endpoint exposes for callers
   * holding admin:manage_orgs (returns 403 for non-admin attempts to view
   * another org). The normal tenant-scoped path is unchanged.
   */
  getClaims: (
    orgId: number,
    params: { status?: string; page?: number; pageSize?: number } = {},
  ): Promise<PagedResponse<ClaimSummary>> =>
    apiClient
      .get<PagedResponse<ClaimSummary>>('/claims', {
        params: { ...params, organizationId: orgId },
      })
      .then((r) => r.data),
};
