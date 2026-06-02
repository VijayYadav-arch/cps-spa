import { useEffect, useState } from 'react';
import { familyApi } from '@/portal/familyApi';
import { usePortalAuth } from '@/portal/PortalAuthContext';

interface Visit {
  id: number;
  visitDate: string;
  visitType: string;
  status: string;
}

interface VisitsResponse {
  data: Visit[];
}

export function FamilyVisits() {
  const { session } = usePortalAuth();
  const patientId = session?.patientId;
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    familyApi
      .get<VisitsResponse>(`/patients/${patientId}/visits`)
      .then((r) => setVisits(r.data.data ?? []))
      .catch(() =>
        setError('Unable to load visits. Please refresh or contact your care team.'),
      );
  }, [patientId]);

  if (error) {
    return (
      <p data-testid="family-error" role="alert" style={{ color: '#dc2626', padding: 16 }}>
        {error}
      </p>
    );
  }
  if (visits === null) {
    return (
      <p data-testid="family-loading" style={{ color: '#94a3b8', padding: 16 }}>
        Loading…
      </p>
    );
  }

  return (
    <section style={{ padding: 16 }}>
      <h1
        data-testid="page-title"
        style={{ fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 24 }}
      >
        Visit History
      </h1>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 500 }}>
                Date
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 500 }}>
                Type
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 500 }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody data-testid="visits-rows">
            {visits.map((v) => (
              <tr key={v.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px' }}>
                  {new Date(v.visitDate).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>
                  {v.visitType.replace(/-/g, ' ')}
                </td>
                <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{v.status}</td>
              </tr>
            ))}
            {visits.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8' }}
                  data-testid="visits-empty"
                >
                  No visits found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
