import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { default: actual.default };
});

describe('apiClient interceptors', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('attaches Bearer token from sessionStorage when token is present', async () => {
    sessionStorage.setItem('cps_token', 'test.jwt.token');
    const { apiClient } = await import('@/api/client');

    const interceptors = (apiClient.interceptors.request as any).handlers;
    expect(interceptors.length).toBeGreaterThan(0);

    const mockConfig = { headers: {} as Record<string, string> };
    const result = interceptors[0].fulfilled(mockConfig);
    expect(result.headers['Authorization']).toBe('Bearer test.jwt.token');
  });

  it('does not attach Authorization header when no token in sessionStorage', async () => {
    const { apiClient } = await import('@/api/client');
    const interceptors = (apiClient.interceptors.request as any).handlers;
    const mockConfig = { headers: {} as Record<string, string> };
    const result = interceptors[0].fulfilled(mockConfig);
    expect(result.headers['Authorization']).toBeUndefined();
  });

  it('on 401 response clears sessionStorage and redirects to /login', async () => {
    // Seed a token so we can verify removal
    sessionStorage.setItem('cps_token', 'some.token');

    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });

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
