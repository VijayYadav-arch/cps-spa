import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SsoButton } from '@/auth/SsoButton';
import { AuthContext } from '@/auth/AuthContext';

function renderWithAuth(loginWithSSO = vi.fn()) {
  return render(
    <AuthContext.Provider
      value={{
        auth: { isAuthenticated: false, user: null },
        loginWithSSO,
        logout: vi.fn(),
      }}
    >
      <SsoButton />
    </AuthContext.Provider>
  );
}

describe('SsoButton', () => {
  beforeEach(() => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the SSO button when useDevAuth() is false', () => {
    renderWithAuth();
    expect(screen.getByRole('button', { name: /sign in with company sso/i })).toBeInTheDocument();
  });

  it('clicking the button calls loginWithSSO', async () => {
    const loginWithSSO = vi.fn();
    renderWithAuth(loginWithSSO);
    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });
    expect(loginWithSSO).toHaveBeenCalledOnce();
  });

  it('is disabled with tooltip when useDevAuth() is true', () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    renderWithAuth();
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.getAttribute('title')).toMatch(/b2c not configured/i);
  });
});
