import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkQueue, type WorkQueueItem } from '@/api/hospice';

type Tab = 'recerts' | 'noe';

export function HospiceWorkQueue() {
  const [recerts, setRecerts] = useState<WorkQueueItem[]>([]);
  const [noe, setNoe] = useState<WorkQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('recerts');

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    getWorkQueue()
      .then((res) => {
        setRecerts(res.recertsDue);
        setNoe(res.noeOverdue);
      })
      .catch(() => setError('Failed to load work queue.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div role="status">Loading work queue…</div>;
  if (error) return <div role="alert">{error}</div>;

  const items = tab === 'recerts' ? recerts : noe;
  const emptyMessage =
    tab === 'recerts'
      ? 'No items due in the next 15 days.'
      : 'No overdue NOEs.';

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        Hospice Work Queue
      </h2>

      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 16,
        }}
      >
        <button
          role="tab"
          aria-selected={tab === 'recerts'}
          onClick={() => setTab('recerts')}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: 'none',
            borderBottom: tab === 'recerts' ? '2px solid #2563eb' : 'none',
            marginBottom: -2,
            fontWeight: tab === 'recerts' ? 700 : 400,
          }}
        >
          Recerts Due ({recerts.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === 'noe'}
          onClick={() => setTab('noe')}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: 'none',
            borderBottom: tab === 'noe' ? '2px solid #2563eb' : 'none',
            marginBottom: -2,
            fontWeight: tab === 'noe' ? 700 : 400,
          }}
        >
          NOE Overdue ({noe.length})
        </button>
      </div>

      {items.length === 0 ? (
        <p style={{ color: '#64748b' }}>{emptyMessage}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Patient</th>
              <th style={{ padding: '8px 12px' }}>Due Date</th>
              <th style={{ padding: '8px 12px' }}>
                {tab === 'recerts' ? 'Days Until Due' : 'Days Overdue'}
              </th>
              {tab === 'recerts' && (
                <th style={{ padding: '8px 12px' }}>Period</th>
              )}
              <th style={{ padding: '8px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={`${item.type}-${item.electionId}`}
                style={{ borderBottom: '1px solid #f1f5f9' }}
              >
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/patients/${item.patientId}`}>
                    {item.patientName}
                  </Link>
                </td>
                <td style={{ padding: '8px 12px' }}>{item.dueDate}</td>
                <td style={{ padding: '8px 12px' }}>
                  {tab === 'recerts' ? item.daysUntilDue : item.daysOverdue}
                </td>
                {tab === 'recerts' && (
                  <td style={{ padding: '8px 12px' }}>{item.periodNumber}</td>
                )}
                <td style={{ padding: '8px 12px' }}>
                  <Link
                    to={`/patients/${item.patientId}/hospice/${item.electionId}`}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
