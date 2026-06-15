import { useUserRoles } from './useUserRoles';
import type { Permission } from './permissions';

/**
 * Returns true if the current user has AT LEAST ONE of the listed permissions
 * (OR semantics — mirrors a compound OR backend policy such as
 * `apikey_management` = `org:api_keys` OR `platform:api_keys`).
 *
 * Returns false while the /me query is loading, if the response lacks a
 * permissions array (defensive default for unauthenticated / malformed
 * responses), or if `required` is empty.
 */
export function useAnyPermission(required: Permission[]): boolean {
  const { data } = useUserRoles();
  if (!data?.permissions) return false;
  return required.some((p) => data.permissions.includes(p));
}
