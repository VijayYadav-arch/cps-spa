import { apiClient } from './client';

export interface UptimeRecord {
  id: number;
  checkUrl: string;
  status: string;
  responseMs: number;
  checkedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UptimeSummary {
  totalChecks: number;
  upChecks: number;
  degradedChecks: number;
  downChecks: number;
  uptimePercentage: number;
  avgResponseMs: number;
  oldestSampleAt: string | null;
  newestSampleAt: string | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
}

export const listUptimeRecords = (params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: UptimeRecord[]; pagination: PaginationMeta }> =>
  apiClient
    .get<{ data: UptimeRecord[]; pagination: PaginationMeta }>('/uptime-records', { params })
    .then((r) => r.data);

export const getUptimeSummary = (params?: {
  windowSize?: number;
  sinceHours?: number;
}): Promise<UptimeSummary> =>
  apiClient
    .get<{ data: UptimeSummary }>('/uptime-records/summary', { params })
    .then((r) => r.data.data);
