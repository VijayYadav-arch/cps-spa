import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPatients, type PatientSummary } from '@/api/patients';

export function PatientsList() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getPatients({ page, pageSize: 20 })
      .then((res) => {
        if (!cancelled) {
          setPatients(res.data);
          setTotalPages(res.pagination.totalPages);
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load patients.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  if (isLoading) return <div role="status">Loading patients…</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Patients</h2>
      {patients.length === 0 ? (
        <p>No patients found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>ID</th>
              <th style={{ padding: '8px 12px' }}>Name</th>
              <th style={{ padding: '8px 12px' }}>Date of Birth</th>
              <th style={{ padding: '8px 12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px' }}>{p.id}</td>
                <td style={{ padding: '8px 12px' }}>{p.firstName} {p.lastName}</td>
                <td style={{ padding: '8px 12px' }}>{new Date(p.dateOfBirth).toLocaleDateString()}</td>
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/patients/${p.id}`} style={{ color: '#2563eb' }}>View</Link>
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
