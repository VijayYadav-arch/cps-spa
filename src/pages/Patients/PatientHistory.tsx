import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientHistory, type PatientHistoryEvent } from '@/api/patients';

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'encounter', label: 'Encounters' },
  { value: 'visit', label: 'Visits' },
  { value: 'medication', label: 'Medications' },
  { value: 'admission', label: 'Admissions' },
  { value: 'hospice', label: 'Hospice (all)' },
  { value: 'hospice-election', label: 'Elections' },
  { value: 'hospice-noe', label: 'NOEs' },
  { value: 'hospice-hope', label: 'HOPE' },
  { value: 'hospice-cert', label: 'Certifications' },
  { value: 'hospice-ftf', label: 'FTF' },
  { value: 'hospice-addendum', label: 'Addenda' },
  { value: 'hospice-notr', label: 'NOTR' },
  { value: 'bereavement', label: 'Bereavement' },
];

const TYPE_BADGE_COLOR: Record<string, string> = {
  encounter: '#0e7490',
  visit: '#7c3aed',
  medication: '#15803d',
  admission: '#b45309',
  'hospice-election': '#1d4ed8',
  'hospice-noe': '#1d4ed8',
  'hospice-hope': '#1d4ed8',
  'hospice-cert': '#1d4ed8',
  'hospice-ftf': '#1d4ed8',
  'hospice-addendum': '#1d4ed8',
  'hospice-notr': '#b91c1c',
  bereavement: '#6d28d9',
};

function formatDate(iso: string) {
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? iso : dt.toLocaleDateString();
}

export function PatientHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<PatientHistoryEvent[]>([]);
  const [pagination, setPagination] = useState<{ totalPages: number; page: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getPatientHistory(parseInt(id, 10), { type: typeFilter || undefined, page })
      .then((res) => {
        if (!cancelled) {
          setEvents(res.data);
          setPagination(res.pagination);
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load patient history.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id, typeFilter, page]);

  return (
    <div>
      <button onClick={() => navigate(`/patients/${id}`)} style={{ marginBottom: 16 }}>
        ← Back to Patient
      </button>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Patient History</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TYPE_FILTERS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTypeFilter(t.value); setPage(1); }}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: '1px solid #cbd5e1',
              background: typeFilter === t.value ? '#2563eb' : '#fff',
              color: typeFilter === t.value ? '#fff' : '#1e293b',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <div role="status">Loading history…</div>}
      {error && <div role="alert">{error}</div>}

      {!isLoading && !error && events.length === 0 && (
        <p>No history events found.</p>
      )}

      {!isLoading && !error && events.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Date</th>
              <th style={{ padding: '8px 12px' }}>Type</th>
              <th style={{ padding: '8px 12px' }}>Summary</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={`${e.type}-${e.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{formatDate(e.date)}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: TYPE_BADGE_COLOR[e.type] ?? '#64748b',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {e.type}
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>{e.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span>Page {page} of {pagination.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
