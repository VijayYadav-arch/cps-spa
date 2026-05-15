import { apiClient } from './client';

export interface ClaimSummary {
  id: number;
  patientName: string;
  status: string;
  amount: number;
  submittedDate: string | null;
  organizationId: number;
  createdAt: string;
}

export interface ServiceLine {
  id: number;
  claimId: number;
  procedureCode: string;
  diagnosisCode: string | null;
  units: number;
  chargeAmount: number;
}

export interface ClaimDetail extends ClaimSummary {
  paidAmount: number | null;
  denialReason: string | null;
  updatedAt: string | null;
  serviceLines: ServiceLine[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PagedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// GET /api/v2/claims?status=&page=&pageSize=
export const getClaims = (params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedResponse<ClaimSummary>> =>
  apiClient
    .get<PagedResponse<ClaimSummary>>('/claims', { params })
    .then((r) => r.data);

// GET /api/v2/claims/{id}
export const getClaim = (id: number): Promise<ClaimDetail> =>
  apiClient
    .get<{ data: ClaimDetail }>(`/claims/${id}`)
    .then((r) => r.data.data);

// PUT /api/v2/claims/{id}/status
export const submitClaim = (id: number): Promise<ClaimDetail> =>
  apiClient
    .put<{ data: ClaimDetail }>(`/claims/${id}/status`, { status: 'submitted' })
    .then((r) => r.data.data);

// DELETE /api/v2/claims/{id}/service-lines/{lineId}
export const deleteServiceLine = (claimId: number, lineId: number): Promise<void> =>
  apiClient
    .delete(`/claims/${claimId}/service-lines/${lineId}`)
    .then(() => undefined);
