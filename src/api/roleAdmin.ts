import { apiClient } from './client';

export interface RoleSummary {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  permissionCount: number;
  userCount: number;
}

export interface RolePermissionRef {
  id: number;
  code: string;
  category: string;
  displayName: string;
}

export interface RoleDetail {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  permissions: RolePermissionRef[];
}

export interface PermissionCatalogEntry {
  id: number;
  code: string;
  displayName: string;
  description: string | null;
}

export interface PermissionCategory {
  category: string;
  permissions: PermissionCatalogEntry[];
}

export interface CreateRoleRequest {
  name: string;
  displayName?: string | null;
  description?: string | null;
  permissionIds?: number[];
}

export interface UpdateRoleRequest {
  displayName?: string | null;
  description?: string | null;
  permissionIds?: number[];
}

export const listRolesDetailed = (): Promise<{ data: RoleSummary[] }> =>
  apiClient.get<{ data: RoleSummary[] }>('/admin/roles').then((r) => r.data);

export const getRole = (id: number): Promise<{ data: RoleDetail }> =>
  apiClient.get<{ data: RoleDetail }>(`/admin/roles/${id}`).then((r) => r.data);

export const getPermissionCatalog = (): Promise<{ data: PermissionCategory[] }> =>
  apiClient.get<{ data: PermissionCategory[] }>('/admin/permissions').then((r) => r.data);

export const createRole = (req: CreateRoleRequest): Promise<unknown> =>
  apiClient.post('/admin/roles', req).then((r) => r.data);

export const updateRole = (id: number, req: UpdateRoleRequest): Promise<unknown> =>
  apiClient.put(`/admin/roles/${id}`, req).then((r) => r.data);

export const deleteRole = (id: number): Promise<unknown> =>
  apiClient.delete(`/admin/roles/${id}`).then((r) => r.data);
