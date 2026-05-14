import {
  createContext,
  useState,
  type ReactNode,
} from 'react';
import { apiClient } from '@/api/client';

interface UserInfo {
  userId: number;
  organizationId?: number;
  roles: string[];
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
}

interface AuthContextValue {
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>(null!);

function decodeToken(token: string): UserInfo {
  const base64 = token.split('.')[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
  return {
    userId: Number(payload['userId']),
    organizationId: payload['organizationId'] != null
      ? Number(payload['organizationId'])
      : undefined,
    roles: Array.isArray(payload['rbac_role'])
      ? (payload['rbac_role'] as string[])
      : typeof payload['rbac_role'] === 'string'
        ? [payload['rbac_role']]
        : [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = sessionStorage.getItem('cps_token');
    if (token) {
      try {
        return { isAuthenticated: true, user: decodeToken(token) };
      } catch {
        sessionStorage.removeItem('cps_token');
      }
    }
    return { isAuthenticated: false, user: null };
  });

  const login = async (email: string, password: string): Promise<void> => {
    const { data } = await apiClient.post<{ data: { token: string } }>(
      '/auth/login',
      { email, password }
    );
    const token = data.data.token;
    const user = decodeToken(token);  // throws first if malformed
    sessionStorage.setItem('cps_token', token);
    setAuth({ isAuthenticated: true, user });
  };

  const logout = () => {
    sessionStorage.removeItem('cps_token');
    setAuth({ isAuthenticated: false, user: null });
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
