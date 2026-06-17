import { apiClient } from './client';

export type VisitDiscipline =
  | 'skilled-nursing'
  | 'social-work'
  | 'chaplain'
  | 'aide'
  | 'physician'
  | 'other';

export type VisitType = 'routine' | 'admission' | 'recert' | 'prn' | 'discharge';

export type ScheduledVisitStatus = 'scheduled' | 'completed' | 'cancelled' | 'missed';

export interface ScheduledVisit {
  id: number;
  organizationId: number;
  patientId: number;
  assignedUserId: number | null;
  discipline: VisitDiscipline;
  visitType: VisitType;
  scheduledStart: string;
  scheduledEnd: string | null;
  status: ScheduledVisitStatus;
  notes: string | null;
  visitNoteId: number | null;
}

export interface CreateScheduledVisitRequest {
  patientId: number;
  discipline: VisitDiscipline;
  scheduledStart: string;
  scheduledEnd?: string | null;
  visitType?: VisitType;
  assignedUserId?: number | null;
  notes?: string | null;
}

export interface UpdateScheduledVisitRequest {
  discipline?: VisitDiscipline;
  visitType?: VisitType;
  scheduledStart?: string;
  scheduledEnd?: string | null;
  assignedUserId?: number | null;
  status?: ScheduledVisitStatus;
  notes?: string | null;
  visitNoteId?: number | null;
}

export const listScheduledVisits = (params?: {
  from?: string;
  to?: string;
  patientId?: number;
  assignedUserId?: number;
  status?: ScheduledVisitStatus;
}): Promise<{ data: ScheduledVisit[] }> =>
  apiClient
    .get<{ data: ScheduledVisit[] }>('/clinical/scheduled-visits', { params })
    .then((r) => r.data);

export const createScheduledVisit = (
  req: CreateScheduledVisitRequest,
): Promise<{ data: ScheduledVisit }> =>
  apiClient
    .post<{ data: ScheduledVisit }>('/clinical/scheduled-visits', req)
    .then((r) => r.data);

export const updateScheduledVisit = (
  id: number,
  req: UpdateScheduledVisitRequest,
): Promise<{ data: ScheduledVisit }> =>
  apiClient
    .put<{ data: ScheduledVisit }>(`/clinical/scheduled-visits/${id}`, req)
    .then((r) => r.data);
