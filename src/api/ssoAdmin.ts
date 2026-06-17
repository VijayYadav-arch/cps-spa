import { apiClient } from './client';

export interface SsoConfig {
  id: number;
  organizationId: number;
  provider: string; // "saml" | "oidc"
  entityId: string | null;
  ssoUrl: string | null;
  certificate: string | null;
  clientId: string | null;
  clientSecret: string; // masked "***" on read
  issuer: string | null;
  scopes: string | null;
  enforceSso: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SsoConfigRequest {
  provider: string;
  entityId?: string | null;
  ssoUrl?: string | null;
  certificate?: string | null;
  clientId?: string | null;
  clientSecret?: string | null; // omit/empty to keep existing
  issuer?: string | null;
  scopes?: string | null;
  enforceSso: boolean;
}

// Returns null on 404 (no config yet for that org).
export const getSsoConfig = (orgId: number): Promise<SsoConfig | null> =>
  apiClient
    .get<{ data: SsoConfig }>(`/auth/sso/config/${orgId}`)
    .then((r) => r.data.data)
    .catch((e: { response?: { status?: number } }) => {
      if (e.response?.status === 404) return null;
      throw e;
    });

export const upsertSsoConfig = (orgId: number, req: SsoConfigRequest): Promise<unknown> =>
  apiClient.put(`/auth/sso/config/${orgId}`, req).then((r) => r.data);

export const deleteSsoConfig = (orgId: number): Promise<unknown> =>
  apiClient.delete(`/auth/sso/config/${orgId}`).then((r) => r.data);

// The raw SCIM bearer token is returned ONCE.
export const generateScimToken = (orgId: number): Promise<{ token: string }> =>
  apiClient
    .post<{ data: { token: string } }>(`/auth/sso/config/${orgId}/scim-token`, {})
    .then((r) => r.data.data);

export const revokeScimToken = (orgId: number): Promise<unknown> =>
  apiClient.delete(`/auth/sso/config/${orgId}/scim-token`).then((r) => r.data);
