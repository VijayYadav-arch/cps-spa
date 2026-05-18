import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listHopeOverdue, type HopeAssessment } from '@/api/hospice';

export function HospiceHopeOverdue() {
  const [items, setItems] = useState<HopeAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listHopeOverdue()
      .then((r) => setItems(r.data))
      .catch(() => setError('Failed to load overdue HOPE assessments.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div role="status">Loading overdue HOPE…</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        Overdue HOPE Assessments
      </h2>
      {items.length === 0 ? (
        <p style={{ color: '#64748b' }}>No HOPE assessments overdue.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Submission Type</th>
              <th style={{ padding: '8px 12px' }}>Target Date</th>
              <th style={{ padding: '8px 12px' }}>Deadline</th>
              <th style={{ padding: '8px 12px' }}>Days Overdue</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px' }}>{a.submissionType}</td>
                <td style={{ padding: '8px 12px' }}>{a.targetDate}</td>
                <td style={{ padding: '8px 12px' }}>{a.deadlineDate}</td>
                <td style={{ padding: '8px 12px', color: '#b91c1c' }}>
                  {Math.max(0, -a.daysUntilDeadline)}
                </td>
                <td style={{ padding: '8px 12px' }}>{a.status}</td>
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/patients/${a.hospiceElectionId}/hospice/${a.hospiceElectionId}/hope/${a.id}`}>
                    Open
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
