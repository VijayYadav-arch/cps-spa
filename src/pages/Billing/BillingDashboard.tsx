import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkQueue, getDenials, type WorkQueueStats, type DenialItem } from '@/api/billing';

export function BillingDashboard() {
  const [stats, setStats] = useState<WorkQueueStats | null>(null);
  const [denials, setDenials] = useState<DenialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getWorkQueue(),
      getDenials({ pageSize: 5 }),
    ])
      .then(([wq, dn]) => {
        if (!cancelled) {
          setStats(wq.stats);
          setDenials(dn.data);
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load billing data.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (isLoading) return <div role="status">Loading billing dashboard…</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Billing Dashboard</h2>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Items', value: stats.total },
            { label: 'Pending', value: stats.pending },
            { label: 'In Progress', value: stats.inProgress },
            { label: 'Completed', value: stats.completed },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 28, fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontWeight: 600 }}>Recent Denials</h3>
          <Link to="/billing/denials" style={{ color: '#2563eb', fontSize: 14 }}>View all</Link>
        </div>
        {denials.length === 0 ? (
          <p style={{ color: '#64748b' }}>No recent denials.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>ID</th>
                <th style={{ padding: '6px 10px' }}>Payer</th>
                <th style={{ padding: '6px 10px' }}>Code</th>
                <th style={{ padding: '6px 10px' }}>Status</th>
                <th style={{ padding: '6px 10px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {denials.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>{d.id}</td>
                  <td style={{ padding: '6px 10px' }}>{d.payerName}</td>
                  <td style={{ padding: '6px 10px' }}>{d.denialCode}</td>
                  <td style={{ padding: '6px 10px' }}>{d.status}</td>
                  <td style={{ padding: '6px 10px' }}>
                    {(() => { const dt = new Date(d.denialDate); return isNaN(dt.getTime()) ? d.denialDate : dt.toLocaleDateString(); })()}
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
