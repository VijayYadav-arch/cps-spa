import { apiClient } from '@/api/client';

export interface FhirFeedRow {
  id: number;
  receivedAtUtc: string;
  resourceType: string;
  resourceId: number | null;
  status: 'created' | 'updated' | 'validation-error' | 'not-found' | 'error';
  diagnostics: string | null;
  bundleEntryIndex: number | null;
}

const BASE = '/integrations/fhir-feed';

export const listFhirFeed = (params: {
  limit?: number;
  status?: string;
  resourceType?: string;
} = {}): Promise<{ data: FhirFeedRow[]; count: number }> =>
  apiClient
    .get<{ data: FhirFeedRow[]; count: number }>(BASE, { params })
    .then((r) => r.data);
