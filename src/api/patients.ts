import { apiClient } from './client';

export interface PatientSummary {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  organizationId: number;
  createdAt: string;
}

export interface PatientDetail extends PatientSummary {
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  insuranceId: string | null;
  updatedAt: string | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const getPatients = (params?: { page?: number; pageSize?: number; }): Promise<{ data: PatientSummary[]; pagination: PaginationMeta }> =>
  apiClient.get<{ data: PatientSummary[]; pagination: PaginationMeta }>('/patients', { params }).then((r) => r.data);

export const getPatient = (id: number): Promise<PatientDetail> =>
  apiClient.get<{ data: PatientDetail }>(`/patients/${id}`).then((r) => r.data.data);
