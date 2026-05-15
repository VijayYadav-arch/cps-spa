import { apiClient } from './client';

export interface WorkQueueItem {
  id: number;
  type: string;
  description: string;
  priority: string;
  status: string;
  claimId: number | null;
  patientId: number | null;
  dueDate: string | null;
  createdAt: string;
}

export interface WorkQueueStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export interface WorkQueueResponse {
  data: WorkQueueItem[];
  stats: WorkQueueStats;
}

export interface DenialItem {
  id: number;
  organizationId: number;
  status: string;
  denialCode: string;
  payerName: string;
  denialDate: string;
  resolvedAt: string | null;
  assignedTo: number | null;
  appealHistory: string | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
}

export const getWorkQueue = (params?: { status?: string; type?: string; }): Promise<WorkQueueResponse> =>
  apiClient.get<WorkQueueResponse>('/billing/work-queue', { params }).then((r) => r.data);

export const getWorkQueueStats = (): Promise<WorkQueueStats> =>
  apiClient.get<WorkQueueStats>('/billing/work-queue/stats').then((r) => r.data);

export const getDenials = (params?: { status?: string; page?: number; pageSize?: number; }): Promise<{ data: DenialItem[]; pagination: PaginationMeta }> =>
  apiClient.get<{ data: DenialItem[]; pagination: PaginationMeta }>('/billing/denials', { params }).then((r) => r.data);
