import { apiClient } from './client';

export type OnboardingStatus = 'completed' | 'in-progress' | 'at-risk' | 'not-started';

export interface OrgStatusRow {
  orgId: number;
  orgName: string;
  slug: string;
  signupDate: string;
  onboardingPercent: number;
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  completedAt: string | null;
  status: OnboardingStatus;
  claimsCount: number;
  patientsCount: number;
  assignedManagerUserId: number | null;
  assignedManagerName: string | null;
  assignedManagerAt: string | null;
}

export interface OnboardingManager {
  userId: number;
  name: string;
  email: string;
}

export interface OnboardingRollup {
  totalOrgs: number;
  completed: number;
  inProgress: number;
  atRisk: number;
  notStarted: number;
  activationRate: number;
}

export interface OrgsStatusResponse {
  data: OrgStatusRow[];
  rollup: OnboardingRollup;
}

export const getOrgsStatus = (params?: { statusFilter?: OnboardingStatus }): Promise<OrgsStatusResponse> =>
  apiClient.get<OrgsStatusResponse>('/onboarding/orgs-status', { params }).then((r) => r.data);

export const listOnboardingManagers = (): Promise<OnboardingManager[]> =>
  apiClient
    .get<{ data: OnboardingManager[] }>('/onboarding/managers')
    .then((r) => r.data.data);

export interface OrgUser {
  userId: number;
  name: string;
  email: string;
  role: string;
}

export const listOrgUsers = (orgId: number): Promise<OrgUser[]> =>
  apiClient
    .get<{ data: OrgUser[] }>(`/onboarding/orgs/${orgId}/users`)
    .then((r) => r.data.data);

export interface AssignManagerResponse {
  orgId: number;
  assignedManagerUserId: number | null;
  assignedManagerAt: string | null;
}

export const assignOnboardingManager = (
  orgId: number,
  managerUserId: number | null
): Promise<AssignManagerResponse> =>
  apiClient
    .put<AssignManagerResponse>(`/onboarding/orgs/${orgId}/assign-manager`, { managerUserId })
    .then((r) => r.data);

export interface SendOnboardingEmailPayload {
  templateId: string;
  recipientUserId: number;
  subject: string;
  bodyHtml: string;
}

export const sendOnboardingEmail = (
  orgId: number,
  payload: SendOnboardingEmailPayload
): Promise<{ success: boolean; recipientEmail: string }> =>
  apiClient
    .post<{ success: boolean; recipientEmail: string }>(
      `/onboarding/orgs/${orgId}/send-email`,
      payload
    )
    .then((r) => r.data);
