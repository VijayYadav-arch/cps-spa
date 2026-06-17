import { apiClient } from './client';

export interface AdminRoleRef {
  id: number;
  name: string;
  displayName: string;
}

export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: number | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: AdminRoleRef[];
}

export interface AdminRole {
  id: number;
  name: string;
  displayName: string;
  permissionCount: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

export interface CreateUserRequest {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roleIds?: number[];
}

export interface UpdateUserRequest {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  active?: boolean;
}

export const listUsers = (page = 1, pageSize = 50): Promise<Paginated<AdminUser>> =>
  apiClient
    .get<Paginated<AdminUser>>('/admin/users', { params: { page, pageSize } })
    .then((r) => r.data);

// Role catalog — gated admin:manage_roles. Best-effort: a manage_users-only admin
// gets 403 and the caller degrades to no role options.
export const listRoles = (): Promise<{ data: AdminRole[] }> =>
  apiClient.get<{ data: AdminRole[] }>('/admin/roles').then((r) => r.data);

export const createUser = (req: CreateUserRequest): Promise<unknown> =>
  apiClient.post('/admin/users', req).then((r) => r.data);

export const updateUser = (id: number, req: UpdateUserRequest): Promise<unknown> =>
  apiClient.put(`/admin/users/${id}`, req).then((r) => r.data);

export const assignUserRoles = (id: number, roleIds: number[]): Promise<unknown> =>
  apiClient.put(`/admin/users/${id}/roles`, { roleIds }).then((r) => r.data);
