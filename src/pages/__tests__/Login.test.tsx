import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '@/pages/Login';
import { AuthContext } from '@/auth/AuthContext';

function renderLogin(initialEntries = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider
        value={{
          auth: { isAuthenticated: false, user: null },
          loginWithSSO: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <Login />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('Login page', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders SsoButton in SSO mode', () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in with company sso/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/user id/i)).not.toBeInTheDocument();
  });

  it('renders DevLoginForm in dev mode', () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
    renderLogin();
    expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in with company sso/i })).not.toBeInTheDocument();
  });

  it('shows expired-session banner on ?reason=expired', () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    renderLogin(['/login?reason=expired']);
    expect(screen.getByText(/your session ended/i)).toBeInTheDocument();
  });

  it('shows invalid-token banner on ?reason=invalid_token', () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    renderLogin(['/login?reason=invalid_token']);
    expect(screen.getByText(/sign-in could not be completed/i)).toBeInTheDocument();
  });
});
