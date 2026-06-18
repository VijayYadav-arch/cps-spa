import { apiClient } from './client';

// --- Care Plans (GET/POST/PUT /api/v2/clinical/care-plans) ---
// Mirrors the CarePlan entity. Goals/Interventions are JSON-array strings.
export interface CarePlan {
  id: number;
  patientId: number;
  organizationId: number;
  admissionId: number | null;
  version: number;
  status: string;
  effectiveDate: string;
  reviewDate: string | null;
  goals: string;
  interventions: string;
  frequency: string | null;
  signedBy: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateCarePlanRequest {
  patientId: number;
  status?: string;
  effectiveDate: string;
  reviewDate?: string | null;
  goals?: string;
  interventions?: string;
  frequency?: string | null;
}

export type UpdateCarePlanRequest = Partial<Omit<CreateCarePlanRequest, 'patientId'>>;

export const createCarePlan = (req: CreateCarePlanRequest): Promise<CarePlan> =>
  apiClient
    .post<{ data: CarePlan }>('/clinical/care-plans', req)
    .then((r) => r.data.data);

export const updateCarePlan = (
  id: number,
  req: UpdateCarePlanRequest,
): Promise<CarePlan> =>
  apiClient
    .put<{ data: CarePlan }>(`/clinical/care-plans/${id}`, req)
    .then((r) => r.data.data);

export const signCarePlan = (id: number, signedBy: string): Promise<CarePlan> =>
  apiClient
    .post<{ data: CarePlan }>(`/clinical/care-plans/${id}/sign`, { signedBy })
    .then((r) => r.data.data);

/** Parse a JSON-array string into a string[]; tolerant of malformed/empty input. */
export function parseJsonStringArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
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
  payer: string | null;
  payerName: string | null;
  authNumber: string | null;
  // Clearinghouse reference id (the entity field is ReferenceId; the prior
  // `referenceNumber` name never matched the payload and always read blank).
  referenceId: string | null;
  createdAt: string;
}

export interface CreatePriorAuthInput {
  patientId: number;
  payer: string;
  serviceType: string;
  requestedDate?: string;
  notes?: string | null;
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

// POST /api/v2/clinical/prior-auth
export const createPriorAuth = (input: CreatePriorAuthInput): Promise<PriorAuth> =>
  apiClient
    .post<{ data: PriorAuth }>('/clinical/prior-auth', { status: 'pending', ...input })
    .then((r) => r.data.data);

// PUT /api/v2/clinical/prior-auth/{id} — used here to record an approve/deny decision.
export const updatePriorAuthStatus = (id: number, status: string): Promise<PriorAuth> =>
  apiClient
    .put<{ data: PriorAuth }>(`/clinical/prior-auth/${id}`, { status })
    .then((r) => r.data.data);

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

// --- eMAR: Medication Administrations (/api/v2/clinical/medication-administrations) ---
export type AdministrationStatus = 'given' | 'held' | 'refused' | 'missed';

export interface MedicationAdministration {
  id: number;
  patientId: number;
  medicationId: number;
  administeredAt: string;
  administeredByUserId: number;
  status: AdministrationStatus;
  dose: string | null;
  notes: string | null;
}

export interface RecordAdministrationRequest {
  medicationId: number;
  status: AdministrationStatus;
  administeredAt?: string | null;
  dose?: string | null;
  notes?: string | null;
}

export const listAdministrations = (params: {
  patientId: number;
  medicationId?: number;
}): Promise<{ data: MedicationAdministration[] }> =>
  apiClient
    .get<{ data: MedicationAdministration[] }>('/clinical/medication-administrations', { params })
    .then((r) => r.data);

export const recordAdministration = (
  req: RecordAdministrationRequest,
): Promise<MedicationAdministration> =>
  apiClient
    .post<{ data: MedicationAdministration }>('/clinical/medication-administrations', req)
    .then((r) => r.data.data);

// --- Physician Orders (GET/POST/PUT /api/v2/clinical/orders) ---
export interface PhysicianOrder {
  id: number;
  patientId: number;
  orderDate: string;
  orderType: string;
  orderText: string;
  orderedBy: string;
  frequency: string | null;
  isVerbal: boolean;
  signedBy: string | null;
  status: string;
}

export interface CreatePhysicianOrderRequest {
  patientId: number;
  orderType: string;
  orderText: string;
  orderedBy: string;
  orderDate: string;
  frequency?: string | null;
  isVerbal?: boolean;
  status?: string;
}

export type UpdatePhysicianOrderRequest = Partial<
  Omit<CreatePhysicianOrderRequest, 'patientId'>
>;

export const getOrders = (params?: {
  patientId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: PhysicianOrder[]; pagination?: PaginationMeta }> =>
  apiClient
    .get<{ data: PhysicianOrder[]; pagination?: PaginationMeta }>('/clinical/orders', { params })
    .then((r) => r.data);

export const createOrder = (req: CreatePhysicianOrderRequest): Promise<PhysicianOrder> =>
  apiClient
    .post<{ data: PhysicianOrder }>('/clinical/orders', req)
    .then((r) => r.data.data);

export const updateOrder = (
  id: number,
  req: UpdatePhysicianOrderRequest,
): Promise<PhysicianOrder> =>
  apiClient
    .put<{ data: PhysicianOrder }>(`/clinical/orders/${id}`, req)
    .then((r) => r.data.data);

export const signOrder = (id: number, signedBy: string): Promise<PhysicianOrder> =>
  apiClient
    .post<{ data: PhysicianOrder }>(`/clinical/orders/${id}/sign`, { signedBy })
    .then((r) => r.data.data);
