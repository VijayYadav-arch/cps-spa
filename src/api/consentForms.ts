import { apiClient } from './client';

export interface ConsentForm {
  id: number;
  patientId: number;
  organizationId: number;
  formType: string;
  status: string;
  signedBy?: string | null;
  signedAt?: string | null;
  relationship?: string | null;
  witnessName?: string | null;
  witnessAt?: string | null;
  documentUrl?: string | null;
  signatureImageDataUrl?: string | null;
  expirationDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignConsentFormPayload {
  signedBy: string;
  signatureImageDataUrl: string;
  relationship?: string;
  witnessName?: string;
}

export const signConsentForm = (
  id: number,
  payload: SignConsentFormPayload,
): Promise<ConsentForm> =>
  apiClient
    .post<{ data: ConsentForm }>(`/consent-forms/${id}/sign`, payload)
    .then((r) => r.data.data);

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface ConsentFormsListParams {
  status?: string;
  formType?: string;
  patientId?: number;
  page?: number;
  pageSize?: number;
}

export const listConsentForms = (
  params?: ConsentFormsListParams,
): Promise<{ data: ConsentForm[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: ConsentForm[]; pagination: PaginationMeta }>('/consent-forms', { params })
    .then((r) => r.data);
