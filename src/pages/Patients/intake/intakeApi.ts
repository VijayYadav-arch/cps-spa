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
  submitFinal: (form: FormData) =>
    apiClient.post<{ id: number }>('/patients', form).then((r) => r.data),
};
