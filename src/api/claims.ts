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
    .delete<void>(`/claims/${claimId}/service-lines/${lineId}`)
    .then(() => undefined);

// ─── Lifecycle dashboard ──────────────────────────────────────────

export interface ClaimLifecycleHeader {
  id: number;
  claimNumber: string;
  status: string;
  patientName: string;
  patientId: number | null;
  payer: string;
  serviceDate: string;
  submittedDate: string | null;
  amount: number;
  paidAmount: number | null;
}

export interface ClaimLifecycleSubmission {
  id: number;
  clearinghouse: string;
  status: string;
  trackingId: string | null;
  clearinghouseTrackingId: string | null;
  submittedAt: string | null;
  lastStatusCheckedAt: string | null;
  ackStatus: string | null;
  hasEdi837: boolean;
  hasEdi835: boolean;
  payerOrder: string;
}

export interface ClaimLifecycleEraPosting {
  id: number;
  claimSubmissionId: number | null;
  payerName: string;
  checkNumber: string | null;
  checkDate: string | null;
  paymentAmount: number;
  paymentMethod: string | null;
  totalClaims: number;
  matchedClaims: number;
  unmatchedClaims: number;
  postedAt: string;
}

export interface ClaimLifecycleServiceLine {
  id: number;
  lineNumber: number;
  procedureCode: string;
  modifier1: string | null;
  serviceDateFrom: string;
  serviceDateTo: string | null;
  charges: number;
}

export interface ClaimLifecycleEvent {
  atUtc: string;
  eventType: 'created' | 'submitted' | 'status-checked' | 'ack' | 'era-posted';
  description: string;
}

export interface ClaimLifecycle {
  header: ClaimLifecycleHeader;
  submissions: ClaimLifecycleSubmission[];
  eraPostings: ClaimLifecycleEraPosting[];
  serviceLines: ClaimLifecycleServiceLine[];
  events: ClaimLifecycleEvent[];
}

export const getClaimLifecycle = (id: number): Promise<ClaimLifecycle> =>
  apiClient
    .get<{ data: ClaimLifecycle }>(`/claims/${id}/lifecycle`)
    .then((r) => r.data.data);

/**
 * Download the CMS-1500 / UB-04 preview PDF for a claim. ClaimType on the
 * server decides the layout; the response is application/pdf bytes.
 */
export const downloadClaimPdf = async (claimId: number): Promise<Blob> => {
  const res = await apiClient.get<Blob>(`/billing/claims/${claimId}/print`, {
    responseType: 'blob',
  });
  return res.data;
};

// ─── Batch ops (POST /api/v2/billing/batch/*) ────────────────────────

export interface BatchSubmitResult {
  succeeded: number[];
  failed: number[];
}

export interface BatchVoidResult {
  voided: number[];
  notFound: number[];
}

export const batchSubmitClaims = (claimIds: number[]): Promise<BatchSubmitResult> =>
  apiClient
    .post<BatchSubmitResult>('/billing/batch/submit', { claimIds })
    .then((r) => r.data);

export const batchVoidClaims = (claimIds: number[]): Promise<BatchVoidResult> =>
  apiClient
    .post<BatchVoidResult>('/billing/batch/void', { claimIds })
    .then((r) => r.data);

// ─── Scrub a saved claim by id ───────────────────────────────────────

export interface ScrubFinding {
  rule: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ScrubResult {
  passed: boolean;
  findings: ScrubFinding[];
}

export const scrubClaimById = (id: number): Promise<ScrubResult> =>
  apiClient
    .post<{ data: ScrubResult }>(`/billing/claims/${id}/scrub`)
    .then((r) => r.data.data);

// ─── Billing code lookup (CPT / ICD / HCPCS / revenue) ───────────────

export interface BillingCodeEntry {
  code: string;
  description: string;
  type: string;
  category: string;
}

export const searchBillingCodes = (params: {
  query?: string; type?: string; category?: string;
} = {}): Promise<{ data: BillingCodeEntry[]; count: number }> =>
  apiClient
    .get<{ data: BillingCodeEntry[]; count: number }>('/billing/codes', { params })
    .then((r) => r.data);
