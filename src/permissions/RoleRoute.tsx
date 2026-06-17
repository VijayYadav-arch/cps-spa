import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from './usePermission';
import { useAnyPermission } from './useAnyPermission';
import { useUserRoles } from './useUserRoles';
import type { Permission } from './permissions';
import { FullPageSpinner } from '@/components/FullPageSpinner';

interface RoleRouteProps {
  /** All of these are required (AND). Use `anyOf` instead for OR semantics. */
  required?: Permission | Permission[];
  /** Any one of these grants access (OR) — mirrors a compound OR backend policy. */
  anyOf?: Permission[];
  children: ReactNode;
}

export function RoleRoute({ required, anyOf, children }: RoleRouteProps) {
  // Hooks must run unconditionally; pass harmless empty inputs when a mode is unused.
  const hasAll = usePermission(required ?? []);
  const hasAny = useAnyPermission(anyOf ?? []);
  const { isLoading } = useUserRoles();
  if (isLoading) return <FullPageSpinner />;
  const allowed = anyOf ? hasAny : hasAll;
  if (!allowed) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}
