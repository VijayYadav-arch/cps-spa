import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setDevClaims,
  getDevClaims,
  clearDevClaims,
  serializeDevClaims,
  DEV_CLAIMS_EVENT,
  type DevClaims,
} from '@/auth/devLogin';

describe('devLogin', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  const sample: DevClaims = {
    userId: 1,
    organizationId: 2,
    roles: ['system_admin'],
    permissions: ['platform:dashboard'],
  };

  it('setDevClaims writes to sessionStorage', () => {
    setDevClaims(sample);
    const stored = sessionStorage.getItem('cps_dev_claims');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual(sample);
  });

  it('setDevClaims dispatches cps:dev-claims-changed event with the claims', () => {
    const handler = vi.fn();
    window.addEventListener(DEV_CLAIMS_EVENT, handler);
    setDevClaims(sample);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual(sample);
    window.removeEventListener(DEV_CLAIMS_EVENT, handler);
  });

  it('getDevClaims returns parsed claims when set', () => {
    setDevClaims(sample);
    expect(getDevClaims()).toEqual(sample);
  });

  it('getDevClaims returns null when nothing is stored', () => {
    expect(getDevClaims()).toBeNull();
  });

  it('getDevClaims returns null and does not throw on malformed JSON', () => {
    sessionStorage.setItem('cps_dev_claims', '{not json}');
    expect(getDevClaims()).toBeNull();
  });

  it('clearDevClaims removes the sessionStorage entry', () => {
    setDevClaims(sample);
    clearDevClaims();
    expect(sessionStorage.getItem('cps_dev_claims')).toBeNull();
  });

  it('clearDevClaims dispatches cps:dev-claims-changed with null', () => {
    setDevClaims(sample);
    const handler = vi.fn();
    window.addEventListener(DEV_CLAIMS_EVENT, handler);
    clearDevClaims();
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toBeNull();
    window.removeEventListener(DEV_CLAIMS_EVENT, handler);
  });

  it('serializeDevClaims produces backend X-Dev-Claims format', () => {
    expect(serializeDevClaims(sample)).toBe(
      'userId=1;organizationId=2;rbac_role=system_admin;permission=platform:dashboard'
    );
  });

  it('serializeDevClaims handles multiple roles and permissions', () => {
    expect(
      serializeDevClaims({
        userId: 1,
        organizationId: 2,
        roles: ['system_admin', 'billing_admin'],
        permissions: ['p1', 'p2'],
      })
    ).toBe(
      'userId=1;organizationId=2;rbac_role=system_admin;rbac_role=billing_admin;permission=p1;permission=p2'
    );
  });

  it('serializeDevClaims omits organizationId when undefined', () => {
    expect(
      serializeDevClaims({
        userId: 1,
        roles: ['clinician'],
        permissions: [],
      })
    ).toBe('userId=1;rbac_role=clinician');
  });
});
