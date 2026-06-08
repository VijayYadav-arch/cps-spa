import { apiClient } from './client';
import { consumeAiStream, type AiStreamErrorEvent } from '@/api/aiStream';
import { staffAuthHeaders } from '@/api/staffAuthHeaders';

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

/**
 * Matches DenialWorkItem entity returned by GET /billing/denials.
 * payerName is not on the entity (denials are looked up via claim relation)
 * — backend includes it via projection; UI may receive it as empty string.
 */
export interface DenialItem {
  id: number;
  claimId: number;
  organizationId: number;
  status: string;
  denialCode: string;
  denialReason: string;
  category: string;
  payerName?: string;
  appealDeadline: string | null;
  resolvedAt: string | null;
  assignedTo: number | null;
  appealHistory: string | null;
  draftAppealText: string | null;
  draftAppealGeneratedAtUtc: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DenialAppealDraftResult {
  id: number;
  draftAppealText: string;
  draftAppealGeneratedAtUtc: string;
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

// ─── Saved inbox filters ─────────────────────────────────────────────

export interface InboxSavedFilter {
  id: number;
  userId: number;
  organizationId: number;
  name: string;
  filterJson: string;
  createdAt: string;
  updatedAt: string;
}

/** Client-defined filter spec stored as JSON. Free to evolve. */
export interface InboxFilterSpec {
  tab?: 'mine' | 'all';
  priority?: ('critical' | 'high' | 'medium' | 'low')[];
  type?: string[];
  overdueOnly?: boolean;
}

export const getSavedFilters = (): Promise<InboxSavedFilter[]> =>
  apiClient
    .get<{ data: InboxSavedFilter[] }>('/billing/inbox/saved-filters')
    .then((r) => r.data.data ?? []);

export const createSavedFilter = (
  name: string, spec: InboxFilterSpec,
): Promise<InboxSavedFilter> =>
  apiClient
    .post<{ data: InboxSavedFilter }>('/billing/inbox/saved-filters',
      { name, filterJson: JSON.stringify(spec) })
    .then((r) => r.data.data);

export const deleteSavedFilter = (id: number): Promise<void> =>
  apiClient
    .delete(`/billing/inbox/saved-filters/${id}`)
    .then(() => undefined);

export interface EnqueueWorkItemRequest {
  type: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  claimId?: number | null;
  patientId?: number | null;
  dueDate?: string | null;
}

export const enqueueWorkItem = (req: EnqueueWorkItemRequest): Promise<WorkQueueItem> =>
  apiClient
    .post<{ data: WorkQueueItem } | WorkQueueItem>('/billing/work-queue', req)
    .then((r) => {
      // Backend returns CreatedAtAction with the item directly in some shapes
      // and {data:item} in others — handle both.
      const body = r.data as { data?: WorkQueueItem } & WorkQueueItem;
      return body.data ?? (r.data as WorkQueueItem);
    });

export interface WorkItemTiming {
  itemId: number;
  createdAtUtc: string;
  firstClaimedAtUtc: string | null;
  completedAtUtc: string | null;
  /** TimeSpan serialized as "d.hh:mm:ss" by .NET, or null. */
  timeToClaim: string | null;
  timeToComplete: string | null;
}

export const getWorkItemTiming = (id: number): Promise<WorkItemTiming> =>
  apiClient
    .get<{ data: WorkItemTiming }>(`/billing/work-queue/${id}/timing`)
    .then((r) => r.data.data);

export interface InboxAggregateTiming {
  from: string;
  to: string;
  completedCount: number;
  averageTimeToClaim: string | null;
  averageTimeToComplete: string | null;
}

export const getInboxAggregateTiming = (
  from?: string, to?: string,
): Promise<InboxAggregateTiming> =>
  apiClient
    .get<{ data: InboxAggregateTiming }>('/billing/work-queue/timing/aggregate',
      { params: { from, to } })
    .then((r) => r.data.data);

/**
 * Format a .NET TimeSpan ("d.hh:mm:ss" or "hh:mm:ss") as a humane duration.
 * The backend serializes TimeSpan into a leading-zero-padded format we need
 * to parse client-side because the SPA never needs sub-minute precision.
 */
export function formatDuration(timespan: string | null): string {
  if (!timespan) return '—';
  // Split on '.' to peel off optional days
  let days = 0;
  let rest = timespan;
  const dotIdx = timespan.indexOf('.');
  if (dotIdx > 0 && dotIdx < 4) {  // leading-d form: "1.02:03:04"
    days = parseInt(timespan.substring(0, dotIdx), 10) || 0;
    rest = timespan.substring(dotIdx + 1);
  }
  // rest is "hh:mm:ss" or "hh:mm:ss.ffffff"
  const colonParts = rest.split(':');
  const hours = parseInt(colonParts[0], 10) || 0;
  const minutes = parseInt(colonParts[1], 10) || 0;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return '< 1m';
}

// ─── Inbox notifications ─────────────────────────────────────────────

export interface InboxNotification {
  itemId: number;
  itemType: string;
  priority: string;
  description: string;
  claimId: number | null;
  patientId: number | null;
  eventType: 'assigned';
  actorEmail: string;
  occurredAtUtc: string;
}

export interface InboxNotificationsResponse {
  notifications: InboxNotification[];
  serverNowUtc: string;
  lastSeenAtUtc: string;
}

export const pollInboxNotifications = (): Promise<InboxNotificationsResponse> =>
  apiClient
    .get<InboxNotificationsResponse>('/billing/inbox/notifications')
    .then((r) => r.data);

export const acknowledgeInboxNotifications = (upToUtc: string): Promise<void> =>
  apiClient
    .post('/billing/inbox/notifications/ack', { upToUtc })
    .then(() => undefined);

export const getDenials = (params?: { status?: string; category?: string; page?: number; pageSize?: number; }): Promise<{ data: DenialItem[]; pagination: PaginationMeta }> =>
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

export const escalateDenial = (
  denialId: number, notes: string | null,
): Promise<{ data: unknown }> =>
  apiClient.put<{ data: unknown }>(`/billing/denials/${denialId}/escalate`, { notes }).then((r) => r.data);

export const getDenialById = (denialId: number): Promise<DenialItem> =>
  apiClient.get<{ data: DenialItem }>(`/billing/denials/${denialId}`).then((r) => r.data.data);

export const draftDenialAppeal = (denialId: number): Promise<DenialAppealDraftResult> =>
  apiClient
    .post<{ data: DenialAppealDraftResult }>(`/billing/denials/${denialId}/draft-appeal`)
    .then((r) => r.data.data);

export interface DenialAppealDraftStreamHandlers {
  onDelta: (text: string) => void;
  onDone: (result: DenialAppealDraftResult) => void;
  onError: (event: AiStreamErrorEvent) => void;
}

/**
 * Streaming variant of {@link draftDenialAppeal}. Wraps the generic SSE
 * consumer + staff auth headers. The `done` payload mirrors the
 * non-streaming response shape (id / draftAppealText /
 * draftAppealGeneratedAtUtc), so callers can reuse the same state update
 * after either path.
 */
export async function draftDenialAppealStreaming(
  denialId: number,
  handlers: DenialAppealDraftStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const headers = await staffAuthHeaders();
  await consumeAiStream<DenialAppealDraftResult>(
    {
      url: `/api/v2/billing/denials/${denialId}/draft-appeal/stream`,
      headers,
      signal,
    },
    handlers,
  );
}

export interface DenialAnalysisResult {
  category: string;
  description: string;
  appealDeadline: string;
  recommendedAction: string;
  appealTemplate: string | null;
}

export const analyzeDenial = (params: {
  denialCode: string;
  payerName: string;
  denialDate: string;
}): Promise<DenialAnalysisResult> =>
  apiClient
    .post<{ data: DenialAnalysisResult }>('/billing/denials/analyze', params)
    .then((r) => r.data.data);

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

// ─── Tickler queue + bulk log-call ───────────────────────────────────────

export type TicklerStatus = 'overdue' | 'today' | 'upcoming' | 'all';

export interface ArTicklerRow {
  claimId: number;
  claimNumber: string;
  patientName: string;
  payer: string;
  amount: number;
  submittedDate: string | null;
  daysAged: number;
  nextFollowUpDate: string;
  daysUntilFollowUp: number;
  lastContactedAt: string | null;
}

export const getArTicklers = (
  status: TicklerStatus = 'overdue', limit = 50,
): Promise<{ data: ArTicklerRow[] }> =>
  apiClient
    .get<{ data: ArTicklerRow[] }>('/billing/ar-followup/ticklers', {
      params: { status, limit },
    })
    .then((r) => r.data);

export interface BulkLogArCallRequest {
  claimIds: number[];
  contactName: string;
  outcome: string;
  note: string;
  nextFollowUpDate?: string | null;
}

export interface BulkLogArCallSummary {
  data: { claimId: number; ok: boolean; noteId: number | null; error: string | null }[];
  summary: { requested: number; applied: number; failed: number };
}

export const bulkLogArCalls = (
  req: BulkLogArCallRequest,
): Promise<BulkLogArCallSummary> =>
  apiClient
    .post<BulkLogArCallSummary>('/billing/ar-followup/claims/bulk-notes', req)
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
  lastStatusCheckedAtUtc: string | null;
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

/**
 * Triggers an on-demand status poll for all pending prior auths in the
 * caller's tenant. Production polling happens every 15 minutes via the
 * hosted background service — this endpoint lets staff force a check
 * without waiting (useful right after a submission or for dev).
 */
export const refreshPriorAuthStatusNow = (): Promise<void> =>
  apiClient
    .post<void>('/billing/prior-auth/refresh-status')
    .then(() => undefined);

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

// ─── Superbills (encounter slips) ────────────────────────────────────

export interface SuperbillProcedure {
  code: string;
  modifier: string | null;
  units: number;
  charge: number;
}

export interface Superbill {
  id: number;
  organizationId: number;
  patientId: number;
  providerId: string;
  serviceDate: string;
  /** JSON-encoded string of string[] */
  diagnosisCodes: string;
  /** JSON-encoded string of SuperbillProcedure[] */
  procedureCodes: string;
  totalCharge: number;
  status: 'draft' | 'finalized';
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface SuperbillPagination {
  total: number;
  page: number;
  pageSize: number;
}

export const listSuperbills = (params: { page?: number; pageSize?: number } = {}):
  Promise<{ data: Superbill[]; pagination: SuperbillPagination }> =>
  apiClient
    .get<{ data: Superbill[]; pagination: SuperbillPagination }>('/billing/superbills', { params })
    .then((r) => r.data);

export const getSuperbill = (id: number): Promise<Superbill> =>
  apiClient
    .get<{ data: Superbill }>(`/billing/superbills/${id}`)
    .then((r) => r.data.data);

export interface CreateSuperbillRequest {
  patientId: number;
  providerId: string;
  serviceDate: string;
  diagnosisCodes: string[];
  procedureCodes: SuperbillProcedure[];
  notes?: string | null;
}

export const createSuperbill = (req: CreateSuperbillRequest): Promise<Superbill> =>
  apiClient
    .post<{ data: Superbill }>('/billing/superbills', req)
    .then((r) => r.data.data);

export const finalizeSuperbill = (id: number): Promise<Superbill> =>
  apiClient
    .put<{ data: Superbill }>(`/billing/superbills/${id}/finalize`, {})
    .then((r) => r.data.data);

export const downloadSuperbillPdf = async (id: number): Promise<Blob> => {
  const res = await apiClient.get<Blob>(`/billing/superbills/${id}/pdf`, {
    responseType: 'blob',
  });
  return res.data;
};

// ─── ERA postings (835 remittances) ──────────────────────────────────

export interface EraPostingRow {
  id: number;
  checkNumber: string;
  checkDate: string;
  payerName: string;
  paymentAmount: number;
  matchedClaims: number;
  unmatchedClaims: number;
  status: string;
  postedAt: string;
}

export const listEraPostings = (
  params: { page?: number; pageSize?: number } = {},
): Promise<{ data: EraPostingRow[]; total: number }> =>
  apiClient
    .get<{ data: EraPostingRow[]; total: number }>('/billing/era', { params })
    .then((r) => r.data);

export const getEraPosting = (id: number): Promise<EraPostingRow> =>
  apiClient
    .get<{ data: EraPostingRow }>(`/billing/era/${id}`)
    .then((r) => r.data.data);

/**
 * Manually ingest a raw 835 (paste-and-submit) — covers the case where
 * a payer sent a remittance file out-of-band that the automated
 * EraPostingLogic poller hasn't picked up. The orchestrator will parse,
 * match claims, and create the EraPosting row.
 */
export const postEra = (req: {
  raw835?: string | null;
  submissionId?: number | null;
}): Promise<{ data: { eraPostingId: number; matched: number; unmatched: number } }> =>
  apiClient
    .post<{ data: { eraPostingId: number; matched: number; unmatched: number } }>(
      '/billing/era', req,
    )
    .then((r) => r.data);
