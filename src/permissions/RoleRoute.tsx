import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from './usePermission';
import { useAnyPermission } from './useAnyPermission';
import { useUserRoles } from './useUserRoles';
import { useModuleEnabled } from './useModule';
import type { Permission } from './permissions';
import type { ModuleKey } from './modules';
import { FullPageSpinner } from '@/components/FullPageSpinner';

interface RoleRouteProps {
  /** All of these are required (AND). Use `anyOf` instead for OR semantics. */
  required?: Permission | Permission[];
  /** Any one of these grants access (OR) — mirrors a compound OR backend policy. */
  anyOf?: Permission[];
  /**
   * Optional org-level service-line entitlement. When set, the org must be entitled to this module
   * in addition to the permission check — mirrors the backend [RequiresModule] gate. Routes to
   * /unauthorized when the org lacks it.
   */
  module?: ModuleKey;
  children: ReactNode;
}

export function RoleRoute({ required, anyOf, module, children }: RoleRouteProps) {
  // Hooks must run unconditionally; pass harmless empty inputs when a mode is unused.
  const hasAll = usePermission(required ?? []);
  const hasAny = useAnyPermission(anyOf ?? []);
  // Passing a non-module sentinel when unused keeps the hook order stable while resolving to true.
  const moduleOk = useModuleEnabled((module ?? 'billing') as ModuleKey);
  const { isLoading } = useUserRoles();
  if (isLoading) return <FullPageSpinner />;
  const permitted = anyOf ? hasAny : hasAll;
  const allowed = permitted && (module ? moduleOk : true);
  if (!allowed) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}
