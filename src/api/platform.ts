import { apiClient } from './client';

// --- API Keys (GET /api/v2/api-keys) ---
export interface ApiKey {
  id: number;
  prefix: string;
  name: string;
  scope: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

// --- Webhooks (GET /api/v2/webhooks) ---
export interface Webhook {
  id: number;
  organizationId: number;
  url: string;
  events: string;
  isActive: boolean;
}

// --- Audit Events (GET /api/v2/audit) ---
export interface AuditEvent {
  id: number;
  eventType: string;
  description: string;
  userId: number;
  userEmail: string;
  resourceType: string | null;
  resourceId: number | null;
  organizationId: number | null;
  result: string;
  ipAddress: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// GET /api/v2/api-keys?page=&pageSize=
export const getApiKeys = (params?: {
  page?: number;
  pageSize?: number;
}): Promise<{ data: ApiKey[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: ApiKey[]; pagination: PaginationMeta }>('/api-keys', { params })
    .then((r) => r.data);

// DELETE /api/v2/api-keys/{id}
export const revokeApiKey = (id: number): Promise<void> =>
  apiClient
    .delete(`/api-keys/${id}`)
    .then(() => undefined);

// GET /api/v2/webhooks?page=&pageSize=
export const getWebhooks = (params?: {
  page?: number;
  pageSize?: number;
}): Promise<{ data: Webhook[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: Webhook[]; pagination: PaginationMeta }>('/webhooks', { params })
    .then((r) => r.data);

// GET /api/v2/audit?startDate=&endDate=&page=&pageSize=
export const getAuditEvents = (params?: {
  startDate?: string;
  endDate?: string;
  userId?: number;
  resourceType?: string;
  eventType?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: AuditEvent[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: AuditEvent[]; pagination: PaginationMeta }>('/audit', { params })
    .then((r) => r.data);
