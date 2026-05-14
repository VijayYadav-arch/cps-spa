import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/auth/AuthContext';
import { Login } from '@/pages/Login';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLogin(loginImpl = mockLogin) {
  render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          auth: { isAuthenticated: false, user: null },
          login: loginImpl,
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
    vi.clearAllMocks();
  });

  it('renders email and password inputs', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls login() with entered credentials on submit', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@cps.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@cps.com', 'secret123');
    });
  });

  it('redirects to / on successful login', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@cps.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'bad@user.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
