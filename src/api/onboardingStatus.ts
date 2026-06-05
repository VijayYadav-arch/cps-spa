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
