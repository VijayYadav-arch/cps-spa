import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { auth } = useAuth();
  return auth.isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}
