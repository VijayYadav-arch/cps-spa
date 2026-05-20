import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { PortalAuthProvider, usePortalAuth } from '@/portal/PortalAuthContext';

vi.mock('@/portal/portalApi', () => ({
  portalLogin: vi.fn(),
  portalMe: vi.fn(),
}));

import { portalLogin, portalMe } from '@/portal/portalApi';

function Consumer() {
  const { me, loading, login, logout } = usePortalAuth();
  return (
    <div>
      <div data-testid="loading">{loading ? 'yes' : 'no'}</div>
      <div data-testid="me">{me ? me.relationshipLabel : 'none'}</div>
      <button onClick={() => login(100, 'pin-1234')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  // Avoid window.location.href reassignment errors in jsdom — we just check state
  Object.defineProperty(window, 'location', { value: { href: '/portal', pathname: '/portal' }, writable: true });
});

describe('PortalAuthContext', () => {
  it('starts unauthenticated when no token is in storage', async () => {
    render(
      <PortalAuthProvider>
        <Consumer />
      </PortalAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no');
    });
    expect(screen.getByTestId('me').textContent).toBe('none');
    expect(portalMe).not.toHaveBeenCalled();
  });

  it('loads me when a token already exists', async () => {
    sessionStorage.setItem('cps_portal_token', 'fake-token');
    vi.mocked(portalMe).mockResolvedValueOnce({
      patientId: 100,
      relationshipLabel: 'Daughter',
      email: 'd@x',
      phoneNumber: null,
    });

    render(
      <PortalAuthProvider>
        <Consumer />
      </PortalAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('me').textContent).toBe('Daughter');
    });
    expect(portalMe).toHaveBeenCalledOnce();
  });

  it('clears token if portalMe rejects on boot', async () => {
    sessionStorage.setItem('cps_portal_token', 'stale-token');
    vi.mocked(portalMe).mockRejectedValueOnce(new Error('401'));

    render(
      <PortalAuthProvider>
        <Consumer />
      </PortalAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no');
    });
    expect(sessionStorage.getItem('cps_portal_token')).toBeNull();
    expect(screen.getByTestId('me').textContent).toBe('none');
  });

  it('login stores the token and sets me', async () => {
    vi.mocked(portalLogin).mockResolvedValueOnce({
      token: 'good-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    vi.mocked(portalMe).mockResolvedValueOnce({
      patientId: 100,
      relationshipLabel: 'Spouse',
      email: null,
      phoneNumber: null,
    });

    render(
      <PortalAuthProvider>
        <Consumer />
      </PortalAuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'login' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('me').textContent).toBe('Spouse');
    });
    expect(sessionStorage.getItem('cps_portal_token')).toBe('good-token');
    expect(sessionStorage.getItem('cps_portal_patient_id')).toBe('100');
  });
});
