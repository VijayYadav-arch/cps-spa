import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PortalLogin } from '@/pages/Portal/PortalLogin';
import { PortalAuthProvider } from '@/portal/PortalAuthContext';

vi.mock('@/portal/portalApi', () => ({
  portalLogin: vi.fn(),
  portalMe: vi.fn(),
}));

import { portalLogin, portalMe } from '@/portal/portalApi';

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <PortalAuthProvider>
        <PortalLogin />
      </PortalAuthProvider>
    </MemoryRouter>,
  );
}

describe('PortalLogin', () => {
  it('rejects an empty patient ID', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/valid patient ID/i)).toBeInTheDocument();
    expect(portalLogin).not.toHaveBeenCalled();
  });

  it('rejects a short PIN', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/Patient ID/i), '100');
    await user.type(screen.getByLabelText(/PIN/i), '12');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/PIN must be at least 4/i)).toBeInTheDocument();
  });

  it('calls portalLogin with the entered credentials', async () => {
    const user = userEvent.setup();
    vi.mocked(portalLogin).mockResolvedValueOnce({
      token: 'tok',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    vi.mocked(portalMe).mockResolvedValueOnce({
      patientId: 100,
      relationshipLabel: 'Daughter',
      email: null,
      phoneNumber: null,
    });

    renderLogin();
    await user.type(screen.getByLabelText(/Patient ID/i), '100');
    await user.type(screen.getByLabelText(/PIN/i), 'pin-1234');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(portalLogin).toHaveBeenCalledWith({ patientId: 100, pin: 'pin-1234' });
    });
  });

  it('renders a backend error if login fails', async () => {
    const user = userEvent.setup();
    vi.mocked(portalLogin).mockRejectedValueOnce({
      response: { data: { error: 'Invalid PIN' } },
    });

    renderLogin();
    await user.type(screen.getByLabelText(/Patient ID/i), '100');
    await user.type(screen.getByLabelText(/PIN/i), 'bad-pin');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid PIN')).toBeInTheDocument();
  });
});
