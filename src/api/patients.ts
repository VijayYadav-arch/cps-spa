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

export interface PatientHistoryEvent {
  id: number;
  type: 'encounter' | 'visit' | 'medication' | 'admission';
  date: string;
  summary: string;
  // Encounter
  provider: string | null;
  diagnosisCodes: string | null;
  procedureCodes: string | null;
  notes: string | null;
  // Visit
  visitType: string | null;
  status: string | null;
  clinicianId: number | null;
  signedAt: string | null;
  // Medication
  medicationName: string | null;
  dosage: string | null;
  route: string | null;
  frequency: string | null;
  prescribedBy: string | null;
  isActive: boolean | null;
  // Admission
  admissionType: string | null;
  admissionStatus: string | null;
  levelOfCare: string | null;
  dischargedAt: string | null;
}

export interface PatientAccessLogEntry {
  id: number;
  eventType: string;
  description: string;
  userId: number | null;
  userEmail: string | null;
  resourceType: string | null;
  resourceId: number | null;
  result: string;
  ipAddress: string | null;
  createdAt: string;
}

export const getPatientHistory = (
  id: number,
  params?: { type?: string; page?: number; pageSize?: number }
): Promise<{
  data: PatientHistoryEvent[];
  pagination: PaginationMeta;
  filters: { type: string | null };
}> =>
  apiClient
    .get<{
      data: PatientHistoryEvent[];
      pagination: PaginationMeta;
      filters: { type: string | null };
    }>(`/patients/${id}/history`, { params })
    .then((r) => r.data);

export const getPatientAccessLog = (
  id: number,
  params?: { page?: number; pageSize?: number }
): Promise<{ data: PatientAccessLogEntry[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: PatientAccessLogEntry[]; pagination: PaginationMeta }>(
      `/patients/${id}/access-log`,
      { params }
    )
    .then((r) => r.data);
