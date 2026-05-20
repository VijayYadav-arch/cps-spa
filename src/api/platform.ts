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
  patientId: number | null;
  organizationId: number | null;
  result: string;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditSearchParams {
  startDate?: string;
  endDate?: string;
  userId?: number;
  userEmail?: string;
  patientId?: number;
  resourceType?: string;
  resourceId?: number;
  eventType?: string;
  result?: string;
  ipAddress?: string;
  q?: string;
  page?: number;
  pageSize?: number;
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

// GET /api/v2/audit?startDate=&endDate=&page=&pageSize=&...
export const getAuditEvents = (
  params?: AuditSearchParams,
): Promise<{ data: AuditEvent[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: AuditEvent[]; pagination: PaginationMeta }>('/audit', { params })
    .then((r) => r.data);

/**
 * Builds the download URL for the audit-log CSV export. Hands the browser
 * the URL rather than fetching with axios — lets the native file-download
 * flow handle the streaming body (a 50k-row blob would otherwise sit in
 * SPA memory before any UI feedback).
 */
export const auditExportUrl = (params?: AuditSearchParams): string => {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
  }
  const query = qs.toString();
  return `/api/v2/audit/export${query ? `?${query}` : ''}`;
};
