import { apiClient } from '@/api/client';

// ============================================================
// Sub-system F — QAPI Program
// ============================================================

export type HospiceQapiPlanStatus = 'Draft' | 'Approved' | 'Archived';

export type HospiceQapiPipCategory =
  | 'PatientSafety' | 'ClinicalOutcome' | 'CarePlanning' | 'PatientExperience' | 'Other';

export type HospiceQapiPipStatus = 'Planning' | 'Active' | 'Completed' | 'OnHold';

export type HospiceAdverseEventCategory =
  | 'PatientFall' | 'MedicationError' | 'UnscheduledHospitalization'
  | 'Complaint' | 'GipDeath' | 'Other';

export type HospiceAdverseEventSeverity = 'Minor' | 'Moderate' | 'Major' | 'Critical';

export type HospiceAdverseEventSource = 'Manual' | 'AutoDerived';

export type HospiceAdverseEventStatus =
  | 'Draft' | 'Active' | 'UnderReview' | 'Closed' | 'DismissedAsNonEvent';

export type HospiceRcaMethod = 'FiveWhys' | 'FishboneIshikawa' | 'FailureModeAnalysis';

export interface HospiceQapiPlan {
  id: number;
  organizationId: number;
  title: string;
  bodyMarkdown: string;
  version: number;
  effectiveDate: string;
  status: HospiceQapiPlanStatus;
  approvedByUserId: number | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HospiceQapiPip {
  id: number;
  organizationId: number;
  title: string;
  description: string;
  category: HospiceQapiPipCategory;
  status: HospiceQapiPipStatus;
  baselineMeasurement: number | null;
  baselineMeasurementDate: string | null;
  targetMeasurement: number | null;
  targetDate: string | null;
  currentMeasurement: number | null;
  currentMeasurementDate: string | null;
  interventionPlan: string;
  outcomeSummary: string | null;
  ownerUserId: number;
  leadingHqrpMetric: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HospiceAdverseEvent {
  id: number;
  organizationId: number;
  category: HospiceAdverseEventCategory;
  severity: HospiceAdverseEventSeverity;
  source: HospiceAdverseEventSource;
  status: HospiceAdverseEventStatus;
  eventDate: string;
  reportedByUserId: number;
  patientId: number | null;
  summary: string;
  immediateActionTaken: string | null;
  sourceAuditEventCode: string | null;
  notes: string | null;
  closedAt: string | null;
  closedByUserId: number | null;
  createdAt: string;
  updatedAt: string;
  rca: HospiceAdverseEventRca | null;
}

export interface HospiceAdverseEventRca {
  id: number;
  eventId: number;
  rcaMethod: HospiceRcaMethod;
  contributingFactors: string;
  rootCauseSummary: string;
  rcaCompletedAt: string;
  rcaCompletedByUserId: number;
  linkedPipId: number | null;
}

export interface HospiceQapiReview {
  id: number;
  organizationId: number;
  reviewDate: string;
  attendeeNames: string;
  topicsReviewed: string;
  decisionsMade: string;
  nextReviewTargetDate: string;
  recordedByUserId: number;
  createdAt: string;
}

/** Trailing-90-day HOPE submission-timeliness summary (CMS HQRP). */
export interface QapiHqrpSummary {
  from: string;
  to: string;
  totalAssessments: number;
  onTimeCount: number;
  lateCount: number;
  notYetSubmittedCount: number;
  rejectedCount: number;
  timelinessPercentage: number;
  meetsThreshold: boolean;
  thresholdPercentage: number;
}

/** Current-quarter CAHPS Hospice Survey submission summary. */
export interface QapiCahpsSummary {
  calendarYear: number;
  quarter: number;
  quarterFrom: string;
  quarterTo: string;
  totalDecedents: number;
  eligibleCount: number;
  ineligibleCount: number;
  excludedCount: number;
  submittedCount: number;
  pendingCount: number;
  notYetSubmittedCount: number;
  submissionRatePercentage: number;
}

export interface QapiDashboard {
  planStatus: { currentVersion: number | null; status: HospiceQapiPlanStatus | null; effectiveDate: string | null };
  activePipCount: number;
  topActivePips: HospiceQapiPip[];
  adverseEventCountByCategory90d: Record<string, number>;
  weekOverWeekTrend: { currentWeekCount: number; previousWeekCount: number; delta: number };
  daysSinceLastReview: number;
  reviewOverdue: boolean;
  hqrpSummary: QapiHqrpSummary | null;
  cahpsSummary: QapiCahpsSummary | null;
}

// ============ Plan ============
export const getActivePlan = () =>
  apiClient.get<HospiceQapiPlan | ''>('/hospice/qapi/plan/active').then(r => r.data || null);

export const listPlanVersions = () =>
  apiClient.get<HospiceQapiPlan[]>('/hospice/qapi/plan/versions').then(r => r.data);

export const createPlanDraft = (body: { title: string; bodyMarkdown: string; effectiveDate: string }) =>
  apiClient.post<HospiceQapiPlan>('/hospice/qapi/plan/draft', body).then(r => r.data);

export const approvePlan = (planId: number) =>
  apiClient.post<HospiceQapiPlan>(`/hospice/qapi/plan/${planId}/approve`).then(r => r.data);

// ============ PIPs ============
export const listPips = (filters?: { status?: HospiceQapiPipStatus; category?: HospiceQapiPipCategory }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.category) params.set('category', filters.category);
  const query = params.toString();
  return apiClient.get<HospiceQapiPip[]>(`/hospice/qapi/pips${query ? '?' + query : ''}`).then(r => r.data);
};

export const createPip = (body: {
  title: string; description: string; category: HospiceQapiPipCategory;
  interventionPlan: string; ownerUserId: number; leadingHqrpMetric?: string | null;
}) => apiClient.post<HospiceQapiPip>('/hospice/qapi/pips', body).then(r => r.data);

export const updatePipMeasurement = (pipId: number, body: {
  baseline?: number; baselineDate?: string;
  target?: number; targetDateValue?: string;
  current?: number; currentDate?: string;
}) => apiClient.patch<HospiceQapiPip>(`/hospice/qapi/pips/${pipId}/measurement`, body).then(r => r.data);

export const activatePip = (pipId: number) =>
  apiClient.post<HospiceQapiPip>(`/hospice/qapi/pips/${pipId}/activate`).then(r => r.data);

export const completePip = (pipId: number, outcomeSummary: string) =>
  apiClient.post<HospiceQapiPip>(`/hospice/qapi/pips/${pipId}/complete`, { outcomeSummary }).then(r => r.data);

// ============ Adverse Events ============
export const listAdverseEvents = (filters?: {
  status?: HospiceAdverseEventStatus;
  category?: HospiceAdverseEventCategory;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.category) params.set('category', filters.category);
  const query = params.toString();
  return apiClient.get<HospiceAdverseEvent[]>(`/hospice/qapi/adverse-events${query ? '?' + query : ''}`).then(r => r.data);
};

export const listDraftAdverseEvents = () =>
  apiClient.get<HospiceAdverseEvent[]>('/hospice/qapi/adverse-events/drafts').then(r => r.data);

export const getAdverseEvent = (id: number) =>
  apiClient.get<HospiceAdverseEvent>(`/hospice/qapi/adverse-events/${id}`).then(r => r.data);

export const createAdverseEvent = (body: {
  category: HospiceAdverseEventCategory;
  severity: HospiceAdverseEventSeverity;
  eventDate: string;
  patientId?: number | null;
  summary: string;
  immediateActionTaken?: string | null;
}) => apiClient.post<HospiceAdverseEvent>('/hospice/qapi/adverse-events', body).then(r => r.data);

export const updateAdverseEventStatus = (id: number, body: {
  status: HospiceAdverseEventStatus;
  notes?: string | null;
}) => apiClient.patch<HospiceAdverseEvent>(`/hospice/qapi/adverse-events/${id}`, body).then(r => r.data);

export const createRca = (eventId: number, body: {
  method: HospiceRcaMethod;
  contributingFactors: string;
  rootCauseSummary: string;
  linkedPipId?: number | null;
  createPip?: boolean;
  pipTitle?: string;
  pipDescription?: string;
  pipCategory?: HospiceQapiPipCategory;
}) => apiClient.post<HospiceAdverseEventRca>(`/hospice/qapi/adverse-events/${eventId}/rca`, body).then(r => r.data);

// ============ Reviews ============
export const listReviews = (skip = 0, take = 50) =>
  apiClient.get<HospiceQapiReview[]>(`/hospice/qapi/reviews?skip=${skip}&take=${take}`).then(r => r.data);

export const getMostRecentReview = () =>
  apiClient.get<HospiceQapiReview | ''>('/hospice/qapi/reviews/most-recent').then(r => r.data || null);

export const logReview = (body: {
  reviewDate: string;
  attendeeNames: string;
  topicsReviewed: string;
  decisionsMade: string;
  nextReviewTargetDate: string;
}) => apiClient.post<HospiceQapiReview>('/hospice/qapi/reviews', body).then(r => r.data);

// ============ Dashboard ============
export const getQapiDashboard = () =>
  apiClient.get<QapiDashboard>('/hospice/qapi/dashboard').then(r => r.data);

// ============ Audit Triggers (admin) ============
export interface HospiceQapiAuditTrigger {
  id: number;
  organizationId: number;
  auditEventCode: string;
  category: HospiceAdverseEventCategory;
  severity: HospiceAdverseEventSeverity;
  isEnabled: boolean;
}

export const listAuditTriggers = () =>
  apiClient.get<HospiceQapiAuditTrigger[]>('/hospice/qapi/audit-triggers').then(r => r.data);

export const upsertAuditTrigger = (body: {
  auditEventCode: string;
  category: HospiceAdverseEventCategory;
  severity: HospiceAdverseEventSeverity;
  isEnabled: boolean;
}) => apiClient.put<HospiceQapiAuditTrigger>(
  `/hospice/qapi/audit-triggers/${encodeURIComponent(body.auditEventCode)}`,
  body
).then(r => r.data);
