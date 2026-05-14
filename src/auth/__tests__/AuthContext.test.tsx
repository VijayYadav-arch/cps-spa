import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '@/auth/AuthContext';
import { useAuth } from '@/auth/useAuth';

// Minimal JWT with payload { userId: 42, organizationId: 7, rbac_role: "billing_admin" }
const makeToken = (payload: object) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
};

const MOCK_TOKEN = makeToken({ userId: 42, organizationId: 7, rbac_role: 'billing_admin' });

vi.mock('@/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

function TestConsumer() {
  const { auth, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="is-auth">{String(auth.isAuthenticated)}</span>
      <span data-testid="user-id">{auth.user?.userId ?? 'null'}</span>
      <button onClick={() => login('user@test.com', 'pass123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes as unauthenticated when no token in sessionStorage', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('false');
    expect(screen.getByTestId('user-id').textContent).toBe('null');
  });

  it('initializes as authenticated when token exists in sessionStorage', () => {
    sessionStorage.setItem('cps_token', MOCK_TOKEN);
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('true');
    expect(screen.getByTestId('user-id').textContent).toBe('42');
  });

  it('login() calls POST /auth/login, stores token, sets auth state', async () => {
    const { apiClient } = await import('@/api/client');
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { data: { token: MOCK_TOKEN } },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'user@test.com',
      password: 'pass123',
    });
    expect(sessionStorage.getItem('cps_token')).toBe(MOCK_TOKEN);
    expect(screen.getByTestId('is-auth').textContent).toBe('true');
    expect(screen.getByTestId('user-id').textContent).toBe('42');
  });

  it('logout() clears sessionStorage and sets auth to unauthenticated', async () => {
    sessionStorage.setItem('cps_token', MOCK_TOKEN);
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('true');

    await act(async () => {
      await userEvent.click(screen.getByText('Logout'));
    });

    expect(sessionStorage.getItem('cps_token')).toBeNull();
    expect(screen.getByTestId('is-auth').textContent).toBe('false');
  });
});
