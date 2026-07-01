import { apiClient } from '@/api/client';

/** A Medicare home-health admission/episode (parallel to a hospice election). */
export interface HomeHealthEpisode {
  id: number;
  patientId: number;
  startOfCareDate: string;
  admissionSource: string; // "community" | "institutional"
  status: string; // "active" | "discharged" | "transferred"
  certFromDate: string;
  certToDate: string;
  periodNumber: number;
}

export interface CreateHomeHealthEpisodeInput {
  patientId: number;
  startOfCareDate: string;
  admissionSource: string;
}

export const createHomeHealthEpisode = (input: CreateHomeHealthEpisodeInput): Promise<HomeHealthEpisode> =>
  apiClient.post<HomeHealthEpisode>('/home-health/episodes', input).then((r) => r.data);

export const getHomeHealthEpisode = (id: number): Promise<HomeHealthEpisode> =>
  apiClient.get<HomeHealthEpisode>(`/home-health/episodes/${id}`).then((r) => r.data);

export const listHomeHealthEpisodesForPatient = (patientId: number): Promise<HomeHealthEpisode[]> =>
  apiClient
    .get<{ data: HomeHealthEpisode[] }>(`/home-health/patients/${patientId}/episodes`)
    .then((r) => r.data.data ?? []);

/** Agency-wide episode row (episode + patient name + recert-due flag) for the ops dashboard. */
export interface HomeHealthEpisodeListItem {
  id: number;
  patientId: number;
  patientName: string;
  status: string;
  admissionSource: string;
  periodNumber: number;
  startOfCareDate: string;
  certFromDate: string;
  certToDate: string;
  recertDueSoon: boolean;
}

export interface HomeHealthDashboard {
  activeCount: number;
  dischargedCount: number;
  communityCount: number;
  institutionalCount: number;
  recertDueSoonCount: number;
  startedLast30Count: number;
}

/** Agency-wide episode list. status: 'active' | 'discharged' | 'transferred' | 'all'. */
export const listHomeHealthEpisodes = (status = 'active'): Promise<HomeHealthEpisodeListItem[]> =>
  apiClient
    .get<{ data: HomeHealthEpisodeListItem[] }>('/home-health/episodes', { params: { status } })
    .then((r) => r.data.data ?? []);

export const getHomeHealthDashboard = (): Promise<HomeHealthDashboard> =>
  apiClient
    .get<{ data: HomeHealthDashboard }>('/home-health/dashboard')
    .then((r) => r.data.data);

/** Home-health Plan of Care (CMS-485) for one certification period. */
export interface HomeHealthPlanOfCare {
  id: number;
  episodeId: number;
  periodNumber: number;
  certifyingPhysicianName: string;
  certifyingPhysicianNpi: string | null;
  faceToFaceDate: string | null;
  orders: string | null;
  goals: string | null;
  status: string; // "draft" | "signed"
  signedBy: string | null;
  signedAt: string | null;
}

export interface CreatePlanOfCareInput {
  certifyingPhysicianName: string;
  certifyingPhysicianNpi?: string | null;
  faceToFaceDate?: string | null;
  orders?: string | null;
  goals?: string | null;
}

export const listPlansOfCare = (episodeId: number): Promise<HomeHealthPlanOfCare[]> =>
  apiClient
    .get<{ data: HomeHealthPlanOfCare[] }>(`/home-health/episodes/${episodeId}/plan-of-care`)
    .then((r) => r.data.data ?? []);

export const createPlanOfCare = (episodeId: number, input: CreatePlanOfCareInput): Promise<HomeHealthPlanOfCare> =>
  apiClient.post<HomeHealthPlanOfCare>(`/home-health/episodes/${episodeId}/plan-of-care`, input).then((r) => r.data);

export const signPlanOfCare = (pocId: number, signedBy: string): Promise<HomeHealthPlanOfCare> =>
  apiClient.put<HomeHealthPlanOfCare>(`/home-health/plan-of-care/${pocId}/sign`, { signedBy }).then((r) => r.data);

export const recertifyEpisode = (episodeId: number): Promise<HomeHealthEpisode> =>
  apiClient.post<HomeHealthEpisode>(`/home-health/episodes/${episodeId}/recertify`, {}).then((r) => r.data);

