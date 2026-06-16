import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';

interface ClaimItem {
  id: number;
  claimNumber: string;
  patientName: string;
  status: string;
  amount: number;
  paidAmount: number | null;
  serviceDate: string;
  updatedAt: string;
}

interface ReportItem {
  id: number;
  title: string;
  type: string;
  period: string;
  summary: string | null;
  createdAt: string;
}

interface ClaimsEnvelope {
  data: ClaimItem[];
}

interface ReportsEnvelope {
  data: ReportItem[];
}

interface UserEnvelope {
  data: { firstName: string; lastName: string; email: string };
}

const currency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export function CommercialDashboardPage() {
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [user, setUser] = useState<{ firstName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.get<ClaimsEnvelope>('/claims?sortBy=serviceDate&sortOrder=desc&pageSize=200'),
      apiClient.get<ReportsEnvelope>('/reports?sortBy=createdAt&sortOrder=desc&pageSize=3'),
      apiClient.get<UserEnvelope>('/users/me'),
    ])
      .then(([claimsRes, reportsRes, userRes]) => {
        if (cancelled) return;
        setClaims(claimsRes.data.data ?? []);
        setReports(reportsRes.data.data ?? []);
        setUser({ firstName: userRes.data.data.firstName });
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        Failed to load dashboard.
      </div>
    );
  if (loading)
    return (
      <div role="status" className="text-slate-500">
        Loading…
      </div>
    );

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const paidThisMonth = claims
    .filter((c) => c.status === 'paid' && new Date(c.updatedAt) >= startOfMonth)
    .reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);

  const totalClaimsCount = claims.length;
  const pendingCount = claims.filter(
    (c) => c.status === 'submitted' || c.status === 'pending',
  ).length;
  const outstandingTotal = claims
    .filter((c) => c.status === 'submitted' || c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);

  const recentClaims = claims.slice(0, 5);

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div>
        <h1 data-testid="page-title" className="text-2xl">
          Welcome back{user ? `, ${user.firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            This Month
          </p>
          <p
            data-testid="stat-this-month"
            className="mt-1.5 text-2xl font-bold text-teal-700"
          >
            {currency(paidThisMonth)}
          </p>
          <p className="text-xs text-slate-400">Collections</p>
        </div>
        <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Active Claims
          </p>
          <p
            data-testid="stat-active-claims"
            className="mt-1.5 text-2xl font-bold text-navy-900"
          >
            {totalClaimsCount}
          </p>
          <p className="text-xs text-slate-400">All time</p>
        </div>
        <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Pending
          </p>
          <p className="mt-1.5 text-2xl font-bold text-navy-900">{pendingCount}</p>
          <p className="text-xs text-slate-400">Awaiting resolution</p>
        </div>
        <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Outstanding
          </p>
          <p
            data-testid="stat-outstanding"
            className="mt-1.5 text-2xl font-bold text-navy-900"
          >
            {currency(outstandingTotal)}
          </p>
          <p className="text-xs text-slate-400">Pending value</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-lg font-semibold">Recent Claims</h2>
            <Link
              to="/portal/claims"
              className="text-sm font-medium text-teal-700 hover:underline"
            >
              View all
            </Link>
          </div>
          {recentClaims.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No claims yet.</div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Claim #</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentClaims.map((claim) => (
                  <tr
                    key={claim.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {claim.claimNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{claim.patientName}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(claim.serviceDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {currency(claim.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{claim.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-lg font-semibold">Recent Reports</h2>
            <Link
              to="/portal/reports"
              className="text-sm font-medium text-teal-700 hover:underline"
            >
              View all
            </Link>
          </div>
          {reports.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No reports yet.</div>
          ) : (
            <div>
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="border-t border-slate-100 px-4 py-3"
                >
                  <p className="text-sm font-medium text-slate-700">{report.title}</p>
                  <p className="text-xs text-slate-500">{report.period}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
