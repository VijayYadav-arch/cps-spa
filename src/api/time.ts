import { apiClient } from '@/api/client';

export type EmployeeTimeActivityType =
  | 'PatientCare'
  | 'Administrative'
  | 'Training'
  | 'NonBillable';

export interface EmployeePaidTimeLog {
  id: number;
  userId: number;
  userName: string;
  serviceDate: string;
  hours: number;
  activityType: string;
  description: string | null;
  patientId: number | null;
  createdAt: string;
}

export interface LogPaidTimeRequest {
  userId: number;
  serviceDate: string;
  hours: number;
  activityType: EmployeeTimeActivityType;
  description: string | null;
  patientId: number | null;
}

export interface PaidTimeSummary {
  from: string;
  to: string;
  patientCareHours: number;
  administrativeHours: number;
  trainingHours: number;
  nonBillableHours: number;
  totalHours: number;
  employeeCount: number;
}

export const logPaidTime = (req: LogPaidTimeRequest): Promise<EmployeePaidTimeLog> =>
  apiClient.post<EmployeePaidTimeLog>('/time/logs', req).then((r) => r.data);

export const listPaidTime = (
  from: string,
  to: string,
): Promise<{ data: EmployeePaidTimeLog[] }> =>
  apiClient
    .get<{ data: EmployeePaidTimeLog[] }>('/time/logs', { params: { from, to } })
    .then((r) => r.data);

export const listPaidTimeForUser = (
  userId: number,
  from: string,
  to: string,
): Promise<{ data: EmployeePaidTimeLog[] }> =>
  apiClient
    .get<{ data: EmployeePaidTimeLog[] }>(`/time/logs/user/${userId}`, {
      params: { from, to },
    })
    .then((r) => r.data);

export const getPaidTimeSummary = (
  from: string,
  to: string,
): Promise<PaidTimeSummary> =>
  apiClient
    .get<PaidTimeSummary>('/time/summary', { params: { from, to } })
    .then((r) => r.data);

// ─── Personal endpoints (current authenticated user) ───────────────────────

export interface LogMyPaidTimeRequest {
  serviceDate: string;
  hours: number;
  activityType: EmployeeTimeActivityType;
  description: string | null;
  patientId: number | null;
}

export const logMyPaidTime = (
  req: LogMyPaidTimeRequest,
): Promise<EmployeePaidTimeLog> =>
  apiClient.post<EmployeePaidTimeLog>('/time/me/logs', req).then((r) => r.data);

export const listMyPaidTime = (
  from: string,
  to: string,
): Promise<{ data: EmployeePaidTimeLog[] }> =>
  apiClient
    .get<{ data: EmployeePaidTimeLog[] }>('/time/me/logs', { params: { from, to } })
    .then((r) => r.data);

export const getMyPaidTimeSummary = (
  from: string,
  to: string,
): Promise<PaidTimeSummary> =>
  apiClient
    .get<PaidTimeSummary>('/time/me/summary', { params: { from, to } })
    .then((r) => r.data);

// ─── CSV import ──────────────────────────────────────────────────────────

export interface PaidTimeCsvRowError {
  lineNumber: number;
  rawLine: string;
  error: string;
}

export interface PaidTimeCsvImportResult {
  importedCount: number;
  failedCount: number;
  errors: PaidTimeCsvRowError[];
}

export const importPaidTimeCsv = (
  csv: string,
): Promise<PaidTimeCsvImportResult> =>
  apiClient
    .post<PaidTimeCsvImportResult>('/time/import', csv, {
      headers: { 'Content-Type': 'text/csv' },
    })
    .then((r) => r.data);
