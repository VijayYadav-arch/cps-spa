import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from './usePermission';
import { useUserRoles } from './useUserRoles';
import type { Permission } from './permissions';
import { FullPageSpinner } from '@/components/FullPageSpinner';

interface RoleRouteProps {
  required: Permission | Permission[];
  children: ReactNode;
}

export function RoleRoute({ required, children }: RoleRouteProps) {
  const hasPermission = usePermission(required);
  const { isLoading } = useUserRoles();
  if (isLoading) return <FullPageSpinner />;
  if (!hasPermission) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}
