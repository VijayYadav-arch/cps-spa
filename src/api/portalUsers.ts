import { apiClient } from './client';

export interface PortalUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  lastLoginAt: string | null;
  roles: { name: string; displayName: string }[];
}

export interface InvitePortalUserRequest {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roleName: string;
}

export const listPortalUsers = (): Promise<{ data: PortalUser[]; assignableRoles: string[] }> =>
  apiClient
    .get<{ data: PortalUser[]; assignableRoles: string[] }>('/portal/users')
    .then((r) => r.data);

export const invitePortalUser = (req: InvitePortalUserRequest): Promise<unknown> =>
  apiClient.post('/portal/users', req).then((r) => r.data);

export const setPortalUserActive = (id: number, active: boolean): Promise<unknown> =>
  apiClient.put(`/portal/users/${id}/active`, { active }).then((r) => r.data);
