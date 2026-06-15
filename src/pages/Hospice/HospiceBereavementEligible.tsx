import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  completeBereavementProgram,
  listEligibleForCompletion,
  type BereavementProgram,
} from '@/api/hospice';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

export function HospiceBereavementEligible() {
  const [programs, setPrograms] = useState<BereavementProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Complete hits POST /hospice/bereavement/programs/{id}/complete
  // → [Authorize(hospice:bereavement)].
  const canManage = usePermission(PERMISSIONS.HOSPICE_BEREAVEMENT);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listEligibleForCompletion();
      setPrograms(res.data);
    } catch {
      setError('Failed to load eligible-for-completion list.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleComplete(id: number) {
    setBusyId(id);
    try {
      await completeBereavementProgram(id);
      await refresh();
    } catch {
      setError('Failed to complete program.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        Bereavement — Eligible for Completion
      </h2>
      <p style={{ color: '#64748b', marginBottom: 12 }}>
        Programs whose 13-month window has elapsed and are ready for completion.
      </p>
      {isLoading && <div role="status">Loading…</div>}
      {error && <div role="alert">{error}</div>}
      {!isLoading && !error && programs.length === 0 && (
        <p style={{ color: '#64748b' }}>No programs eligible for completion.</p>
      )}
      {!isLoading && !error && programs.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Program #</th>
              <th style={{ padding: '8px 12px' }}>Patient</th>
              <th style={{ padding: '8px 12px' }}>Date of Death</th>
              <th style={{ padding: '8px 12px' }}>Ends</th>
              <th style={{ padding: '8px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/hospice/bereavement/${p.id}`}>#{p.id}</Link>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/patients/${p.patientId}`}>#{p.patientId}</Link>
                </td>
                <td style={{ padding: '8px 12px' }}>{p.dateOfDeath}</td>
                <td style={{ padding: '8px 12px' }}>{p.programEndDate}</td>
                <td style={{ padding: '8px 12px' }}>
                  <button
                    disabled={busyId === p.id || !canManage}
                    onClick={() => void handleComplete(p.id)}
                    title={!canManage ? NO_PERMISSION : undefined}
                    style={{ cursor: (busyId === p.id || !canManage) ? 'not-allowed' : 'pointer' }}
                  >
                    {busyId === p.id ? 'Completing…' : 'Complete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
