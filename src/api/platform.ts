import { apiClient } from './client';

// --- Audit-log retention purge (POST /api/v2/admin/audit-retention/purge) ---
export interface AuditRetentionResult {
  organizationId: number;
  retentionYearsApplied: number;
  cutoffUtc: string;
  rowsDeleted: number;
  clampedToFloor: boolean;
}

export const purgeAuditRetention = (retentionYears: number): Promise<AuditRetentionResult> =>
  apiClient
    .post<{ data: AuditRetentionResult }>('/admin/audit-retention/purge', { retentionYears })
    .then((r) => r.data.data);

// --- Background-job health (GET /api/v2/platform/background-jobs) ---
export interface BackgroundJobTick {
  name: string;
  displayName: string;
  lastRanAtUtc: string;
  intervalSeconds: number;
  summary: string;
  lastError: string | null;
  lastErrorAtUtc: string | null;
  secondsSinceLastRun: number;
  stale: boolean;
}

export const getBackgroundJobs = (): Promise<{ data: BackgroundJobTick[]; asOfUtc: string }> =>
  apiClient
    .get<{ data: BackgroundJobTick[]; asOfUtc: string }>('/platform/background-jobs')
    .then((r) => r.data);

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

export interface CreateApiKeyRequest {
  name: string;
  scope: string;
  expiresAt?: string | null;
}

/**
 * The full key is returned EXACTLY ONCE in the create response — the
 * server stores only a hash. Callers must surface it to the user before
 * navigating away; it can't be retrieved later.
 */
export interface ApiKeyCreateResponse {
  id: number;
  prefix: string;
  name: string;
  scope: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  fullKey: string;
}

export const createApiKey = (req: CreateApiKeyRequest): Promise<ApiKeyCreateResponse> =>
  apiClient
    .post<{ data: ApiKeyCreateResponse }>('/api-keys', req)
    .then((r) => r.data.data);

// GET /api/v2/webhooks?page=&pageSize=
export const getWebhooks = (params?: {
  page?: number;
  pageSize?: number;
}): Promise<{ data: Webhook[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: Webhook[]; pagination: PaginationMeta }>('/webhooks', { params })
    .then((r) => r.data);

export interface CreateWebhookRequest {
  organizationId: number;
  url: string;
  events: string[];
}

export interface WebhookCreateResponse {
  id: number;
  url: string;
  /** Returned ONCE — signing secret the partner needs to verify deliveries. */
  secret: string;
  events: string;
}

export const createWebhook = (req: CreateWebhookRequest): Promise<WebhookCreateResponse> =>
  apiClient
    .post<{ data: WebhookCreateResponse }>('/webhooks', req)
    .then((r) => r.data.data);

export const deleteWebhook = (id: number): Promise<void> =>
  apiClient.delete(`/webhooks/${id}`).then(() => undefined);

export interface TestWebhookResponse {
  payload: string;
  signature: string;
}

/** Returns a sample payload + signature for the partner's URL to verify. */
export const testWebhookSignature = (secret: string): Promise<TestWebhookResponse> =>
  apiClient
    .post<TestWebhookResponse>('/webhooks/test', { secret })
    .then((r) => r.data);

export interface WebhookDeliveryAttempt {
  id: number;
  webhookEndpointId: number;
  eventType: string;
  payload: string;
  responseStatus: number | null;
  responseBody: string | null;
  attemptedAt: string;
  durationMs: number | null;
  succeeded: boolean;
  errorMessage: string | null;
}

export const getWebhookDeliveries = (
  id: number, limit = 50,
): Promise<{ data: WebhookDeliveryAttempt[] }> =>
  apiClient
    .get<{ data: WebhookDeliveryAttempt[] }>(`/webhooks/${id}/deliveries`, {
      params: { limit },
    })
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
