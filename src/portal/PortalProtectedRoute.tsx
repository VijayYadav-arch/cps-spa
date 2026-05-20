import { Navigate, useLocation } from 'react-router-dom';
import { type ReactNode } from 'react';
import { usePortalAuth } from './PortalAuthContext';

export function PortalProtectedRoute({ children }: { children: ReactNode }) {
  const { me, loading } = usePortalAuth();
  const location = useLocation();

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!me) return <Navigate to="/portal/login" state={{ from: location }} replace />;

  return <>{children}</>;
}
