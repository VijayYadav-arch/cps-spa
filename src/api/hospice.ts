import { apiClient } from '@/api/client';

export type HospiceElectionStatus = 'Active' | 'Revoked' | 'Expired';
export type HospiceElectionType = 'InitialElection' | 'ReElection';
export type HospicePeriodStatus = 'Active' | 'Certified' | 'Completed' | 'Revoked';
export type NoeStatus = 'Pending' | 'Submitted' | 'ManualOverride' | 'Late';
export type NoeSubmissionMode = 'Clearinghouse' | 'Manual';

export interface HospiceElectionPeriod {
  id: number;
  periodNumber: number;
  startDate: string;
  endDate: string;
  status: HospicePeriodStatus;
  recertDueDate: string;
  daysUntilRecertDue: number;
  certificationId: number | null;
}

export interface NoticeOfElection {
  id: number;
  status: NoeStatus;
  deadlineDate: string;
  daysUntilDeadline: number;
  submittedAt: string | null;
  documentUrl: string | null;
  clearinghouseConfirmation: string | null;
  payerCode: string;
}

export interface HospiceElection {
  id: number;
  patientId: number;
  admissionId: number | null;
  electionDate: string;
  electionType: HospiceElectionType;
  lifetimeDaysAtElection: number;
  status: HospiceElectionStatus;
  revokedAt: string | null;
  currentPeriod: HospiceElectionPeriod | null;
  noe: NoticeOfElection | null;
}

export interface HospiceRevocation {
  id: number;
  electionId: number;
  revocationDate: string;
  reason: string | null;
  filedWithCms: boolean;
  filedAt: string | null;
}

export interface WorkQueueItem {
  type: 'RecertDue' | 'NoeOverdue';
  electionId: number;
  patientId: number;
  patientName: string;
  dueDate: string;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  periodNumber: number | null;
}

export interface CreateElectionRequest {
  patientId: number;
  admissionId: number | null;
  electionDate: string;
  payerCode: string;
}

export interface RevokeRequest {
  revocationDate: string;
  reason: string | null;
}

export interface SubmitNoeRequest {
  mode: NoeSubmissionMode;
  manualDocumentUrl: string | null;
}

export interface WorkQueueResponse {
  recertsDue: WorkQueueItem[];
  noeOverdue: WorkQueueItem[];
}

export const createElection = (req: CreateElectionRequest): Promise<HospiceElection> =>
  apiClient.post<HospiceElection>('/hospice/elections', req).then((r) => r.data);

export const getElection = (id: number): Promise<HospiceElection> =>
  apiClient.get<HospiceElection>(`/hospice/elections/${id}`).then((r) => r.data);

export const getPatientElections = (
  patientId: number,
): Promise<{ data: HospiceElection[] }> =>
  apiClient
    .get<{ data: HospiceElection[] }>(`/hospice/patients/${patientId}/elections`)
    .then((r) => r.data);

export const getActiveElections = (): Promise<{ data: HospiceElection[] }> =>
  apiClient
    .get<{ data: HospiceElection[] }>('/hospice/elections/active')
    .then((r) => r.data);

export const revokeElection = (
  id: number,
  req: RevokeRequest,
): Promise<HospiceRevocation> =>
  apiClient
    .post<HospiceRevocation>(`/hospice/elections/${id}/revoke`, req)
    .then((r) => r.data);

export const getRevocation = (id: number): Promise<HospiceRevocation> =>
  apiClient
    .get<HospiceRevocation>(`/hospice/elections/${id}/revocation`)
    .then((r) => r.data);

export const submitNoe = (
  id: number,
  req: SubmitNoeRequest,
): Promise<NoticeOfElection> =>
  apiClient
    .post<NoticeOfElection>(`/hospice/elections/${id}/noe/submit`, req)
    .then((r) => r.data);

export const getNoe = (id: number): Promise<NoticeOfElection> =>
  apiClient.get<NoticeOfElection>(`/hospice/elections/${id}/noe`).then((r) => r.data);

export const getWorkQueue = (): Promise<WorkQueueResponse> =>
  apiClient.get<WorkQueueResponse>('/hospice/work-queue').then((r) => r.data);
