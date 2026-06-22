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
