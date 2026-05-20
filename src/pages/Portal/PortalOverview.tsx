import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePortalAuth } from '@/portal/PortalAuthContext';
import {
  portalStatements,
  portalPayments,
  type PortalStatement,
  type PortalPaymentHistoryItem,
} from '@/portal/portalApi';

function money(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export function PortalOverview() {
  const { me } = usePortalAuth();
  const [statements, setStatements] = useState<PortalStatement[]>([]);
  const [payments, setPayments] = useState<PortalPaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    Promise.all([portalStatements(me.patientId), portalPayments(me.patientId)])
      .then(([s, p]) => {
        setStatements(s);
        setPayments(p);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load overview');
      })
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;

  const openBalance = statements
    .filter((s) => s.status !== 'paid' && s.status !== 'draft')
    .reduce((sum, s) => sum + (s.patientBalance - s.amountPaid), 0);
  const openCount = statements.filter((s) => s.status === 'sent' || s.status === 'partial-pay').length;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Welcome, {me.relationshipLabel}</h1>
      {loading && <div>Loading…</div>}
      {error && <div style={{ color: '#dc2626' }}>{error}</div>}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div
            style={{
              padding: 24,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              minWidth: 220,
            }}
          >
            <div style={{ color: '#64748b', fontSize: 13 }}>Open balance</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: openBalance > 0 ? '#dc2626' : '#16a34a',
                marginTop: 6,
              }}
            >
              {money(openBalance)}
            </div>
            {openCount > 0 && (
              <Link
                to="/portal/statements"
                style={{ marginTop: 12, display: 'inline-block', color: '#0ea5e9' }}
              >
                View {openCount} open statement{openCount === 1 ? '' : 's'} →
              </Link>
            )}
          </div>
          <div
            style={{
              padding: 24,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              minWidth: 220,
            }}
          >
            <div style={{ color: '#64748b', fontSize: 13 }}>Total statements</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{statements.length}</div>
          </div>
          <div
            style={{
              padding: 24,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              minWidth: 220,
            }}
          >
            <div style={{ color: '#64748b', fontSize: 13 }}>Lifetime payments</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a', marginTop: 6 }}>
              {money(payments.reduce((sum, p) => sum + p.amount, 0))}
            </div>
            {payments.length > 0 && (
              <Link
                to="/portal/payments"
                style={{ marginTop: 12, display: 'inline-block', color: '#0ea5e9' }}
              >
                View payment history →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
