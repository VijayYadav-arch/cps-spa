import { apiClient } from '@/api/client';

// ─── Reg-8: PHI Access Review (HIPAA §164.308(a)(1)(ii)(D)) ───────────────

export type PhiAnomalyFlag = 'BulkRead' | 'OffHours' | 'CrossOrg' | 'Modify';
export type ReviewResult = 'ok' | 'investigate' | 'escalated';
export type ReviewSubjectType = 'patient' | 'user' | 'anomaly';

export interface PhiAccessEvent {
  id: number;
  createdAt: string;
  eventType: string;
  result: string;
  userId: number | null;
  userEmail: string | null;
  resourceType: string | null;
  resourceId: number | null;
  patientId: number | null;
  ipAddress: string | null;
  description: string;
  anomalyFlags: PhiAnomalyFlag[];
}

export interface PatientAccessReport {
  patientId: number;
  fromUtc: string;
  toUtc: string;
  totalEvents: number;
  distinctUserCount: number;
  modificationCount: number;
  anomalyCount: number;
  lastReviewedAtUtc: string | null;
  lastReviewResult: string | null;
  events: PhiAccessEvent[];
}

export interface UserAccessReport {
  userId: number;
  userEmail: string | null;
  fromUtc: string;
  toUtc: string;
  totalEvents: number;
  distinctPatientCount: number;
  offHoursCount: number;
  anomalyCount: number;
  lastReviewedAtUtc: string | null;
  lastReviewResult: string | null;
  events: PhiAccessEvent[];
}

export interface AnomalyReport {
  fromUtc: string;
  toUtc: string;
  totalAnomalies: number;
  bulkReadCount: number;
  offHoursCount: number;
  crossOrgCount: number;
  events: PhiAccessEvent[];
}

export interface PhiAccessReview {
  id: number;
  subjectType: ReviewSubjectType;
  subjectId: number;
  windowFromUtc: string;
  windowToUtc: string;
  result: ReviewResult;
  notes: string | null;
  reviewerUserId: number;
  reviewerEmail: string;
  reviewedAtUtc: string;
  eventCount: number;
}

export interface RecordReviewRequest {
  subjectType: ReviewSubjectType;
  subjectId: number;
  windowFromUtc: string;
  windowToUtc: string;
  result: ReviewResult;
  notes: string | null;
  eventCount: number;
}

export interface RetentionStatus {
  totalEvents: number;
  under1YearCount: number;
  between1And3YearsCount: number;
  between3And6YearsCount: number;
  over6YearsCount: number;
  oldestEventAtUtc: string | null;
  minimumRequiredYears: number;
}

const BASE = '/compliance/phi-access';

export const getPhiPatientAccess = (
  patientId: number, from?: string, to?: string,
): Promise<PatientAccessReport> =>
  apiClient
    .get<PatientAccessReport>(`${BASE}/by-patient/${patientId}`, {
      params: { from, to },
    })
    .then((r) => r.data);

export const getPhiUserAccess = (
  userId: number, from?: string, to?: string,
): Promise<UserAccessReport> =>
  apiClient
    .get<UserAccessReport>(`${BASE}/by-user/${userId}`, {
      params: { from, to },
    })
    .then((r) => r.data);

export const getPhiAnomalies = (
  from?: string, to?: string,
): Promise<AnomalyReport> =>
  apiClient
    .get<AnomalyReport>(`${BASE}/anomalies`, { params: { from, to } })
    .then((r) => r.data);

export const recordPhiReview = (req: RecordReviewRequest): Promise<PhiAccessReview> =>
  apiClient.post<PhiAccessReview>(`${BASE}/reviews`, req).then((r) => r.data);

export const listPhiReviews = (
  subjectType?: ReviewSubjectType, subjectId?: number,
): Promise<{ data: PhiAccessReview[] }> =>
  apiClient
    .get<{ data: PhiAccessReview[] }>(`${BASE}/reviews`, {
      params: subjectType && subjectId !== undefined
        ? { subjectType, subjectId }
        : undefined,
    })
    .then((r) => r.data);

export const getPhiRetentionStatus = (): Promise<RetentionStatus> =>
  apiClient.get<RetentionStatus>(`${BASE}/retention-status`).then((r) => r.data);

// ─── Reg-10: Surveyor Evidence Bundle ────────────────────────────────────

export interface SurveyorBundleEntry {
  fileName: string;
  contentType: string;
  rowCount: number;
}

export interface SurveyorBundleManifest {
  generatedAtUtc: string;
  patientId: number;
  patientName: string;
  medicareId: string | null;
  admittedAt: string | null;
  dateOfDeath: string | null;
  windowFrom: string;
  windowTo: string;
  electionCount: number;
  certificationCount: number;
  faceToFaceCount: number;
  carePlanReviewCount: number;
  idgMeetingCount: number;
  volunteerHoursTotal: number;
  files: SurveyorBundleEntry[];
}

const BUNDLE_BASE = '/compliance/surveyor-bundle';

export const getSurveyorBundleManifest = (
  patientId: number, from?: string, to?: string,
): Promise<SurveyorBundleManifest> =>
  apiClient
    .get<SurveyorBundleManifest>(`${BUNDLE_BASE}/${patientId}/manifest`, {
      params: { from, to },
    })
    .then((r) => r.data);

// ─── Reg-12: HIPAA Breach Notification Workflow ──────────────────────────

export type BreachStatus =
  | 'draft'
  | 'confirmed'
  | 'assessed'
  | 'notifying'
  | 'hhs_notified'
  | 'closed'
  | 'overdue';

