import { apiClient } from './client';

export interface B2cOrgStatus {
  orgId: number;
  orgName: string;
  slug: string;
  b2CMigrated: boolean;
  b2CMigratedAt: string | null;
  totalUsers: number;
  activeUsers: number;
}

export interface B2cMigrateResult {
  invited: number;
  skipped: number;
  failed: number;
}

export const listB2cOrganizations = (): Promise<B2cOrgStatus[]> =>
  apiClient
    .get<{ data: B2cOrgStatus[] }>('/admin/b2c-migration/organizations')
    .then((r) => r.data.data);

export const migrateOrgToB2c = (orgId: number): Promise<B2cMigrateResult> =>
  apiClient
    .post<B2cMigrateResult>(`/admin/b2c-migration/${orgId}/migrate`)
    .then((r) => r.data);
