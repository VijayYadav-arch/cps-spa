import { apiClient } from './client';

// --- Organizations (GET /api/v2/organizations) ---
export interface Organization {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

// --- Users (GET /api/v2/admin/users) ---
export interface UserSummary {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: number | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// GET /api/v2/organizations?page=&pageSize=
export const getOrganizations = (params?: {
  page?: number;
  pageSize?: number;
}): Promise<{ data: Organization[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: Organization[]; pagination: PaginationMeta }>('/organizations', { params })
    .then((r) => r.data);

// GET /api/v2/admin/users?page=&pageSize=
export const getUsers = (params?: {
  page?: number;
  pageSize?: number;
}): Promise<{ data: UserSummary[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: UserSummary[]; pagination: PaginationMeta }>('/admin/users', { params })
    .then((r) => r.data);
