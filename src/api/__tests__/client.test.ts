import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setAccessTokenProvider,
  _resetAccessTokenProviderForTests,
} from '@/auth/getAccessToken';
import { setDevClaims, clearDevClaims } from '@/auth/devLogin';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { default: actual.default };
});

function makeHeaders(): Record<string, string> & { set(name: string, value: string): void } {
  const store: Record<string, string> = {};
  const obj = {
    ...store,
    set(name: string, value: string) {
      (obj as unknown as Record<string, string>)[name] = value;
    },
  };
  return obj as unknown as Record<string, string> & { set(name: string, value: string): void };
}

describe('apiClient interceptors', () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
    sessionStorage.clear();
    _resetAccessTokenProviderForTests();
    vi.resetModules();
    // Default: SSO mode for these tests unless overridden
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('attaches Bearer token from getAccessToken in SSO mode', async () => {
    const { setAccessTokenProvider: setProvider } = await import('@/auth/getAccessToken');
    setProvider(() => 'b2c.access.tok');
    const { apiClient } = await import('@/api/client');
    const interceptors = (apiClient.interceptors.request as any).handlers;
    const mockConfig = { headers: makeHeaders() };
    const result = await interceptors[0].fulfilled(mockConfig);
    expect(result.headers['Authorization']).toBe('Bearer b2c.access.tok');
    expect(result.headers['X-Dev-Claims']).toBeUndefined();
  });

  it('does not attach Authorization header when getAccessToken returns null', async () => {
    const { setAccessTokenProvider: setProvider } = await import('@/auth/getAccessToken');
    setProvider(() => null);
    const { apiClient } = await import('@/api/client');
    const interceptors = (apiClient.interceptors.request as any).handlers;
    const mockConfig = { headers: makeHeaders() };
    const result = await interceptors[0].fulfilled(mockConfig);
    expect(result.headers['Authorization']).toBeUndefined();
  });

  it('sets X-Dev-Claims and omits Authorization in dev mode', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    setDevClaims({
      userId: 5,
      organizationId: 1,
      roles: ['billing_admin'],
      permissions: ['claims:view'],
    });
    const { apiClient } = await import('@/api/client');
    const interceptors = (apiClient.interceptors.request as any).handlers;
    const mockConfig = { headers: makeHeaders() };
    const result = await interceptors[0].fulfilled(mockConfig);
    expect(result.headers['X-Dev-Claims']).toBe(
      'userId=5;organizationId=1;rbac_role=billing_admin;permission=claims:view'
    );
    expect(result.headers['Authorization']).toBeUndefined();
  });

  it('dev mode with no dev claims set: no headers added', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    clearDevClaims();
    const { apiClient } = await import('@/api/client');
    const interceptors = (apiClient.interceptors.request as any).handlers;
    const mockConfig = { headers: makeHeaders() };
    const result = await interceptors[0].fulfilled(mockConfig);
    expect(result.headers['Authorization']).toBeUndefined();
    expect(result.headers['X-Dev-Claims']).toBeUndefined();
  });

  it('on 401 response redirects to /login?reason=expired', async () => {
    const { setAccessTokenProvider: setProvider } = await import('@/auth/getAccessToken');
    setProvider(() => 'some.tok');
    const { apiClient } = await import('@/api/client');
    const responseInterceptors = (apiClient.interceptors.response as any).handlers;
    const err = { response: { status: 401 } };
    try {
      await responseInterceptors[0].rejected(err);
    } catch {
      // expected to reject
    }
    expect(window.location.href).toBe('/login?reason=expired');
  });
});
