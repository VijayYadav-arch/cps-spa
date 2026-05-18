import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listBereavementPrograms,
  type BereavementProgram,
  type BereavementProgramStatus,
} from '@/api/hospice';

const STATUSES: BereavementProgramStatus[] = ['Active', 'Completed', 'Closed'];

export function HospiceBereavementList() {
  const [status, setStatus] = useState<BereavementProgramStatus>('Active');
  const [programs, setPrograms] = useState<BereavementProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    listBereavementPrograms(status)
      .then((res) => setPrograms(res.data))
      .catch(() => setError('Failed to load bereavement programs.'))
      .finally(() => setIsLoading(false));
  }, [status]);

  return (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        Bereavement Programs
      </h2>
      <div role="tablist" style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: 16 }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={status === s}
            onClick={() => setStatus(s)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              borderBottom: status === s ? '2px solid #2563eb' : 'none',
              marginBottom: -2,
              fontWeight: status === s ? 700 : 400,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && <div role="status">Loading…</div>}
      {error && <div role="alert">{error}</div>}
      {!isLoading && !error && programs.length === 0 && (
        <p style={{ color: '#64748b' }}>No programs in this status.</p>
      )}
      {!isLoading && !error && programs.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Program #</th>
              <th style={{ padding: '8px 12px' }}>Patient ID</th>
              <th style={{ padding: '8px 12px' }}>Date of Death</th>
              <th style={{ padding: '8px 12px' }}>Program Ends</th>
              <th style={{ padding: '8px 12px' }}>Days Remaining</th>
              <th style={{ padding: '8px 12px' }}>Risk</th>
              <th style={{ padding: '8px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px' }}>{p.id}</td>
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/patients/${p.patientId}`}>#{p.patientId}</Link>
                </td>
                <td style={{ padding: '8px 12px' }}>{p.dateOfDeath}</td>
                <td style={{ padding: '8px 12px' }}>{p.programEndDate}</td>
                <td style={{ padding: '8px 12px' }}>{p.daysUntilProgramEnd}</td>
                <td style={{ padding: '8px 12px' }}>{p.initialRiskLevel ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/hospice/bereavement/${p.id}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
