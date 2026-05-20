import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePortalAuth } from '@/portal/PortalAuthContext';
import { portalPayments, type PortalPaymentHistoryItem } from '@/portal/portalApi';

function money(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export function PortalPayments() {
  const { me } = usePortalAuth();
  const [items, setItems] = useState<PortalPaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    portalPayments(me.patientId)
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;
  if (loading) return <div>Loading…</div>;
  if (error) return <div style={{ color: '#dc2626' }}>{error}</div>;

  if (items.length === 0) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Payment history</h1>
        <div style={{ color: '#64748b' }}>
          You haven't made any payments yet.{' '}
          <Link to="/portal/statements">View statements</Link>
        </div>
      </div>
    );
  }

  const total = items.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Payment history</h1>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
        <strong style={{ color: '#0f172a' }}>{items.length}</strong> payment
        {items.length === 1 ? '' : 's'} totalling{' '}
        <strong style={{ color: '#0f172a' }}>{money(total)}</strong>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
            <th style={{ textAlign: 'left', padding: '8px 6px' }}>Date</th>
            <th style={{ textAlign: 'left', padding: '8px 6px' }}>Statement</th>
            <th style={{ textAlign: 'left', padding: '8px 6px' }}>Method</th>
            <th style={{ textAlign: 'left', padding: '8px 6px' }}>Confirmation #</th>
            <th style={{ textAlign: 'right', padding: '8px 6px' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 6px' }}>{p.paidAtUtc.slice(0, 10)}</td>
              <td style={{ padding: '8px 6px' }}>
                <Link to={`/portal/statements/${p.statementRunId}`}>#{p.statementRunId}</Link>
              </td>
              <td style={{ padding: '8px 6px' }}>
                {p.method}
                {p.last4 && <span style={{ color: '#64748b' }}> · ending {p.last4}</span>}
              </td>
              <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontSize: 12 }}>
                {p.confirmationNumber}
              </td>
              <td style={{ padding: '8px 6px', textAlign: 'right' }}>{money(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