/** OASIS-E assessment (pragmatic — PDGM functional items + lifecycle). */
export interface OasisFunctional {
  grooming: number;
  dressUpper: number;
  dressLower: number;
  bathing: number;
  toiletTransferring: number;
  transferring: number;
  ambulation: number;
}

export interface HomeHealthOasis {
  id: number;
  episodeId: number;
  periodNumber: number;
  assessmentType: string;
  assessmentDate: string;
  status: string; // "draft" | "completed" | "submitted"
  functional: OasisFunctional;
  functionalPoints: number;
  functionalLevel: string; // "low" | "medium" | "high"
  completedAt: string | null;
}

export interface CreateOasisInput extends OasisFunctional {
  assessmentType: string;
  assessmentDate: string;
}

export const listOasis = (episodeId: number): Promise<HomeHealthOasis[]> =>
  apiClient
    .get<{ data: HomeHealthOasis[] }>(`/home-health/episodes/${episodeId}/oasis`)
    .then((r) => r.data.data ?? []);

export const createOasis = (episodeId: number, input: CreateOasisInput): Promise<HomeHealthOasis> =>
  apiClient.post<HomeHealthOasis>(`/home-health/episodes/${episodeId}/oasis`, input).then((r) => r.data);

export const completeOasis = (oasisId: number): Promise<HomeHealthOasis> =>
  apiClient.put<HomeHealthOasis>(`/home-health/oasis/${oasisId}/complete`, {}).then((r) => r.data);

/** A PDGM 30-day payment period with its computed HIPPS code. */
export interface HomeHealthPaymentPeriod {
  id: number;
  episodeId: number;
  periodSequence: number;
  fromDate: string;
  toDate: string;
  admissionTiming: string; // "early" | "late"
  clinicalGroupCode: string;
  functionalLevel: string;
  comorbidityLevel: string;
  hippsCode: string;
  status: string; // "open" | "claimed"
  claimId: number | null;
}

export const listPaymentPeriods = (episodeId: number): Promise<HomeHealthPaymentPeriod[]> =>
  apiClient
    .get<{ data: HomeHealthPaymentPeriod[] }>(`/home-health/episodes/${episodeId}/payment-periods`)
    .then((r) => r.data.data ?? []);

export const createPaymentPeriod = (episodeId: number): Promise<HomeHealthPaymentPeriod> =>
  apiClient.post<HomeHealthPaymentPeriod>(`/home-health/episodes/${episodeId}/payment-periods`, {}).then((r) => r.data);

/** Notice of Admission (one per episode, 5-day timely filing). */
export interface HomeHealthNoa {
  id: number;
  episodeId: number;
  deadlineDate: string;
  status: string; // "pending" | "submitted" | "late"
  submissionMode: string | null;
  submittedAt: string | null;
}

export const getNoa = (episodeId: number): Promise<HomeHealthNoa> =>
  apiClient.get<HomeHealthNoa>(`/home-health/episodes/${episodeId}/noa`).then((r) => r.data);

export const submitNoa = (episodeId: number, mode: string): Promise<HomeHealthNoa> =>
  apiClient.post<HomeHealthNoa>(`/home-health/episodes/${episodeId}/noa/submit`, { mode }).then((r) => r.data);

/** Result of building the 837I final claim for a 30-day period. */
export interface HomeHealthClaimResult {
  claimId: number;
  claimNumber: string;
  periodId: number;
  hippsCode: string;
  visitCount: number;
  isLupa: boolean;
  amount: number;
  warnings: string[];
}

export const buildClaimForPeriod = (periodId: number): Promise<HomeHealthClaimResult> =>
  apiClient.post<HomeHealthClaimResult>(`/home-health/payment-periods/${periodId}/build-claim`, {}).then((r) => r.data);

/** Episode discharge / transfer. */
export interface HomeHealthDischarge {
  id: number;
  episodeId: number;
  dischargeDate: string;
  reason: string;
  isTransfer: boolean;
  notes: string | null;
}

export interface DischargeInput {
  dischargeDate: string;
  reason: string;
  isTransfer: boolean;
  notes?: string | null;
}

export const dischargeEpisode = (episodeId: number, input: DischargeInput): Promise<HomeHealthDischarge> =>
  apiClient.post<HomeHealthDischarge>(`/home-health/episodes/${episodeId}/discharge`, input).then((r) => r.data);
