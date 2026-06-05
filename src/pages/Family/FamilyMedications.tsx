import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { familyApi } from '@/portal/familyApi';
import { usePortalAuth } from '@/portal/PortalAuthContext';

interface Medication {
  id: number;
  name: string;
  genericName: string | null;
  dosage: string;
  route: string;
  frequency: string;
  purpose: string | null;
}

interface MedicationsResponse {
  data: Medication[];
}

export function FamilyMedications() {
  const { session } = usePortalAuth();
  const patientId = session?.patientId;
  const [meds, setMeds] = useState<Medication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!patientId) return;
    familyApi
      .get<MedicationsResponse>(`/patients/${patientId}/medications`)
      .then((r) => setMeds(r.data.data ?? []))
      .catch(() => setError(t('family.medications.loadFailed')));
  }, [patientId, t]);

  if (error) {
    return (
      <p data-testid="family-error" role="alert" style={{ color: '#dc2626', padding: 16 }}>
        {error}
      </p>
    );
  }
  if (meds === null) {
    return (
      <p data-testid="family-loading" style={{ color: '#94a3b8', padding: 16 }}>
        {t('common.loading')}
      </p>
    );
  }

  return (
    <section style={{ padding: 16 }}>
      <h1
        data-testid="page-title"
        style={{ fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 24 }}
      >
        {t('family.medications.title')}
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-testid="medications-list">
        {meds.map((m) => (
          <div
            key={m.id}
            data-testid="medication-item"
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <p style={{ fontWeight: 500, color: '#1e293b', margin: 0 }}>
              {m.name}
              {m.genericName ? ` (${m.genericName})` : ''}
            </p>
            <p style={{ fontSize: 14, color: '#64748b', margin: '2px 0 0' }}>
              {m.dosage} — {m.route} — {m.frequency}
            </p>
            {m.purpose && (
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>{m.purpose}</p>
            )}
          </div>
        ))}
        {meds.length === 0 && (
          <p data-testid="medications-empty" style={{ color: '#94a3b8' }}>
            {t('family.medications.empty')}
          </p>
        )}
      </div>
    </section>
  );
}
