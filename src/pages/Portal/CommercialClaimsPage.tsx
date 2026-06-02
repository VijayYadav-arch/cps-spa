import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '@/api/client';

interface Claim {
  id: number;
  claimNumber: string;
  patientName: string;
  serviceDate: string;
  payer: string;
  amount: number;
  paidAmount: number | null;
  status: string;
  denialReason: string | null;
}

interface ClaimsEnvelope {
  data: Claim[];
  pagination?: { totalCount: number };
}

const currency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Denied', value: 'denied' },
  { label: 'Submitted', value: 'submitted' },
];

export function CommercialClaimsPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'all';

  const [claims, setClaims] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const qs = status && status !== 'all' ? `?status=${status}` : '';

    const filteredP = apiClient.get<ClaimsEnvelope>(`/claims${qs}`);
    const allP =
      status && status !== 'all'
        ? apiClient.get<ClaimsEnvelope>('/claims')
        : filteredP;

    Promise.all([filteredP, allP])
      .then(([filteredRes, allRes]) => {
        if (cancelled) return;
        setClaims(filteredRes.data.data ?? []);
        setAllClaims(allRes.data.data ?? []);
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
  }, [status]);

  if (error)
    return (
      <div style={{ padding: '1rem', color: 'red' }} role="alert">
        Failed to load claims.
      </div>
    );
  if (loading) return <div style={{ padding: '1rem' }}>Loading…</div>;

  const totalBilled = allClaims.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = allClaims
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);
  const totalPending = allClaims
    .filter((c) => c.status === 'submitted' || c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div style={{ padding: '1rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 data-testid="page-title" style={{ fontSize: 24, fontWeight: 600 }}>
          Claims
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Track and manage all your billing claims
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #f1f5f9',
          }}
        >
          <p style={{ fontSize: 12, color: '#64748b' }}>Total Claims</p>
          <p data-testid="stat-total-claims" style={{ fontSize: 20, fontWeight: 700 }}>
            {allClaims.length}
          </p>
        </div>
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #f1f5f9',
          }}
        >
          <p style={{ fontSize: 12, color: '#64748b' }}>Total Billed</p>
          <p data-testid="stat-total-billed" style={{ fontSize: 20, fontWeight: 700 }}>
            {currency(totalBilled)}
          </p>
        </div>
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #f1f5f9',
          }}
        >
          <p style={{ fontSize: 12, color: '#64748b' }}>Total Paid</p>
          <p data-testid="stat-total-paid" style={{ fontSize: 20, fontWeight: 700 }}>
            {currency(totalPaid)}
          </p>
        </div>
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #f1f5f9',
          }}
        >
          <p style={{ fontSize: 12, color: '#64748b' }}>Total Pending</p>
          <p data-testid="stat-total-pending" style={{ fontSize: 20, fontWeight: 700 }}>
            {currency(totalPending)}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => {
          const isActive = status === f.value;
          const to = f.value === 'all' ? '/portal/claims' : `/portal/claims?status=${f.value}`;
          return (
            <Link
              key={f.value}
              to={to}
              data-testid={`filter-${f.value}`}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
                background: isActive ? '#0f172a' : 'white',
                color: isActive ? 'white' : '#475569',
                border: isActive ? 'none' : '1px solid #e2e8f0',
              }}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div
        data-testid="claims-list"
        style={{
          background: 'white',
          borderRadius: 12,
          border: '1px solid #f1f5f9',
          overflow: 'hidden',
        }}
      >
        {claims.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            No claims found.
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Claim #</th>
                <th style={{ padding: 12 }}>Patient</th>
                <th style={{ padding: 12 }}>Service Date</th>
                <th style={{ padding: 12 }}>Payer</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Amount</th>
                <th style={{ padding: 12 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr
                  key={claim.id}
                  data-testid="claim-row"
                  style={{ borderTop: '1px solid #f1f5f9' }}
                >
                  <td
                    data-testid="claim-id"
                    style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}
                  >
                    {claim.claimNumber}
                  </td>
                  <td style={{ padding: 12, fontWeight: 500 }}>{claim.patientName}</td>
                  <td style={{ padding: 12, color: '#64748b' }}>
                    {formatDate(claim.serviceDate)}
                  </td>
                  <td style={{ padding: 12, color: '#64748b' }}>{claim.payer}</td>
                  <td
                    data-testid="claim-amount"
                    style={{ padding: 12, textAlign: 'right', fontWeight: 500 }}
                  >
                    {currency(claim.amount)}
                  </td>
                  <td data-testid="claim-status" style={{ padding: 12 }}>
                    {claim.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
