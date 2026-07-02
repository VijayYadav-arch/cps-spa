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
 * Phase B + C nested-tab cross-org-admin fetches (cps-dotnet PR #193 + #195):
 *   GET /api/v2/claims?organizationId={n}
 *   GET /api/v2/patients?organizationId={n}
 *   GET /api/v2/encounters?organizationId={n}   (admin-list branch — no patientId)
 *   GET /api/v2/documents?organizationId={n}
 *   GET /api/v2/reports?organizationId={n}
 *
 * The shared apiClient (@/api/client) sets baseURL=/api/v2.
 */
import { apiClient } from '@/api/client';
import type {
  CreateOrgRequest,
  DocumentSummary,
  OrgListResponse,
  OrgModulesResponse,
  OrganizationDetail,
  PaginationMeta,
  ReportSummary,
  UpdateOrgRequest,
} from './orgsTypes';
import type { ClaimSummary, PagedResponse } from '@/api/claims';
import type { PatientSummary } from '@/api/patients';
import type { EncountersListResponse } from '@/pages/Admin/Encounters/encountersTypes';

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
   * Per-org module entitlements (platform-admin only). Hits
   *   GET/PUT /api/v2/admin/organizations/{orgId}/modules
   * (cps-dotnet OrganizationModulesController, admin:system_config). GET returns
   * the enabled set + full catalog; PUT sets the exact allowlist.
   */
  getModules: (orgId: number): Promise<OrgModulesResponse> =>
    apiClient
      .get<{ data: OrgModulesResponse }>(`/admin/organizations/${orgId}/modules`)
      .then((r) => r.data.data),
  setModules: (orgId: number, modules: string[]): Promise<OrgModulesResponse> =>
    apiClient
      .put<{ data: OrgModulesResponse }>(`/admin/organizations/${orgId}/modules`, { modules })
      .then((r) => r.data.data),
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

  /**
   * Cross-org-admin fetch of an organization's patients. Hits
   *   GET /api/v2/patients?organizationId={orgId}&page=&pageSize=
   * shipped in cps-dotnet PR #195. Response shape: { data: PatientResponseDto[],
   * pagination }. PHI masking still applies for cross-org admins (DateOfBirth
   * truncated to Jan 1, MedicareId/MedicaidId always masked).
   *
   * Note: the cps-dotnet PatientsController.GetAll signature is currently
   * just (organizationId, page, pageSize). No status / search filter exists
   * server-side — the OrganizationPatientsTab is a plain paginated list.
   */
  getPatients: (
    orgId: number,
    params: { page?: number; pageSize?: number } = {},
  ): Promise<{ data: PatientSummary[]; pagination: PaginationMeta }> =>
    apiClient
      .get<{ data: PatientSummary[]; pagination: PaginationMeta }>('/patients', {
        params: { ...params, organizationId: orgId },
      })
      .then((r) => r.data),

  /**
   * Cross-org-admin fetch of an organization's encounters. Hits the admin-list
   * branch (no patientId param) which returns the enriched EncounterListDto
   * shape with patient + organization names + correlated ClaimsCount.
   */
  getEncounters: (
    orgId: number,
    params: { page?: number; pageSize?: number; q?: string; includeDeleted?: boolean } = {},
  ): Promise<EncountersListResponse> =>
    apiClient
      .get<EncountersListResponse>('/encounters', {
        params: { ...params, organizationId: orgId },
      })
      .then((r) => r.data),

  /**
   * Cross-org-admin fetch of an organization's documents. Hits
   *   GET /api/v2/documents?organizationId={orgId}&page=&pageSize=
   * which returns the Document entity passthrough (no DTO projection).
   */
  getDocuments: (
    orgId: number,
    params: { page?: number; pageSize?: number } = {},
  ): Promise<{ data: DocumentSummary[]; pagination: PaginationMeta }> =>
    apiClient
      .get<{ data: DocumentSummary[]; pagination: PaginationMeta }>('/documents', {
        params: { ...params, organizationId: orgId },
      })
      .then((r) => r.data),

  /**
   * Cross-org-admin fetch of an organization's reports. Only the list endpoint
   * accepts the cross-org override — the aggregate endpoints (claims-summary,
   * aging, denials) intentionally stay tenant-scoped.
   *
   * Note: cps-dotnet ReportsController.GetAll currently only accepts
   * (organizationId, page, pageSize). No type filter exists server-side — the
   * OrganizationReportsTab filters by type client-side over the page window.
   */
  getReports: (
    orgId: number,
    params: { page?: number; pageSize?: number } = {},
  ): Promise<{ data: ReportSummary[]; pagination: PaginationMeta }> =>
    apiClient
      .get<{ data: ReportSummary[]; pagination: PaginationMeta }>('/reports', {
        params: { ...params, organizationId: orgId },
      })
      .then((r) => r.data),
};
