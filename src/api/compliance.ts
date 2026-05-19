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
