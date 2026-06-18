import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { portalLogin, portalMe, type PortalMe } from './portalApi';

export type PortalKind = 'patient-self-service' | 'family-member';

export interface PortalSession {
  kind: PortalKind;
  token: string;
  expiresAt: number; // unix ms
  patientId: number;
  familyAccessId?: number; // family-member only
}

interface PortalAuthState {
  // Existing API — preserved for external consumers (PortalLayout,
  // PortalProtectedRoute, PortalOverview, PortalLogin, etc.).
  me: PortalMe | null;
  loading: boolean;
  login: (patientId: number, pin: string) => Promise<void>;
  logout: () => void;
  // New API introduced in P4-B T11 for family-member parity.
  session: PortalSession | null;
  loginAsFamily: (patientId: number, pin: string) => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthState | null>(null);

// sessionStorage keys
const PATIENT_TOKEN_KEY = 'cps_portal_token';
const PATIENT_ID_KEY = 'cps_portal_patient_id';
const PATIENT_EXPIRES_AT_KEY = 'cps_portal_expires_at';

const FAMILY_TOKEN_KEY = 'cps-family-token';
const FAMILY_EXPIRES_AT_KEY = 'cps-family-expires-at';
const FAMILY_PATIENT_ID_KEY = 'cps-family-patient-id';
const FAMILY_ACCESS_ID_KEY = 'cps-family-access-id';

/**
 * Best-effort decode of a JWT payload. Does NOT verify the signature —
 * verification happens server-side on subsequent requests. Used only to
 * extract `sub` / `patient_id` from the family JWT after login, since the
 * family auth endpoint returns only { token, expiresAt }.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function clearFamilyStorage(): void {
  sessionStorage.removeItem(FAMILY_TOKEN_KEY);
  sessionStorage.removeItem(FAMILY_EXPIRES_AT_KEY);
  sessionStorage.removeItem(FAMILY_PATIENT_ID_KEY);
  sessionStorage.removeItem(FAMILY_ACCESS_ID_KEY);
}

function clearPatientStorage(): void {
  sessionStorage.removeItem(PATIENT_TOKEN_KEY);
  sessionStorage.removeItem(PATIENT_ID_KEY);
  sessionStorage.removeItem(PATIENT_EXPIRES_AT_KEY);
}

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<PortalMe | null>(null);
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Mount: hydrate session from sessionStorage. Try family token first,
  // then fall back to the existing patient-self-service flow (token + /me).
  useEffect(() => {
    const familyToken = sessionStorage.getItem(FAMILY_TOKEN_KEY);
    if (familyToken) {
      const expiresAt = Number(sessionStorage.getItem(FAMILY_EXPIRES_AT_KEY) ?? '0');
      if (expiresAt > Date.now()) {
        setSession({
          kind: 'family-member',
          token: familyToken,
          expiresAt,
          patientId: Number(sessionStorage.getItem(FAMILY_PATIENT_ID_KEY) ?? '0'),
          familyAccessId: Number(sessionStorage.getItem(FAMILY_ACCESS_ID_KEY) ?? '0'),
        });
        setLoading(false);
        return;
      }
      clearFamilyStorage();
    }

    // Existing patient-self-service hydration: token -> /me
    const token = sessionStorage.getItem(PATIENT_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    portalMe()
      .then((meData) => {
        setMe(meData);
        const storedExpires = Number(sessionStorage.getItem(PATIENT_EXPIRES_AT_KEY) ?? '0');
        setSession({
          kind: 'patient-self-service',
          token,
          expiresAt: storedExpires > 0 ? storedExpires : Date.now() + 8 * 60 * 60 * 1000,
          patientId: meData.patientId,
        });
      })
      .catch(() => {
        clearPatientStorage();
      })
      .finally(() => setLoading(false));
  }, []);

  // Cross-tab logout sync: if another tab removes either token,
  // drop the matching session here.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === FAMILY_TOKEN_KEY && e.newValue === null) {
        setSession((cur) => (cur?.kind === 'family-member' ? null : cur));
      }
      if (e.key === PATIENT_TOKEN_KEY && e.newValue === null) {
        setMe(null);
        setSession((cur) => (cur?.kind === 'patient-self-service' ? null : cur));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Existing patient-self-service login — preserved verbatim except for
  // additionally hydrating the new `session` field.
  const login = useCallback(async (patientId: number, pin: string) => {
    const res = await portalLogin({ patientId, pin });
    sessionStorage.setItem(PATIENT_TOKEN_KEY, res.token);
    sessionStorage.setItem(PATIENT_ID_KEY, String(patientId));
    const expiresAtMs = new Date(res.expiresAt).getTime();
    sessionStorage.setItem(PATIENT_EXPIRES_AT_KEY, String(expiresAtMs));
    const meData = await portalMe();
    setMe(meData);
    setSession({
      kind: 'patient-self-service',
      token: res.token,
      expiresAt: expiresAtMs,
      patientId: meData.patientId,
    });
  }, []);

  // New family-member login (P4-B T11). Endpoint contract verified against
  // cps-dotnet FamilyAuthController: returns only { token, expiresAt }.
  // We decode the JWT to extract patientId (claim: "patient_id") and
  // familyAccessId (claim: "sub").
  const loginAsFamily = useCallback(async (patientId: number, pin: string): Promise<void> => {
    const res = await fetch('/family-api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, pin }),
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid patient ID or PIN');
      if (res.status === 429) throw new Error('Too many attempts. Please try again later.');
      throw new Error(`Family login failed: ${res.status}`);
    }
    const data = (await res.json()) as { token: string; expiresAt: string };
    const expiresAtMs = new Date(data.expiresAt).getTime();

    // Extract familyAccessId + patientId from JWT claims since the endpoint
    // returns only token+expiresAt.
    const claims = decodeJwtPayload(data.token) ?? {};
    const familyAccessId = Number(claims['sub'] ?? 0);
    const claimPatientId = Number(claims['patient_id'] ?? patientId);

    sessionStorage.setItem(FAMILY_TOKEN_KEY, data.token);
    sessionStorage.setItem(FAMILY_EXPIRES_AT_KEY, String(expiresAtMs));
    sessionStorage.setItem(FAMILY_PATIENT_ID_KEY, String(claimPatientId));
    sessionStorage.setItem(FAMILY_ACCESS_ID_KEY, String(familyAccessId));

    setSession({
      kind: 'family-member',
      token: data.token,
      expiresAt: expiresAtMs,
      patientId: claimPatientId,
      familyAccessId,
    });
  }, []);

  // Logout: clear the keys for the active kind. Best-effort server-side
  // revocation via /api/auth/logout (introduced in R-014g.4). Falls back
  // to clearing both kinds when no session is set.
  const logout = useCallback(() => {
    const current = session;

    if (current) {
      // Best-effort server-side revocation; swallow network errors.
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${current.token}` },
      }).catch(() => {
        /* ignore */
      });
    }

    const isFamily = current?.kind === 'family-member';
    if (isFamily) {
      clearFamilyStorage();
    } else {
      // Default to patient-self-service cleanup (covers null-session case too,
      // matching the prior behavior where logout was idempotent).
      clearPatientStorage();
    }

    setMe(null);
    setSession(null);
    // Family members live under /family/* and have no /portal account, so
    // send them back to their own login rather than the patient portal.
    window.location.href = isFamily ? '/family/login' : '/portal/login';
  }, [session]);

  const value = useMemo<PortalAuthState>(
    () => ({ me, loading, login, logout, session, loginAsFamily }),
    [me, loading, login, logout, session, loginAsFamily],
  );

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}

export function usePortalAuth(): PortalAuthState {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error('usePortalAuth must be used inside PortalAuthProvider');
  return ctx;
}
