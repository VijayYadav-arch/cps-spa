import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventType } from '@azure/msal-browser';
import { AuthProvider } from '@/auth/AuthContext';
import { useAuth } from '@/auth/useAuth';
import {
  setDevClaims,
  clearDevClaims,
} from '@/auth/devLogin';
import {
  createFakePca,
  fakeAccount,
  fakeTokenResponse,
} from '@/auth/__tests__/fakes/msal';

/** Build a B2C-shaped JWT for tests. */
function makeB2CToken(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

function TestConsumer() {
  const { auth, loginWithSSO, logout } = useAuth();
  return (
    <div>
      <span data-testid="is-auth">{String(auth.isAuthenticated)}</span>
      <span data-testid="user-id">{auth.user?.userId ?? 'null'}</span>
      <span data-testid="roles">{auth.user?.roles.join(',') ?? ''}</span>
      <button onClick={loginWithSSO}>Login SSO</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext (SSO mode)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes unauthenticated when no MSAL account', () => {
    const pca = createFakePca({ accounts: [] });
    render(
      <AuthProvider pca={pca}>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('false');
  });

  it('hydrates state when MSAL has an account and silent token works', async () => {
    const token = makeB2CToken({
      extension_userId: '42',
      extension_organizationId: '7',
      extension_rbac_role: 'billing_admin',
    });
    const pca = createFakePca({
      accounts: [fakeAccount()],
      tokenResponses: [fakeTokenResponse(token)],
    });
    render(
      <AuthProvider pca={pca}>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('is-auth').textContent).toBe('true');
    });
    expect(screen.getByTestId('user-id').textContent).toBe('42');
    expect(screen.getByTestId('roles').textContent).toBe('billing_admin');
  });

  it('loginWithSSO calls loginRedirect with loginRequest', async () => {
    const pca = createFakePca({ accounts: [] });
    render(
      <AuthProvider pca={pca}>
        <TestConsumer />
      </AuthProvider>
    );
    await act(async () => {
      await userEvent.click(screen.getByText('Login SSO'));
    });
    expect(pca.loginRedirect).toHaveBeenCalledOnce();
    expect((pca.loginRedirect as any).mock.calls[0][0].scopes).toBeDefined();
  });

  it('logout calls logoutRedirect with postLogoutRedirectUri', async () => {
    const token = makeB2CToken({ extension_userId: '1' });
    const pca = createFakePca({
      accounts: [fakeAccount()],
      tokenResponses: [fakeTokenResponse(token)],
    });
    render(
      <AuthProvider pca={pca}>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId('is-auth').textContent).toBe('true')
    );
    await act(async () => {
      await userEvent.click(screen.getByText('Logout'));
    });
    expect(pca.logoutRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ postLogoutRedirectUri: '/login' })
    );
  });

  it('LOGIN_SUCCESS event hydrates state', async () => {
    const token = makeB2CToken({
      extension_userId: '99',
      extension_rbac_role: 'clinician',
    });
    const pca = createFakePca({ accounts: [] });
    render(
      <AuthProvider pca={pca}>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('false');

    // Simulate B2C redirect-callback completion: an account appears and
    // LOGIN_SUCCESS fires.
    (pca.getAllAccounts as any).mockReturnValue([fakeAccount()]);
    // Reset the token queue
    (pca.acquireTokenSilent as any).mockResolvedValueOnce(
      fakeTokenResponse(token)
    );
    await act(async () => {
      (pca as any)._fireEvent({
        eventType: EventType.LOGIN_SUCCESS,
        payload: { account: fakeAccount() },
      });
    });
    await waitFor(() =>
      expect(screen.getByTestId('is-auth').textContent).toBe('true')
    );
    expect(screen.getByTestId('user-id').textContent).toBe('99');
  });
});

describe('AuthContext (dev mode)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes unauthenticated when no dev claims set', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('false');
  });

  it('hydrates from dev claims on cold boot', () => {
    setDevClaims({
      userId: 7,
      organizationId: 1,
      roles: ['system_admin'],
      permissions: [],
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('true');
    expect(screen.getByTestId('user-id').textContent).toBe('7');
    expect(screen.getByTestId('roles').textContent).toBe('system_admin');
  });

  it('cps:dev-claims-changed event re-syncs auth state mid-session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('false');

    await act(async () => {
      setDevClaims({
        userId: 3,
        organizationId: 2,
        roles: ['clinician'],
        permissions: [],
      });
    });
    await waitFor(() =>
      expect(screen.getByTestId('is-auth').textContent).toBe('true')
    );
    expect(screen.getByTestId('user-id').textContent).toBe('3');

    // clearDevClaims fires the event with detail=null
    await act(async () => {
      clearDevClaims();
    });
    await waitFor(() =>
      expect(screen.getByTestId('is-auth').textContent).toBe('false')
    );
  });

  it('logout in dev mode clears dev claims and resets state', async () => {
    setDevClaims({
      userId: 1,
      organizationId: 1,
      roles: ['system_admin'],
      permissions: [],
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await act(async () => {
      await userEvent.click(screen.getByText('Logout'));
    });
    expect(sessionStorage.getItem('cps_dev_claims')).toBeNull();
    expect(screen.getByTestId('is-auth').textContent).toBe('false');
  });
});
