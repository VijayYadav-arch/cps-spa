import { apiClient } from './client';

export interface RevenuePoint {
  month: string;          // ISO date — first of month
  billedAmount: number;
  collectedAmount: number;
  claimCount: number;
}

export interface RevenueTimeSeries {
  from: string;
  to: string;
  points: RevenuePoint[];
  totalBilled: number;
  totalCollected: number;
  collectionRatePct: number;
}

export interface PayerSliceRow {
  payer: string;
  claimCount: number;
  billedAmount: number;
  collectedAmount: number;
  deniedClaims: number;
  denialRatePct: number;
}

export interface PayerMix {
  from: string;
  to: string;
  rows: PayerSliceRow[];
}

export interface AgingBucket {
  bucket: string;          // "0-30", "31-60", "61-90", "91-120", "120+"
  amount: number;
  claimCount: number;
}

export interface AgingSnapshot {
  asOfDate: string;
  totalOutstanding: number;
  buckets: AgingBucket[];
  daysSalesOutstanding: number;
}

export interface DenialReasonRow {
  carc: string;
  description: string;
  count: number;
  writtenOffAmount: number;
  recoveredAmount: number;
}

export interface DenialAnalysis {
  from: string;
  to: string;
  totalDenials: number;
  openDenials: number;
  resolvedDenials: number;
  topReasons: DenialReasonRow[];
  byPayer: PayerSliceRow[];
}

export interface StatementCollectionStats {
  from: string;
  to: string;
  statementsSent: number;
  statementsPaid: number;
  statementsPartial: number;
  statementsOutstanding: number;
  totalBilled: number;
  totalCollected: number;
  collectionRatePct: number;
  avgDaysToPay: number;
}

export interface DashboardSummary {
  asOfDate: string;
  revenueLast30: number;
  revenueLast90: number;
  outstandingAr: number;
  openDenials: number;
  openStatements: number;
  overallCollectionRatePct: number;
}

const RANGE = '/analytics';

function rangeQuery(from?: string, to?: string): string {
  const p = new URLSearchParams();
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function getRevenue(from?: string, to?: string): Promise<RevenueTimeSeries> {
  const r = await apiClient.get<{ data: RevenueTimeSeries }>(`${RANGE}/revenue${rangeQuery(from, to)}`);
  return r.data.data;
}

export async function getPayerMix(from?: string, to?: string): Promise<PayerMix> {
  const r = await apiClient.get<{ data: PayerMix }>(`${RANGE}/payer-mix${rangeQuery(from, to)}`);
  return r.data.data;
}

export async function getArAging(): Promise<AgingSnapshot> {
  const r = await apiClient.get<{ data: AgingSnapshot }>(`${RANGE}/ar-aging`);
  return r.data.data;
}

export async function getDenialAnalysis(from?: string, to?: string): Promise<DenialAnalysis> {
  const r = await apiClient.get<{ data: DenialAnalysis }>(`${RANGE}/denials${rangeQuery(from, to)}`);
  return r.data.data;
}

export async function getStatementCollection(from?: string, to?: string): Promise<StatementCollectionStats> {
  const r = await apiClient.get<{ data: StatementCollectionStats }>(`${RANGE}/statement-collection${rangeQuery(from, to)}`);
  return r.data.data;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const r = await apiClient.get<{ data: DashboardSummary }>(`${RANGE}/dashboard`);
  return r.data.data;
}
