import { apiClient } from './client';

// --- Active sessions (refresh tokens) ---

export interface SessionRow {
  id: number;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  isActive: boolean;
}

export const getMySessions = (): Promise<{ data: SessionRow[] }> =>
  apiClient
    .get<{ data: SessionRow[] }>('/me/sessions')
    .then((r) => r.data);

export const revokeMySession = (id: number): Promise<void> =>
  apiClient
    .delete(`/me/sessions/${id}`)
    .then(() => undefined);

export const revokeAllOtherSessions = (
  exceptTokenId?: number | null,
): Promise<{ data: { revoked: number } }> =>
  apiClient
    .post<{ data: { revoked: number } }>('/me/sessions/revoke-all-others', null, {
      params: exceptTokenId ? { except: exceptTokenId } : {},
    })
    .then((r) => r.data);
