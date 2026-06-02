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
      <div style={{ padding: '1rem', color: 'red' }} role="alert">
        Failed to load dashboard.
      </div>
    );
  if (loading) return <div style={{ padding: '1rem' }}>Loading…</div>;

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
    <div style={{ padding: '1rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 data-testid="page-title" style={{ fontSize: 24, fontWeight: 600 }}>
          Welcome back{user ? `, ${user.firstName}` : ''}
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          {now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #f1f5f9',
          }}
        >
          <p style={{ fontSize: 12, color: '#64748b' }}>This Month</p>
          <p
            data-testid="stat-this-month"
            style={{ fontSize: 22, fontWeight: 700, color: '#0d9488' }}
          >
            {currency(paidThisMonth)}
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>Collections</p>
        </div>
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #f1f5f9',
          }}
        >
          <p style={{ fontSize: 12, color: '#64748b' }}>Active Claims</p>
          <p data-testid="stat-active-claims" style={{ fontSize: 22, fontWeight: 700 }}>
            {totalClaimsCount}
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>All time</p>
        </div>
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #f1f5f9',
          }}
        >
          <p style={{ fontSize: 12, color: '#64748b' }}>Pending</p>
          <p style={{ fontSize: 22, fontWeight: 700 }}>{pendingCount}</p>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>Awaiting resolution</p>
        </div>
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #f1f5f9',
          }}
        >
          <p style={{ fontSize: 12, color: '#64748b' }}>Outstanding</p>
          <p
            data-testid="stat-outstanding"
            style={{ fontSize: 22, fontWeight: 700 }}
          >
            {currency(outstandingTotal)}
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>Pending value</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #f1f5f9',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ fontWeight: 600 }}>Recent Claims</h2>
            <Link
              to="/portal/claims"
              style={{ color: '#0d9488', fontSize: 14, textDecoration: 'none' }}
            >
              View all
            </Link>
          </div>
          {recentClaims.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              No claims yet.
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: 12 }}>Claim #</th>
                  <th style={{ padding: 12 }}>Patient</th>
                  <th style={{ padding: 12 }}>Date</th>
                  <th style={{ padding: 12 }}>Amount</th>
                  <th style={{ padding: 12 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentClaims.map((claim) => (
                  <tr key={claim.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td
                      style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}
                    >
                      {claim.claimNumber}
                    </td>
                    <td style={{ padding: 12 }}>{claim.patientName}</td>
                    <td style={{ padding: 12, color: '#64748b' }}>
                      {formatDate(claim.serviceDate)}
                    </td>
                    <td style={{ padding: 12, fontWeight: 500 }}>
                      {currency(claim.amount)}
                    </td>
                    <td style={{ padding: 12 }}>{claim.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #f1f5f9',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ fontWeight: 600 }}>Recent Reports</h2>
            <Link
              to="/portal/reports"
              style={{ color: '#0d9488', fontSize: 14, textDecoration: 'none' }}
            >
              View all
            </Link>
          </div>
          {reports.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              No reports yet.
            </div>
          ) : (
            <div>
              {reports.map((report) => (
                <div
                  key={report.id}
                  style={{ padding: 12, borderTop: '1px solid #f1f5f9' }}
                >
                  <p style={{ fontWeight: 500, fontSize: 14 }}>{report.title}</p>
                  <p style={{ fontSize: 12, color: '#64748b' }}>{report.period}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
