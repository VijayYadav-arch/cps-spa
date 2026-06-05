import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!patientId) return;
    familyApi
      .get<VisitsResponse>(`/patients/${patientId}/visits`)
      .then((r) => setVisits(r.data.data ?? []))
      .catch(() => setError(t('family.visits.loadFailed')));
  }, [patientId, t]);

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
        {t('common.loading')}
      </p>
    );
  }
  const dateLocale = i18n.resolvedLanguage ?? 'en-US';

  return (
    <section style={{ padding: 16 }}>
      <h1
        data-testid="page-title"
        style={{ fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 24 }}
      >
        {t('family.visits.title')}
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
                {t('family.visits.columnDate')}
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 500 }}>
                {t('family.visits.columnType')}
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 500 }}>
                {t('family.visits.columnStatus')}
              </th>
            </tr>
          </thead>
          <tbody data-testid="visits-rows">
            {visits.map((v) => (
              <tr key={v.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px' }}>
                  {new Date(v.visitDate).toLocaleDateString(dateLocale)}
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
                  {t('family.visits.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
