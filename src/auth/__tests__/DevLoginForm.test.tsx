import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DevLoginForm } from '@/auth/DevLoginForm';
import { setDevClaims, getDevClaims } from '@/auth/devLogin';

describe('DevLoginForm', () => {
  beforeEach(() => {
    sessionStorage.clear();
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
    // Default: the dev-identities endpoint is unavailable → no presets, manual entry only.
    // Individual tests override this to exercise the picker.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no dev endpoint')));
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders nothing when useDevAuth() is false (B2C configured, override off)', () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    const { container } = render(<DevLoginForm />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the form when useDevAuth() is true', () => {
    render(<DevLoginForm />);
    expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/organization id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/roles/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/permissions/i)).toBeInTheDocument();
  });

  it('preset picker fills the fields from a seeded identity and submits them', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            userId: 5, email: 'nurse@demohospice.com', displayName: 'Emily Rodriguez',
            organizationId: 1, roles: ['nurse'],
            permissions: ['clinical:visit_notes', 'clinical:vitals'],
          },
        ],
      }),
    }));
    render(<DevLoginForm />);
    const user = userEvent.setup();

    const select = await screen.findByLabelText(/quick login/i);
    await user.selectOptions(select, '5');

    expect(screen.getByLabelText(/user id/i)).toHaveValue('5');
    expect(screen.getByLabelText(/roles \(comma-separated\)/i)).toHaveValue('nurse');
    expect(screen.getByLabelText(/permissions/i)).toHaveValue('clinical:visit_notes, clinical:vitals');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sign in as dev/i }));
    });
    expect(getDevClaims()).toEqual({
      userId: 5,
      organizationId: 1,
      roles: ['nurse'],
      permissions: ['clinical:visit_notes', 'clinical:vitals'],
    });
  });

  it('submit calls setDevClaims with parsed values', async () => {
    render(<DevLoginForm />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(/user id/i));
    await user.type(screen.getByLabelText(/user id/i), '7');
    await user.clear(screen.getByLabelText(/organization id/i));
    await user.type(screen.getByLabelText(/organization id/i), '2');
    await user.clear(screen.getByLabelText(/roles/i));
    await user.type(screen.getByLabelText(/roles/i), 'system_admin, billing_admin');
    await user.clear(screen.getByLabelText(/permissions/i));
    await user.type(screen.getByLabelText(/permissions/i), 'platform:dashboard');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sign in as dev/i }));
    });

    expect(getDevClaims()).toEqual({
      userId: 7,
      organizationId: 2,
      roles: ['system_admin', 'billing_admin'],
      permissions: ['platform:dashboard'],
    });
  });

  it('shows inline error when userId is negative', async () => {
    render(<DevLoginForm />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(/user id/i));
    await user.type(screen.getByLabelText(/user id/i), '-1');
    await user.clear(screen.getByLabelText(/roles/i));
    await user.type(screen.getByLabelText(/roles/i), 'clinician');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sign in as dev/i }));
    });

    expect(screen.getByText(/user id must be a positive integer/i)).toBeInTheDocument();
    expect(getDevClaims()).toBeNull();
  });

  it('shows inline error when roles list is empty', async () => {
    render(<DevLoginForm />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(/user id/i));
    await user.type(screen.getByLabelText(/user id/i), '1');
    await user.clear(screen.getByLabelText(/roles/i));
    // intentionally leave empty

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sign in as dev/i }));
    });

    expect(screen.getByText(/at least one role is required/i)).toBeInTheDocument();
    expect(getDevClaims()).toBeNull();
  });

  it('populates fields from prior session dev claims', () => {
    setDevClaims({
      userId: 99,
      organizationId: 3,
      roles: ['clinician'],
      permissions: ['visit:create'],
    });
    render(<DevLoginForm />);
    expect((screen.getByLabelText(/user id/i) as HTMLInputElement).value).toBe('99');
    expect((screen.getByLabelText(/organization id/i) as HTMLInputElement).value).toBe('3');
    expect((screen.getByLabelText(/roles/i) as HTMLInputElement).value).toBe('clinician');
    expect((screen.getByLabelText(/permissions/i) as HTMLInputElement).value).toBe('visit:create');
  });
});
