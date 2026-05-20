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
  assignedTo: number | null;
  snoozeUntilUtc: string | null;
  createdAt: string;
}

export interface WorkQueueStats {
  total: number;
  pending: number;
  inProgress: number;
  critical: number;
  overdue: number;
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

export const getInbox = (mine: boolean = true): Promise<WorkQueueResponse> =>
  apiClient.get<WorkQueueResponse>('/billing/work-queue/inbox', { params: { mine } })
    .then((r) => r.data);

export const claimWorkItem = (id: number): Promise<void> =>
  apiClient.post(`/billing/work-queue/${id}/claim`).then(() => undefined);

export const completeWorkItem = (id: number): Promise<void> =>
  apiClient.post(`/billing/work-queue/${id}/complete`).then(() => undefined);

export const snoozeWorkItem = (id: number, untilUtc: string): Promise<void> =>
  apiClient.post(`/billing/work-queue/${id}/snooze`, { untilUtc }).then(() => undefined);

export const wakeWorkItem = (id: number): Promise<void> =>
  apiClient.post(`/billing/work-queue/${id}/wake`).then(() => undefined);

export type BulkAction = 'complete' | 'claim' | 'snooze' | 'assign';

export interface BulkActionFailure {
  id: number;
  error: string;
}

export interface BulkActionResult {
  succeeded: number[];
  failed: BulkActionFailure[];
}

export interface BulkActionOptions {
  snoozeUntilUtc?: string;
  assignToUserId?: number;
}

export const bulkWorkItem = (
  action: BulkAction,
  itemIds: number[],
  opts: BulkActionOptions = {},
): Promise<BulkActionResult> =>
  apiClient
    .post<BulkActionResult>('/billing/work-queue/bulk', {
      action,
      itemIds,
      snoozeUntilUtc: opts.snoozeUntilUtc,
      assignToUserId: opts.assignToUserId,
    })
    .then((r) => r.data);

export interface AssignableUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export const getAssignableUsers = (): Promise<AssignableUser[]> =>
  apiClient
    .get<{ data: AssignableUser[] }>('/billing/work-queue/assignable-users')
    .then((r) => r.data.data ?? []);

/** Assign a single work item to a specific user (team-lead reassign). */
export const assignWorkItem = (id: number, userId: number): Promise<void> =>
  apiClient
    .post(`/billing/work-queue/${id}/assign`, { userId })
    .then(() => undefined);

export interface WorkQueueItemEvent {
  id: number;
  workQueueItemId: number;
  eventType: 'created' | 'claimed' | 'assigned' | 'snoozed' | 'woken'
           | 'completed' | 'deferred' | 'priority-changed';
  actorUserId: number;
  actorEmail: string;
  description: string;
  occurredAtUtc: string;
}

export const getWorkItemEvents = (id: number): Promise<WorkQueueItemEvent[]> =>
  apiClient
    .get<{ data: WorkQueueItemEvent[] }>(`/billing/work-queue/${id}/events`)
    .then((r) => r.data.data ?? []);

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

// ─── Prior Authorization (X12 278) ───────────────────────────────────────

export type PriorAuthStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'expired'
  | 'cancelled';

export interface SubmitPriorAuthRequest {
  patientId: number;
  encounterId: number | null;
  payerId: string;
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  memberDob: string;
  providerNpi: string;
  providerOrganizationName: string;
  serviceTypeCode: string;
  fromDate: string;
  toDate: string;
  requestedUnits: number | null;
  diagnosisCodes: string[] | null;
  clearinghouse: string | null;
}

export interface UpdatePriorAuthDecisionRequest {
  status: PriorAuthStatus;
  authNumber: string | null;
  approvedUnits: number | null;
  authEffectiveDate: string | null;
  authExpirationDate: string | null;
  denialReason: string | null;
}

export interface PriorAuth {
  id: number;
  patientId: number;
  encounterId: number | null;
  payerId: string;
  payerName: string;
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  memberDob: string;
  providerNpi: string;
  providerOrganizationName: string;
  serviceTypeCode: string | null;
  fromDate: string | null;
  toDate: string | null;
  requestedUnits: number | null;
  diagnosisCodes: string[];
  status: PriorAuthStatus;
  referenceId: string | null;
  authNumber: string | null;
  approvedUnits: number | null;
  authEffectiveDate: string | null;
  authExpirationDate: string | null;
  denialReason: string | null;
  errorMessage: string | null;
  clearinghouse: string | null;
  submittedAtUtc: string | null;
  decidedAtUtc: string | null;
  submittedByEmail: string | null;
}

export const submitPriorAuth = (req: SubmitPriorAuthRequest): Promise<PriorAuth> =>
  apiClient.post<PriorAuth>('/billing/prior-auth/submit', req).then((r) => r.data);

export const listPriorAuths = (
  status?: PriorAuthStatus,
): Promise<{ data: PriorAuth[] }> =>
  apiClient
    .get<{ data: PriorAuth[] }>('/billing/prior-auth', {
      params: status ? { status } : undefined,
    })
    .then((r) => r.data);

export const getPriorAuth = (id: number): Promise<PriorAuth> =>
  apiClient.get<PriorAuth>(`/billing/prior-auth/${id}`).then((r) => r.data);

export const listExpiringPriorAuths = (
  days: number,
): Promise<{ data: PriorAuth[] }> =>
  apiClient
    .get<{ data: PriorAuth[] }>('/billing/prior-auth/expiring', { params: { days } })
    .then((r) => r.data);

export const recordPriorAuthDecision = (
  id: number, req: UpdatePriorAuthDecisionRequest,
): Promise<PriorAuth> =>
  apiClient.post<PriorAuth>(`/billing/prior-auth/${id}/decision`, req).then((r) => r.data);

// ─── Charge entry ─────────────────────────────────────────────────

export type ChargeStatus = 'pending' | 'reviewed' | 'billed' | 'voided';
export type ChargeType = 'per-diem' | 'visit' | 'procedure' | 'supply';

export interface ChargeRecord {
  id: number;
  patientId: number;
  admissionId: number | null;
  encounterId: number | null;
  chargeDate: string;
  chargeType: ChargeType;
  revenueCode: string | null;
  procedureCode: string | null;
  units: number;
  amount: number;
  totalAmount: number;
  status: ChargeStatus;
  claimId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChargeRequest {
  patientId: number;
  admissionId?: number | null;
  encounterId?: number | null;
  chargeDate: string;
  chargeType: ChargeType;
  revenueCode?: string | null;
  procedureCode?: string | null;
  units: number;
  amount: number;
  notes?: string | null;
}

export interface UpdateChargeRequest {
  chargeDate?: string;
  revenueCode?: string | null;
  procedureCode?: string | null;
  units?: number;
  amount?: number;
  notes?: string | null;
}

export interface PendingChargesSummary {
  patientId: number;
  chargeCount: number;
  totalAmount: number;
  earliestServiceDate: string | null;
  latestServiceDate: string | null;
}

export const listCharges = (params: {
  patientId?: number;
  encounterId?: number;
  status?: ChargeStatus;
  fromDate?: string;
  toDate?: string;
}): Promise<{ data: ChargeRecord[] }> =>
  apiClient
    .get<{ data: ChargeRecord[] }>('/billing/charges', { params })
    .then((r) => r.data);

export const createCharge = (req: CreateChargeRequest): Promise<{ data: ChargeRecord }> =>
  apiClient.post<{ data: ChargeRecord }>('/billing/charges', req).then((r) => r.data);

export const updateCharge = (
  id: number, req: UpdateChargeRequest,
): Promise<{ data: ChargeRecord }> =>
  apiClient.put<{ data: ChargeRecord }>(`/billing/charges/${id}`, req).then((r) => r.data);

export const markChargeReviewed = (id: number): Promise<void> =>
  apiClient.post(`/billing/charges/${id}/reviewed`).then(() => undefined);

export const voidCharge = (id: number): Promise<void> =>
  apiClient.post(`/billing/charges/${id}/void`).then(() => undefined);

export const getPendingChargesSummary = (
  patientId: number,
): Promise<{ data: PendingChargesSummary }> =>
  apiClient
    .get<{ data: PendingChargesSummary }>('/billing/charges/pending-summary', {
      params: { patientId },
    })
    .then((r) => r.data);

export const attachChargesToClaim = (
  chargeIds: number[], claimId: number,
): Promise<void> =>
  apiClient
    .post('/billing/charges/attach-to-claim', { chargeIds, claimId })
    .then(() => undefined);
