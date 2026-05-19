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
