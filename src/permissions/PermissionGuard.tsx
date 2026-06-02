import type { ReactNode } from 'react';
import { usePermission } from './usePermission';
import type { Permission } from './permissions';

interface PermissionGuardProps {
  required: Permission | Permission[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({ required, fallback = null, children }: PermissionGuardProps) {
  const hasPermission = usePermission(required);
  return <>{hasPermission ? children : fallback}</>;
}
