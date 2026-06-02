export interface MeResponse {
  userId: number;
  email: string;
  organizationId: number | null;
  organizationName: string;
  roles: string[];
  permissions: string[];
  serverTime: string; // ISO 8601 UTC
}
