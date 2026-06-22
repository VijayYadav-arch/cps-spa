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
