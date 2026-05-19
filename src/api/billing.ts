import { apiClient } from './client';

export interface WorkQueueItem {
  id: number;
  type: string;
  description: string;
  priority: string;
  status: string;
  claimId: number | null;
  patientId: number | null;
  dueDate: string | null;
  createdAt: string;
}

export interface WorkQueueStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export interface WorkQueueResponse {
  data: WorkQueueItem[];
  stats: WorkQueueStats;
}

export interface DenialItem {
  id: number;
  organizationId: number;
  status: string;
  denialCode: string;
  payerName: string;
  denialDate: string;
  resolvedAt: string | null;
  assignedTo: number | null;
  appealHistory: string | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
}

export const getWorkQueue = (params?: { status?: string; type?: string; }): Promise<WorkQueueResponse> =>
  apiClient.get<WorkQueueResponse>('/billing/work-queue', { params }).then((r) => r.data);

export const getWorkQueueStats = (): Promise<WorkQueueStats> =>
  apiClient.get<WorkQueueStats>('/billing/work-queue/stats').then((r) => r.data);

export const getDenials = (params?: { status?: string; page?: number; pageSize?: number; }): Promise<{ data: DenialItem[]; pagination: PaginationMeta }> =>
  apiClient.get<{ data: DenialItem[]; pagination: PaginationMeta }>('/billing/denials', { params }).then((r) => r.data);

// ─── Denial Queue (Billing PR 1 frontend) ────────────────────────────────

export type DenialAgingBucket = '0-7' | '8-30' | '31-60' | '61+';

export interface DenialQueueItem {
  id: number;
  claimId: number;
  claimNumber: string;
  denialCode: string;
  denialReason: string;
  category: string;
  status: string;
  payerName: string;
  appealDeadline: string | null;
  assignedTo: number | null;
  claimAmount: number;
  createdAt: string;
  daysOutstanding: number;
  agingBucket: DenialAgingBucket;
}

export interface DenialQueueResponse {
  asOfUtc: string;
  totalOpen: number;
  bucket0To7: number;
  bucket8To30: number;
  bucket31To60: number;
  bucket61Plus: number;
  totalAmountAtRisk: number;
  items: DenialQueueItem[];
}

export interface DenialSummaryResponse {
  totalOpen: number;
  new: number;
  inReview: number;
  appealing: number;
  correcting: number;
  resolved: number;
  writtenOff: number;
  overdueAppealDeadline: number;
}

export interface AppealLetterDraft {
  denialWorkItemId: number;
  claimNumber: string;
  payerName: string;
  subjectLine: string;
  body: string;
}

export const getDenialQueue = (): Promise<DenialQueueResponse> =>
  apiClient.get<DenialQueueResponse>('/billing/denials/queue').then((r) => r.data);

export const getDenialSummary = (): Promise<DenialSummaryResponse> =>
  apiClient.get<DenialSummaryResponse>('/billing/denials/summary').then((r) => r.data);

export const getAppealLetterDraft = (denialId: number): Promise<AppealLetterDraft> =>
  apiClient.get<AppealLetterDraft>(`/billing/denials/${denialId}/appeal-letter`).then((r) => r.data);

export const startDenialAppeal = (
  denialId: number, notes: string | null,
): Promise<{ data: unknown }> =>
  apiClient.put<{ data: unknown }>(`/billing/denials/${denialId}/appeal`, { notes }).then((r) => r.data);

export const submitDenialAppeal = (
  denialId: number, notes: string | null,
): Promise<{ data: unknown }> =>
  apiClient.put<{ data: unknown }>(`/billing/denials/${denialId}/submit-appeal`, { notes }).then((r) => r.data);

export const resolveDenial = (
  denialId: number, resolution: string,
): Promise<{ data: unknown }> =>
  apiClient.put<{ data: unknown }>(`/billing/denials/${denialId}/resolve`, { resolution }).then((r) => r.data);

export const assignDenial = (
  denialId: number, userId: number,
): Promise<{ data: unknown }> =>
  apiClient.put<{ data: unknown }>(`/billing/denials/${denialId}/assign`, { userId }).then((r) => r.data);

// ─── AR Dashboard ────────────────────────────────────────────────────────

export interface ArActionQueueItem {
  claimId: number;
  claimNumber: string;
  patientName: string;
  payer: string;
  amount: number;
  daysAged: number;
  nextFollowUpDate: string;
  daysUntilFollowUp: number;
  lastContactedAt: string | null;
}

export interface ArByPayerBucket {
  payer: string;
  claimCount: number;
  totalAmount: number;
  bucket0To30Count: number;
  bucket31To60Count: number;
  bucket61To90Count: number;
  over90Count: number;
  over90Amount: number;
}

export interface ArDashboardSummary {
  asOfUtc: string;
  totalFollowUpClaims: number;
  totalAmount: number;
  amountOver90Days: number;
  actionsDueToday: number;
  actionsOverdue: number;
  actionQueue: ArActionQueueItem[];
  byPayer: ArByPayerBucket[];
}

export const getArDashboard = (): Promise<ArDashboardSummary> =>
  apiClient.get<ArDashboardSummary>('/billing/ar-followup/dashboard').then((r) => r.data);

export interface LogArCallRequest {
  contactName: string;
  outcome: string;
  note: string;
  nextFollowUpDate?: string | null;
}

export const logArCall = (
  claimId: number, req: LogArCallRequest,
): Promise<{ data: unknown }> =>
  apiClient
    .post<{ data: unknown }>(`/billing/ar-followup/claims/${claimId}/notes`, req)
    .then((r) => r.data);

