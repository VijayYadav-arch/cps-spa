export interface MeResponse {
  userId: number;
  email: string;
  organizationId: number | null;
  organizationName: string;
  roles: string[];
  permissions: string[];
  serverTime: string; // ISO 8601 UTC
  /**
   * The org's enabled service-line modules (entitlements). Gates nav/routes in addition to
   * per-user permissions. Optional so a response cached before this field shipped (or an older
   * API) is treated as "unknown" → fail-open (see useModuleEnabled).
   */
  modules?: string[];
}
