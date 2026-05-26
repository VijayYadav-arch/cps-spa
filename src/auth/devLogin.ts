/**
 * Dev-only identity manager. When the SPA is in dev mode (useDevAuth()),
 * AuthContext reads dev claims from this module and apiClient sends them
 * as the X-Dev-Claims header on every request. The backend's
 * DevBypassAuthHandler reads the header to authenticate the request.
 *
 * Production builds tree-shake this module via `import.meta.env.PROD`
 * guards in callers — there's no runtime path in prod that would set
 * or read dev claims.
 */

export interface DevClaims {
  userId: number;
  organizationId?: number;
  roles: string[];
  permissions: string[];
}

const STORAGE_KEY = 'cps_dev_claims';
export const DEV_CLAIMS_EVENT = 'cps:dev-claims-changed';

export function setDevClaims(claims: DevClaims): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  dispatch(claims);
}

export function getDevClaims(): DevClaims | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DevClaims;
  } catch {
    return null;
  }
}

export function clearDevClaims(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  dispatch(null);
}

/**
 * Serialize DevClaims into the wire format DevBypassAuthHandler expects.
 * Matches the parser at cps-dotnet/src/CPS.Api/Authentication/DevBypassAuthHandler.cs:49-56:
 *
 *     userId=1;organizationId=2;rbac_role=system_admin;permission=platform:dashboard
 *
 * Repeat-keyed entries (rbac_role, permission) are supported by the
 * backend — every claim is added individually.
 */
export function serializeDevClaims(claims: DevClaims): string {
  const parts: string[] = [`userId=${claims.userId}`];
  if (claims.organizationId !== undefined) {
    parts.push(`organizationId=${claims.organizationId}`);
  }
  for (const role of claims.roles) parts.push(`rbac_role=${role}`);
  for (const perm of claims.permissions) parts.push(`permission=${perm}`);
  return parts.join(';');
}

function dispatch(detail: DevClaims | null): void {
  window.dispatchEvent(new CustomEvent(DEV_CLAIMS_EVENT, { detail }));
}