// ─── Secondary payer COB submission ──────────────────────────────────────

export interface SecondaryEligibleClaim {
  claimId: number;
  claimNumber: string;
  patientName: string;
  primaryPayer: string;
  secondaryPayer: string;
  chargeAmount: number;
  primaryPaidAmount: number;
  balanceForSecondary: number;
  serviceDate: string;
}

export interface Secondary837Result {
  submissionId: number;
  edi837: string;
  controlNumber: string;
  primaryPaidAmount: number;
  secondaryClaimAmount: number;
  warnings: string[];
}

export const listEligibleSecondary = (): Promise<{ data: SecondaryEligibleClaim[] }> =>
  apiClient
    .get<{ data: SecondaryEligibleClaim[] }>('/billing/secondary-claims/eligible')
    .then((r) => r.data);

export const buildSecondary837 = (
  claimId: number, clearinghouse: string,
): Promise<Secondary837Result> =>
  apiClient
    .post<Secondary837Result>(`/billing/secondary-claims/${claimId}/build`, { clearinghouse })
    .then((r) => r.data);

// ─── Patient statement workflow ──────────────────────────────────────────

export type StatementRunStatus =
  | 'draft'
  | 'sent'
  | 'paid'
  | 'partial-pay'
  | 'written-off';

export interface StatementLineSnapshot {
  claimId: number | null;
  claimNumber: string | null;
  serviceDate: string;
  description: string;
  chargeAmount: number;
  paidAmount: number;
  adjustmentAmount: number;
  patientBalance: number;
}

export interface StatementRun {
  id: number;
  patientId: number;
  patientName: string;
  status: StatementRunStatus;
  dunningCycle: number;
  statementDate: string;
  dueDate: string;
  totalCharges: number;
  totalPayments: number;
  totalAdjustments: number;
  patientBalance: number;
  amountPaid: number;
  sentAt: string | null;
  paidAt: string | null;
  previousRunId: number | null;
  lineItems: StatementLineSnapshot[];
}

export interface DunningQueueEntry {
  runId: number;
  patientId: number;
  patientName: string;
  currentCycle: number;
  nextCycle: number;
  sentAt: string;
  daysSinceSent: number;
  patientBalance: number;
}

export interface DunningQueueResponse {
  asOfUtc: string;
  cycle2Eligible: number;
  cycle3Eligible: number;
  entries: DunningQueueEntry[];
}

export const listStatementRuns = (
  status?: StatementRunStatus,
): Promise<{ data: StatementRun[] }> =>
  apiClient
    .get<{ data: StatementRun[] }>('/billing/statements/runs', {
      params: status ? { status } : undefined,
    })
    .then((r) => r.data);

export const getStatementRun = (id: number): Promise<StatementRun> =>
  apiClient.get<StatementRun>(`/billing/statements/runs/${id}`).then((r) => r.data);

export const generateStatementRun = (patientId: number): Promise<StatementRun> =>
  apiClient
    .post<StatementRun>('/billing/statements/runs/generate', { patientId })
    .then((r) => r.data);

export const markStatementSent = (id: number): Promise<StatementRun> =>
  apiClient
    .post<StatementRun>(`/billing/statements/runs/${id}/mark-sent`, {})
    .then((r) => r.data);

export const recordStatementPayment = (
  id: number, amount: number,
): Promise<StatementRun> =>
  apiClient
    .post<StatementRun>(`/billing/statements/runs/${id}/record-payment`, { amount })
    .then((r) => r.data);

export const writeOffStatement = (id: number): Promise<StatementRun> =>
  apiClient
    .post<StatementRun>(`/billing/statements/runs/${id}/write-off`, {})
    .then((r) => r.data);

export const escalateStatement = (id: number): Promise<StatementRun> =>
  apiClient
    .post<StatementRun>(`/billing/statements/runs/${id}/escalate`, {})
    .then((r) => r.data);

export const getStatementDunningQueue = (): Promise<DunningQueueResponse> =>
  apiClient
    .get<DunningQueueResponse>('/billing/statements/runs/dunning-queue')
    .then((r) => r.data);

// ─── Eligibility (270/271) verification ──────────────────────────────────

export interface VerifyEligibilityRequest {
  patientId: number | null;
  payerId: string;
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  memberDob: string;
  providerNpi: string | null;
  serviceTypeCode: string | null;
  clearinghouse: string | null;
}

export interface EligibilityCheck {
  id: number;
  patientId: number | null;
  payerId: string;
  payerName: string;
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  memberDob: string;
  clearinghouse: string;
  eligible: boolean | null;
  planName: string | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  errorMessage: string | null;
  checkedAtUtc: string;
  checkedByEmail: string;
}

export const verifyEligibility = (
  req: VerifyEligibilityRequest,
): Promise<EligibilityCheck> =>
  apiClient.post<EligibilityCheck>('/billing/eligibility/verify', req).then((r) => r.data);

export const getEligibilityCheck = (id: number): Promise<EligibilityCheck> =>
  apiClient.get<EligibilityCheck>(`/billing/eligibility/${id}`).then((r) => r.data);

export const listEligibilityForPatient = (
  patientId: number,
): Promise<{ data: EligibilityCheck[] }> =>
  apiClient
    .get<{ data: EligibilityCheck[] }>(`/billing/eligibility/by-patient/${patientId}`)
    .then((r) => r.data);

export const listRecentEligibility = (
  limit = 50,
): Promise<{ data: EligibilityCheck[] }> =>
  apiClient
    .get<{ data: EligibilityCheck[] }>('/billing/eligibility/recent', { params: { limit } })
    .then((r) => r.data);
