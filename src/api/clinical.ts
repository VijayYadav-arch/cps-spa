import { apiClient } from './client';

// --- Care Plans (GET /api/v2/clinical/care-plans) ---
export interface CarePlan {
  id: number;
  patientId: number;
  organizationId: number;
  status: string;
  title: string;
  goals: string | null;
  effectiveDate: string;
  reviewDate: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// --- Prior Auth (GET /api/v2/clinical/prior-auth) ---
export interface PriorAuth {
  id: number;
  patientId: number;
  organizationId: number;
  status: string;
  serviceType: string;
  requestedDate: string;
  approvedDate: string | null;
  deniedDate: string | null;
  expirationDate: string | null;
  payerName: string;
  referenceNumber: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
}

// GET /api/v2/clinical/care-plans?patientId=&status=&page=&pageSize=
export const getCarePlans = (params?: {
  patientId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: CarePlan[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: CarePlan[]; pagination: PaginationMeta }>('/clinical/care-plans', { params })
    .then((r) => r.data);

// GET /api/v2/clinical/care-plans/{id}
export const getCarePlan = (id: number): Promise<CarePlan> =>
  apiClient
    .get<{ data: CarePlan }>(`/clinical/care-plans/${id}`)
    .then((r) => r.data.data);

// GET /api/v2/clinical/prior-auth?status=&page=&pageSize=
export const getPriorAuths = (params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: PriorAuth[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: PriorAuth[]; pagination: PaginationMeta }>('/clinical/prior-auth', { params })
    .then((r) => r.data);

// --- Medications (GET/POST/PUT /api/v2/clinical/medications) ---
export interface Medication {
  id: number;
  patientId: number;
  organizationId: number;
  name: string;
  genericName: string | null;
  dosage: string;
  route: string;
  frequency: string;
  prescribedBy: string | null;
  purpose: string | null;
  isHospiceRelated: boolean | null;
  isActive: boolean;
  notes: string | null;
}

export interface CreateMedicationRequest {
  patientId: number;
  name: string;
  genericName?: string | null;
  dosage: string;
  route: string;
  frequency: string;
  prescribedBy?: string | null;
  purpose?: string | null;
  isHospiceRelated?: boolean | null;
  isActive?: boolean;
  notes?: string | null;
}

export type UpdateMedicationRequest = Partial<Omit<CreateMedicationRequest, 'patientId'>>;

export const getMedications = (params?: {
  patientId?: number;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ data: Medication[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: Medication[]; pagination: PaginationMeta }>('/clinical/medications', { params })
    .then((r) => r.data);

export const createMedication = (req: CreateMedicationRequest): Promise<Medication> =>
  apiClient
    .post<{ data: Medication }>('/clinical/medications', req)
    .then((r) => r.data.data);

export const updateMedication = (
  id: number,
  req: UpdateMedicationRequest,
): Promise<Medication> =>
  apiClient
    .put<{ data: Medication }>(`/clinical/medications/${id}`, req)
    .then((r) => r.data.data);
