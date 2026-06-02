import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { PortalAuthProvider, usePortalAuth } from '@/portal/PortalAuthContext';

// Helper: build a fake FamilyJwt token with the right claim shape.
// PortalAuthContext.loginAsFamily decodes the JWT payload to extract
// `sub` (familyAccessId) and `patient_id` (patientId).
function makeFakeFamilyJwt(opts: { familyAccessId: number; patientId: number; expiresInSec?: number }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: String(opts.familyAccessId),
    patient_id: String(opts.patientId),
    exp: Math.floor(Date.now() / 1000) + (opts.expiresInSec ?? 8 * 3600),
    role: 'patient_family_member',
  };
  const base64url = (s: string) =>
    btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}.fake-signature`;
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  // Avoid window.location.href reassignment errors in jsdom — logout sets it.
  Object.defineProperty(window, 'location', {
    value: { href: '/portal', pathname: '/portal' },
    writable: true,
  });
});

afterEach(() => {
  sessionStorage.clear();
});

describe('PortalAuthContext family-member flow', () => {
  it('loginAsFamily stores token under cps-family-token and sets session.kind', async () => {
    const token = makeFakeFamilyJwt({ familyAccessId: 7, patientId: 42 });
    const expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token, expiresAt }),
    });

    const { result } = renderHook(() => usePortalAuth(), {
      wrapper: ({ children }) => <PortalAuthProvider>{children}</PortalAuthProvider>,
    });

    await act(async () => {
      await result.current.loginAsFamily(42, '1234');
    });

    expect(sessionStorage.getItem('cps-family-token')).toBe(token);
    expect(sessionStorage.getItem('cps-family-patient-id')).toBe('42');
    expect(sessionStorage.getItem('cps-family-access-id')).toBe('7');
    expect(result.current.session?.kind).toBe('family-member');
    expect(result.current.session?.patientId).toBe(42);
    expect(result.current.session?.familyAccessId).toBe(7);
  });

  it('loginAsFamily throws "Invalid patient ID or PIN" on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    const { result } = renderHook(() => usePortalAuth(), {
      wrapper: ({ children }) => <PortalAuthProvider>{children}</PortalAuthProvider>,
    });

    await expect(
      act(() => result.current.loginAsFamily(42, 'wrong-pin'))
    ).rejects.toThrow('Invalid patient ID or PIN');
    expect(sessionStorage.getItem('cps-family-token')).toBeNull();
  });

  it('loginAsFamily throws rate-limit message on 429', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 });

    const { result } = renderHook(() => usePortalAuth(), {
      wrapper: ({ children }) => <PortalAuthProvider>{children}</PortalAuthProvider>,
    });

    await expect(
      act(() => result.current.loginAsFamily(42, '1234'))
    ).rejects.toThrow(/Too many attempts/i);
  });

  it('logout clears family-specific sessionStorage keys when session.kind is family-member', async () => {
    const token = makeFakeFamilyJwt({ familyAccessId: 7, patientId: 42 });
    sessionStorage.setItem('cps-family-token', token);
    sessionStorage.setItem('cps-family-expires-at', String(Date.now() + 3600_000));
    sessionStorage.setItem('cps-family-patient-id', '42');
    sessionStorage.setItem('cps-family-access-id', '7');
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });

    const { result } = renderHook(() => usePortalAuth(), {
      wrapper: ({ children }) => <PortalAuthProvider>{children}</PortalAuthProvider>,
    });

    // Session should be initialized from sessionStorage on mount.
    await waitFor(() => expect(result.current.session?.kind).toBe('family-member'));

    await act(async () => {
      result.current.logout();
    });

    expect(sessionStorage.getItem('cps-family-token')).toBeNull();
    expect(sessionStorage.getItem('cps-family-expires-at')).toBeNull();
    expect(sessionStorage.getItem('cps-family-patient-id')).toBeNull();
    expect(sessionStorage.getItem('cps-family-access-id')).toBeNull();
    expect(result.current.session).toBeNull();
  });
});
