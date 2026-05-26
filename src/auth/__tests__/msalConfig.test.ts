import { describe, it, expect, afterEach, vi } from 'vitest';

describe('msalConfig', () => {
  const ORIGINAL_ENV = { ...import.meta.env };

  afterEach(() => {
    // restore env
    Object.keys(import.meta.env).forEach((k) => delete (import.meta.env as any)[k]);
    Object.assign(import.meta.env, ORIGINAL_ENV);
    vi.resetModules();
  });

  it('isB2CConfigured returns false when VITE_B2C_CLIENT_ID is empty', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    const { isB2CConfigured } = await import('@/auth/msalConfig');
    expect(isB2CConfigured()).toBe(false);
  });

  it('isB2CConfigured returns true when VITE_B2C_CLIENT_ID is set', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    const { isB2CConfigured } = await import('@/auth/msalConfig');
    expect(isB2CConfigured()).toBe(true);
  });

  it('useDevAuth returns true when VITE_B2C_CLIENT_ID is empty', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
    const { useDevAuth } = await import('@/auth/msalConfig');
    expect(useDevAuth()).toBe(true);
  });

  it('useDevAuth returns false when B2C configured and VITE_DEV_LOGIN is unset', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    delete (import.meta.env as any).VITE_DEV_LOGIN;
    const { useDevAuth } = await import('@/auth/msalConfig');
    expect(useDevAuth()).toBe(false);
  });

  it('useDevAuth returns true when VITE_DEV_LOGIN=true overrides B2C configured', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    (import.meta.env as any).VITE_DEV_LOGIN = 'true';
    const { useDevAuth } = await import('@/auth/msalConfig');
    expect(useDevAuth()).toBe(true);
  });

  it('buildMsalConfig composes authority from instance + domain + policy', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    (import.meta.env as any).VITE_B2C_INSTANCE = 'https://contoso.b2clogin.com/tfp';
    (import.meta.env as any).VITE_B2C_DOMAIN = 'contoso.onmicrosoft.com';
    (import.meta.env as any).VITE_B2C_SUSI_POLICY = 'B2C_1A_signup_signin';
    const { buildMsalConfig } = await import('@/auth/msalConfig');
    const cfg = buildMsalConfig();
    expect(cfg.auth.clientId).toBe('abc-123');
    expect(cfg.auth.authority).toBe(
      'https://contoso.b2clogin.com/tfp/contoso.onmicrosoft.com/B2C_1A_signup_signin'
    );
    expect(cfg.auth.knownAuthorities).toEqual(['contoso.b2clogin.com']);
    expect(cfg.cache?.cacheLocation).toBe('sessionStorage');
  });

  it('buildMsalConfig falls back to safe defaults when env vars missing', async () => {
    delete (import.meta.env as any).VITE_B2C_INSTANCE;
    delete (import.meta.env as any).VITE_B2C_DOMAIN;
    const { buildMsalConfig } = await import('@/auth/msalConfig');
    const cfg = buildMsalConfig();
    expect(cfg.auth.knownAuthorities).toEqual(['login.microsoftonline.com']);
  });
});
