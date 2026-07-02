import { useUserRoles } from './useUserRoles';
import type { ModuleKey } from './modules';

/**
 * Returns true if the current user's org is entitled to the given service-line module.
 *
 * Fail-open on "unknown": while /me is loading, or when the response predates the `modules` field
 * (older API / stale cache), we return true so nothing is hidden spuriously — the backend
 * [RequiresModule] gate remains the real enforcement. Once `modules` is present it's authoritative:
 * a module absent from the list is disabled.
 */
export function useModuleEnabled(module: ModuleKey): boolean {
  const { data } = useUserRoles();
  const modules = data?.modules;
  if (!modules) return true; // loading or field-absent → fail open
  return modules.includes(module);
}

/** The current org's enabled module set, or null while unknown (loading / field-absent). */
export function useEnabledModules(): string[] | null {
  const { data } = useUserRoles();
  return data?.modules ?? null;
}