export type BreachRiskLevel = 'Low' | 'Moderate' | 'High';

export interface BreachWorkflowSummary {
  id: number;
  status: BreachStatus;
  discoveredAt: string;
  confirmedAt: string | null;
  riskAssessmentAt: string | null;
  riskLevel: BreachRiskLevel | null;
  patientNotificationsSentAt: string | null;
  mediaNoticeSentAt: string | null;
  mediaNoticeRequired: boolean;
  hhsNotifiedAt: string | null;
  closedAt: string | null;
  affectedPatientCount: number | null;
  description: string | null;
  daysUntilDeadline: number | null;
  isOverdue: boolean;
}

export interface BreachActivity {
  id: number;
  occurredAtUtc: string;
  eventType: string;
  actorUserId: number;
  actorEmail: string;
  notes: string | null;
}

export interface AssessRiskRequest {
  riskLevel: BreachRiskLevel;
  notes: string | null;
  affectedPatientCount: number | null;
  mediaNoticeRequired: boolean;
}

const BREACH_BASE = '/compliance/breaches/workflow';

export const listBreachesWorkflow = (): Promise<{ data: BreachWorkflowSummary[] }> =>
  apiClient.get<{ data: BreachWorkflowSummary[] }>(BREACH_BASE).then((r) => r.data);

export const getBreachWorkflow = (id: number): Promise<BreachWorkflowSummary> =>
  apiClient.get<BreachWorkflowSummary>(`${BREACH_BASE}/${id}`).then((r) => r.data);

export const getBreachActivity = (
  id: number,
): Promise<{ data: BreachActivity[] }> =>
  apiClient
    .get<{ data: BreachActivity[] }>(`${BREACH_BASE}/${id}/activity`)
    .then((r) => r.data);

export const assessBreachRisk = (
  id: number, req: AssessRiskRequest,
): Promise<BreachWorkflowSummary> =>
  apiClient
    .post<BreachWorkflowSummary>(`${BREACH_BASE}/${id}/assess-risk`, req)
    .then((r) => r.data);

export const sendBreachPatientNotifications = (
  id: number, notes: string | null,
): Promise<BreachWorkflowSummary> =>
  apiClient
    .post<BreachWorkflowSummary>(`${BREACH_BASE}/${id}/send-patient-notifications`, { notes })
    .then((r) => r.data);

export const sendBreachMediaNotice = (
  id: number, notes: string | null,
): Promise<BreachWorkflowSummary> =>
  apiClient
    .post<BreachWorkflowSummary>(`${BREACH_BASE}/${id}/send-media-notice`, { notes })
    .then((r) => r.data);

export const sendBreachHhsNotification = (
  id: number, notes: string | null,
): Promise<BreachWorkflowSummary> =>
  apiClient
    .post<BreachWorkflowSummary>(`${BREACH_BASE}/${id}/send-hhs-notification`, { notes })
    .then((r) => r.data);

export const closeBreach = (
  id: number, notes: string | null,
): Promise<BreachWorkflowSummary> =>
  apiClient
    .post<BreachWorkflowSummary>(`${BREACH_BASE}/${id}/close`, { notes })
    .then((r) => r.data);

// ─── Audit anomaly alerts ─────────────────────────────────────────────

export type AnomalyStatus = 'open' | 'dismissed' | 'escalated';
export type AnomalyType = 'bulk-read' | 'off-hours' | 'denial-cluster';

export interface AuditAnomalyAlert {
  id: number;
  organizationId: number;
  userId: number | null;
  userEmail: string | null;
  ipAddress: string | null;
  anomalyType: AnomalyType;
  detectedAtUtc: string;
  windowStartUtc: string;
  windowEndUtc: string;
  evidence: string;
  status: AnomalyStatus;
  reviewedByUserId: number | null;
  reviewedAtUtc: string | null;
  notes: string | null;
}

const ANOMALY_BASE = '/compliance/anomalies';

export const listAnomalies = (
  params: { status?: AnomalyStatus | ''; limit?: number } = {},
): Promise<{ data: AuditAnomalyAlert[]; total: number }> =>
  apiClient
    .get<{ data: AuditAnomalyAlert[]; total: number }>(ANOMALY_BASE, { params })
    .then((r) => r.data);

export const updateAnomalyStatus = (
  id: number, status: AnomalyStatus, notes: string | null,
): Promise<{ data: AuditAnomalyAlert }> =>
  apiClient
    .patch<{ data: AuditAnomalyAlert }>(`${ANOMALY_BASE}/${id}`, { status, notes })
    .then((r) => r.data);

export const scanAnomaliesNow = (): Promise<{ data: { inserted: number } }> =>
  apiClient
    .post<{ data: { inserted: number } }>(`${ANOMALY_BASE}/scan-now`)
    .then((r) => r.data);

/**
 * Triggers a browser download of the ZIP bundle. Returns the suggested file
 * name so the caller can show a confirmation.
 */
export async function downloadSurveyorBundle(
  patientId: number, from?: string, to?: string,
): Promise<string> {
  const res = await apiClient.get<Blob>(`${BUNDLE_BASE}/${patientId}`, {
    params: { from, to },
    responseType: 'blob',
  });
  const cd = (res.headers as { 'content-disposition'?: string })['content-disposition'];
  const match = cd?.match(/filename="?([^";]+)"?/);
  const fileName = match?.[1]
    ?? `surveyor-bundle-patient-${patientId}.zip`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
