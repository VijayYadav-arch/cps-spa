import { describe, it, expect } from 'vitest';
import { parseCpsClaims } from '@/auth/claims';
import { MalformedTokenError } from '@/auth/errors';

/** Build a minimal JWT with a custom payload. Signature is fake. */
function makeJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

describe('parseCpsClaims', () => {
  it('extracts userId, organizationId, and roles from B2C extension claims', () => {
    const token = makeJwt({
      extension_userId: '42',
      extension_organizationId: '7',
      extension_rbac_role: 'billing_admin',
    });
    expect(parseCpsClaims(token)).toEqual({
      userId: 42,
      organizationId: 7,
      roles: ['billing_admin'],
    });
  });

  it('extracts from CPS-native claim names as fallback', () => {
    const token = makeJwt({
      userId: 99,
      organizationId: 5,
      rbac_role: 'clinician',
    });
    expect(parseCpsClaims(token)).toEqual({
      userId: 99,
      organizationId: 5,
      roles: ['clinician'],
    });
  });

  it('handles rbac_role as a string[] (multi-role users)', () => {
    const token = makeJwt({
      extension_userId: '1',
      extension_rbac_role: ['billing_admin', 'system_admin'],
    });
    expect(parseCpsClaims(token).roles).toEqual(['billing_admin', 'system_admin']);
  });

  it('handles comma-separated rbac_role string', () => {
    const token = makeJwt({
      extension_userId: '1',
      extension_rbac_role: 'billing_admin,system_admin',
    });
    expect(parseCpsClaims(token).roles).toEqual(['billing_admin', 'system_admin']);
  });

  it('returns roles = [] when no rbac_role claim is present', () => {
    const token = makeJwt({ extension_userId: '1' });
    expect(parseCpsClaims(token).roles).toEqual([]);
  });

  it('omits organizationId when claim is missing', () => {
    const token = makeJwt({ extension_userId: '1' });
    const result = parseCpsClaims(token);
    expect(result.organizationId).toBeUndefined();
  });

  it('throws MalformedTokenError when userId claim is missing', () => {
    const token = makeJwt({ extension_organizationId: '7' });
    expect(() => parseCpsClaims(token)).toThrow(MalformedTokenError);
  });

  it('throws MalformedTokenError when userId is non-numeric', () => {
    const token = makeJwt({ extension_userId: 'not-a-number' });
    expect(() => parseCpsClaims(token)).toThrow(MalformedTokenError);
  });

  it('throws MalformedTokenError on malformed JWT (not three parts)', () => {
    expect(() => parseCpsClaims('not.a.valid.jwt.string')).toThrow(MalformedTokenError);
  });

  it('throws MalformedTokenError when payload is not valid JSON', () => {
    const garbage = `header.${btoa('not json at all')}.sig`;
    expect(() => parseCpsClaims(garbage)).toThrow(MalformedTokenError);
  });
});
