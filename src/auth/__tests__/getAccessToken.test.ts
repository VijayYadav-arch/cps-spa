import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAccessToken,
  setAccessTokenProvider,
  _resetAccessTokenProviderForTests,
} from '@/auth/getAccessToken';

describe('getAccessToken accessor', () => {
  beforeEach(() => {
    _resetAccessTokenProviderForTests();
  });

  it('returns null when no provider is registered', async () => {
    expect(await getAccessToken()).toBeNull();
  });

  it('returns the provider value when registered', async () => {
    setAccessTokenProvider(() => Promise.resolve('tok-1'));
    expect(await getAccessToken()).toBe('tok-1');
  });

  it('supports synchronous provider returning a string', async () => {
    setAccessTokenProvider(() => 'sync-tok');
    expect(await getAccessToken()).toBe('sync-tok');
  });

  it('returns null when provider resolves to null', async () => {
    setAccessTokenProvider(() => Promise.resolve(null));
    expect(await getAccessToken()).toBeNull();
  });

  it('replacing the provider overwrites previous value', async () => {
    setAccessTokenProvider(() => 'first');
    setAccessTokenProvider(() => 'second');
    expect(await getAccessToken()).toBe('second');
  });

  it('returns null and does not throw if provider throws', async () => {
    setAccessTokenProvider(() => {
      throw new Error('boom');
    });
    expect(await getAccessToken()).toBeNull();
  });
});
