import { portalClient } from './portalClient';

export interface PortalLoginRequest {
  patientId: number;
  pin: string;
}

export interface PortalLoginResponse {
  token: string;
  expiresAt: string;
}

export interface PortalMe {
  patientId: number;
  relationshipLabel: string;
  email: string | null;
  phoneNumber: string | null;
}

export interface PortalSummary {
  patientName: string;
  recentVisits: number;
  openBalance: number;
  nextAppointment: string | null;
}

export interface StatementLineSnapshot {
  claimId: number | null;
  serviceDate: string;
  description: string;
  balance: number;
}

export interface PortalStatement {
  id: number;
  patientId: number;
  status: string;
  statementDate: string;
  dueDate: string;
  patientBalance: number;
  amountPaid: number;
  balanceRemaining: number;
  dunningCycle: number;
  paidAt: string | null;
  lineItems: StatementLineSnapshot[];
}

export interface PortalPaymentRequest {
  amount: number;
  method: 'card' | 'ach' | 'demo';
  cardNumber?: string;
  nameOnCard?: string;
}

export interface PortalPaymentResult {
  paymentId: number;
  statementRunId: number;
  confirmationNumber: string;
  amount: number;
  method: string;
  last4: string | null;
  newStatus: string;
  newBalanceRemaining: number;
  paidAtUtc: string;
}

export interface PortalDocument {
  id: number;
  fileName: string;
  category: string;
  uploadedAt: string;
}

export async function portalLogin(req: PortalLoginRequest): Promise<PortalLoginResponse> {
  const r = await portalClient.post<PortalLoginResponse>('/auth/login', req);
  return r.data;
}

export async function portalMe(): Promise<PortalMe> {
  const r = await portalClient.get<PortalMe>('/me');
  return r.data;
}

export async function portalSummary(patientId: number): Promise<PortalSummary> {
  const r = await portalClient.get<PortalSummary>(`/patients/${patientId}/summary`);
  return r.data;
}

export async function portalStatements(patientId: number): Promise<PortalStatement[]> {
  const r = await portalClient.get<{ data: PortalStatement[] }>(`/patients/${patientId}/statements`);
  return r.data.data ?? [];
}

export async function portalStatement(patientId: number, runId: number): Promise<PortalStatement> {
  const r = await portalClient.get<{ data: PortalStatement }>(`/patients/${patientId}/statements/${runId}`);
  return r.data.data;
}

export async function portalDocuments(patientId: number): Promise<PortalDocument[]> {
  const r = await portalClient.get<{ data: PortalDocument[] }>(`/patients/${patientId}/documents`);
  return r.data.data ?? [];
}

export async function portalPayStatement(
  patientId: number,
  runId: number,
  req: PortalPaymentRequest,
): Promise<PortalPaymentResult> {
  const r = await portalClient.post<PortalPaymentResult>(
    `/patients/${patientId}/statements/${runId}/pay`,
    req,
  );
  return r.data;
}
