import { describe, it, expect } from 'vitest';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { acquireBearerToken } from '@/auth/ssoAcquire';
import { createFakePca, fakeAccount, fakeTokenResponse } from './fakes/msal';

describe('acquireBearerToken', () => {
  it('returns the accessToken from acquireTokenSilent on success', async () => {
    const acc = fakeAccount();
    const pca = createFakePca({
      accounts: [acc],
      tokenResponses: [fakeTokenResponse('silent.tok')],
    });
    const result = await acquireBearerToken(pca, acc);
    expect(result).toBe('silent.tok');
    expect(pca.acquireTokenSilent).toHaveBeenCalledOnce();
  });

  it('falls back to acquireTokenRedirect on InteractionRequiredAuthError', async () => {
    const acc = fakeAccount();
    const interactionErr = new InteractionRequiredAuthError(
      'interaction_required',
      'interaction required'
    );
    const pca = createFakePca({
      accounts: [acc],
      tokenResponses: [interactionErr],
    });
    const result = await acquireBearerToken(pca, acc);
    // Redirect navigates the browser; ssoAcquire returns null so caller
    // doesn't try to use a non-existent token.
    expect(result).toBeNull();
    expect(pca.acquireTokenRedirect).toHaveBeenCalledOnce();
  });

  it('propagates other errors (does not fall back to redirect)', async () => {
    const acc = fakeAccount();
    const otherErr = new Error('network failure');
    const pca = createFakePca({
      accounts: [acc],
      tokenResponses: [otherErr],
    });
    await expect(acquireBearerToken(pca, acc)).rejects.toThrow('network failure');
    expect(pca.acquireTokenRedirect).not.toHaveBeenCalled();
  });

  it('returns null when no account is passed', async () => {
    const pca = createFakePca({});
    const result = await acquireBearerToken(pca, null);
    expect(result).toBeNull();
    expect(pca.acquireTokenSilent).not.toHaveBeenCalled();
  });
});
