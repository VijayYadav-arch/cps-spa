import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getClaims, type ClaimSummary } from '@/api/claims';

export function ClaimsList() {
  const [claims, setClaims] = useState<ClaimSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getClaims({ page, pageSize: 20, status: statusFilter || undefined })
      .then((res) => {
        if (!cancelled) {
          setClaims(res.data);
          setTotalPages(res.pagination.totalPages);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load claims. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, statusFilter]);

  if (isLoading) return <div role="status">Loading claims…</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Claims</h2>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="paid">Paid</option>
          <option value="denied">Denied</option>
        </select>
      </div>

      {claims.length === 0 ? (
        <p>No claims found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>ID</th>
              <th style={{ padding: '8px 12px' }}>Patient</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Amount</th>
              <th style={{ padding: '8px 12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px' }}>{c.id}</td>
                <td style={{ padding: '8px 12px' }}>{c.patientName}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 12,
                    background: c.status === 'paid' ? '#dcfce7' : c.status === 'denied' ? '#fee2e2' : '#f1f5f9',
                    color: c.status === 'paid' ? '#166534' : c.status === 'denied' ? '#991b1b' : '#475569',
                  }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>${c.amount.toFixed(2)}</td>
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/claims/${c.id}`} style={{ color: '#2563eb' }}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
      </div>
    </div>
  );
}
