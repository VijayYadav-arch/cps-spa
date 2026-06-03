/**
 * API client for the /admin/encounters/* admin pages.
 *
 * Wraps the cps-dotnet PR #191 endpoints:
 *   GET  /api/v2/encounters                  (enriched paginated list — no patientId)
 *   POST /api/v2/encounters                  (create)
 *   GET  /api/v2/patients?q=&pageSize=20     (typeahead patient search)
 *
 * The shared apiClient (@/api/client) sets baseURL=/api/v2.
 *
 * Note: the /patients endpoint server-side does not currently honor the `q`
 * query param (PatientsController.GetAll ignores search today). We pass it
 * anyway — when server-side filtering lands, the typeahead becomes fast
 * without any client changes; until then the typeahead just lists the first
 * 20 patients as a fallback browse.
 */
import { apiClient } from '@/api/client';
import type {
  CreateEncounterRequest,
  EncountersListResponse,
  PatientSearchResult,
} from './encountersTypes';

const BASE = '/encounters';

export const encountersApi = {
  list: (params: { q?: string; includeDeleted?: boolean; page?: number; pageSize?: number }) =>
    apiClient.get<EncountersListResponse>(BASE, { params }).then((r) => r.data),
  create: (req: CreateEncounterRequest) =>
    apiClient.post<{ data: { id: number } }>(BASE, req).then((r) => r.data.data),
  searchPatients: (q: string) =>
    apiClient
      .get<{ data: PatientSearchResult[] }>('/patients', { params: { q, pageSize: 20 } })
      .then((r) => r.data.data),
};
