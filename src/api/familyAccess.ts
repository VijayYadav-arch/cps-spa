import { apiClient } from './client';

export interface FamilyGrantee {
  id: number;
  relationshipLabel: string;
  email: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  pinExpiry: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ProvisionFamilyAccessRequest {
  relationshipLabel: string;
  email?: string | null;
  phoneNumber?: string | null;
}

// The plaintext PIN is returned ONCE on provision/rotate — surface it immediately,
// it cannot be retrieved later.
export interface FamilyProvisionResult {
  familyAccessId: number;
  patientId: number;
  pin: string;
  pinExpiry: string;
}

export const listFamilyAccess = (patientId: number): Promise<{ data: FamilyGrantee[] }> =>
  apiClient
    .get<{ data: FamilyGrantee[] }>(`/patients/${patientId}/family-access`)
    .then((r) => r.data);

export const provisionFamilyAccess = (
  patientId: number,
  req: ProvisionFamilyAccessRequest,
): Promise<FamilyProvisionResult> =>
  apiClient
    .post<{ data: FamilyProvisionResult }>(`/patients/${patientId}/family-access`, req)
    .then((r) => r.data.data);

export const rotateFamilyPin = (
  patientId: number,
  familyAccessId: number,
): Promise<FamilyProvisionResult> =>
  apiClient
    .post<{ data: FamilyProvisionResult }>(
      `/patients/${patientId}/family-access/${familyAccessId}/rotate-pin`,
      {},
    )
    .then((r) => r.data.data);
