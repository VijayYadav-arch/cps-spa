import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { default: actual.default };
});

/** Minimal headers stub that mimics AxiosHeaders for testing purposes. */
function makeHeaders(): Record<string, string> & { set(name: string, value: string): void } {
  const store: Record<string, string> = {};
  return {
    ...store,
    set(name: string, value: string) {
      (this as Record<string, string>)[name] = value;
    },
  };
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
    vi.resetModules();
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

  it('attaches Bearer token from sessionStorage when token is present', async () => {
    sessionStorage.setItem('cps_token', 'test.jwt.token');
    const { apiClient } = await import('@/api/client');

    const interceptors = (apiClient.interceptors.request as any).handlers;
    expect(interceptors.length).toBeGreaterThan(0);

    const mockConfig = { headers: makeHeaders() };
    const result = interceptors[0].fulfilled(mockConfig);
    expect(result.headers['Authorization']).toBe('Bearer test.jwt.token');
    expect(window.location.href).toBe('');
  });

  it('does not attach Authorization header when no token in sessionStorage', async () => {
    const { apiClient } = await import('@/api/client');
    const interceptors = (apiClient.interceptors.request as any).handlers;
    const mockConfig = { headers: makeHeaders() };
    const result = interceptors[0].fulfilled(mockConfig);
    expect(result.headers['Authorization']).toBeUndefined();
  });

  it('on 401 response clears sessionStorage and redirects to /login', async () => {
    // Seed a token so we can verify removal
    sessionStorage.setItem('cps_token', 'some.token');

    const { apiClient } = await import('@/api/client');
    const responseInterceptors = (apiClient.interceptors.response as any).handlers;
    expect(responseInterceptors.length).toBeGreaterThan(0);

    const err = { response: { status: 401 } };
    try {
      await responseInterceptors[0].rejected(err);
    } catch {
      // expected to reject
    }

    // Verify the token was removed and redirect was set
    expect(sessionStorage.getItem('cps_token')).toBeNull();
    expect(window.location.href).toBe('/login');
  });
});
