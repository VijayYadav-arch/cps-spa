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
