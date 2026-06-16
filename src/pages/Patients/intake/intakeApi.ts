import { apiClient } from '@/api/client';
import type { DraftResponse, FormData } from './intakeTypes';

const BASE = '/patients/intake-drafts';

export const intakeApi = {
  createDraft: (organizationId: number) =>
    apiClient.post<DraftResponse>(BASE, { organizationId }).then((r) => r.data),
  getMyOpenDraft: (): Promise<DraftResponse | null> =>
    apiClient.get<DraftResponse | ''>(`${BASE}/mine`).then((r) => (r.status === 204 ? null : (r.data as DraftResponse))),
  getDraftById: (id: number) =>
    apiClient.get<DraftResponse>(`${BASE}/${id}`).then((r) => r.data),
  updateDraft: (id: number, currentStep: number, form: FormData) =>
    apiClient.patch<DraftResponse>(`${BASE}/${id}`, { currentStep, formJson: JSON.stringify(form) })
      .then((r) => r.data),
  deleteDraft: (id: number) =>
    apiClient.delete(`${BASE}/${id}`).then(() => undefined),
  submitFinal: (form: FormData) => {
    // Optional fields left blank must be sent as null, not "" — the patient-create
    // endpoint runs format validators (e.g. [EmailAddress]) that reject an empty
    // string but allow null. Coerce every empty string in the payload to null.
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(form)) {
      payload[key] = value === '' ? null : value;
    }
    // POST /patients responds with an enveloped body: { data: { id, ... } }.
    return apiClient
      .post<{ data: { id: number } }>('/patients', payload)
      .then((r) => r.data.data);
  },
};
