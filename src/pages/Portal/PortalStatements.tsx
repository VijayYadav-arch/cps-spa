import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePortalAuth } from '@/portal/PortalAuthContext';
import { portalStatements, type PortalStatement } from '@/portal/portalApi';

function money(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function statusBadge(status: string) {
  const colors: Record<string, [string, string]> = {
    draft: ['#94a3b8', '#f1f5f9'],
    sent: ['#0ea5e9', '#e0f2fe'],
    'partial-pay': ['#f59e0b', '#fef3c7'],
    paid: ['#16a34a', '#dcfce7'],
    'written-off': ['#475569', '#e2e8f0'],
  };
  const [fg, bg] = colors[status] ?? ['#475569', '#f1f5f9'];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        color: fg,
        background: bg,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}

export function PortalStatements() {
  const { me } = usePortalAuth();
  const [statements, setStatements] = useState<PortalStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    portalStatements(me.patientId)
      .then(setStatements)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;
  if (loading) return <div>Loading…</div>;
  if (error) return <div style={{ color: '#dc2626' }}>{error}</div>;

  if (statements.length === 0) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Statements</h1>
        <div style={{ color: '#64748b' }}>You have no statements on file.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Statements</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
            <th style={{ textAlign: 'left', padding: '8px 6px' }}>Statement</th>
            <th style={{ textAlign: 'left', padding: '8px 6px' }}>Status</th>
            <th style={{ textAlign: 'left', padding: '8px 6px' }}>Cycle</th>
            <th style={{ textAlign: 'right', padding: '8px 6px' }}>Due</th>
            <th style={{ textAlign: 'right', padding: '8px 6px' }}>Balance</th>
            <th style={{ textAlign: 'right', padding: '8px 6px' }}>Paid</th>
            <th style={{ textAlign: 'right', padding: '8px 6px' }}></th>
          </tr>
        </thead>
        <tbody>
          {statements.map((s) => {
            const owes = s.status === 'sent' || s.status === 'partial-pay';
            return (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 6px' }}>
                  {s.statementDate.slice(0, 10)}
                </td>
                <td style={{ padding: '8px 6px' }}>{statusBadge(s.status)}</td>
                <td style={{ padding: '8px 6px' }}>{s.dunningCycle}</td>
                <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                  {s.dueDate.slice(0, 10)}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right' }}>{money(s.patientBalance)}</td>
                <td style={{ padding: '8px 6px', textAlign: 'right' }}>{money(s.amountPaid)}</td>
                <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                  {owes && (
                    <Link
                      to={`/portal/statements/${s.id}`}
                      style={{
                        background: '#0ea5e9',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Pay
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
