import { useUserRoles } from './useUserRoles';
import type { Permission } from './permissions';

/**
 * Returns true if the current user has ALL the listed permissions.
 * Returns false while the /me query is loading or if the response
 * lacks a permissions array (defensive default for unauthenticated /
 * malformed responses).
 */
export function usePermission(required: Permission | Permission[]): boolean {
  const { data } = useUserRoles();
  if (!data?.permissions) return false;
  const list = Array.isArray(required) ? required : [required];
  return list.every((p) => data.permissions.includes(p));
}
