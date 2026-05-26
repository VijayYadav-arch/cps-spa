import { MalformedTokenError } from './errors';

export interface UserInfo {
  userId: number;
  organizationId?: number;
  roles: string[];
}

/**
 * Parses a JWT payload into the SPA's UserInfo shape. Works for both B2C
 * tokens (claims prefixed with `extension_`) and CPS-native tokens (no
 * prefix). Throws MalformedTokenError on any parse failure.
 *
 * Does NOT verify the signature — that's the backend's responsibility.
 * This is purely for reading the SPA's local view of the user's identity.
 */
export function parseCpsClaims(token: string): UserInfo {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new MalformedTokenError('Token is not a three-part JWT');
  }

  let payload: Record<string, unknown>;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    payload = JSON.parse(atob(padded));
  } catch {
    throw new MalformedTokenError('Token payload is not valid base64-encoded JSON');
  }

  const userIdRaw = pickFirst(payload, ['extension_userId', 'userId']);
  if (userIdRaw == null) {
    throw new MalformedTokenError('Missing userId claim');
  }
  const userId = Number(userIdRaw);
  if (Number.isNaN(userId)) {
    throw new MalformedTokenError('userId claim is not numeric');
  }

  const orgIdRaw = pickFirst(payload, ['extension_organizationId', 'organizationId']);
  const organizationId = orgIdRaw != null ? Number(orgIdRaw) : undefined;

  const rolesRaw = pickFirst(payload, ['extension_rbac_role', 'rbac_role']);
  return { userId, organizationId, roles: normalizeRoles(rolesRaw) };
}

function pickFirst(payload: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in payload && payload[k] != null) return payload[k];
  }
  return undefined;
}

function normalizeRoles(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((r): r is string => typeof r === 'string');
  }
  if (typeof raw === 'string') {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}
