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
      <p
        data-testid="family-error"
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </p>
    );
  }
  if (meds === null) {
    return (
      <p data-testid="family-loading" role="status" className="p-4 text-slate-500">
        {t('common.loading')}
      </p>
    );
  }

  return (
    <section className="grid max-w-[1200px] gap-6 p-6">
      <h1 data-testid="page-title" className="text-2xl">
        {t('family.medications.title')}
      </h1>
      <div className="flex flex-col gap-3" data-testid="medications-list">
        {meds.map((m) => (
          <div
            key={m.id}
            data-testid="medication-item"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="m-0 font-medium text-navy-900">
              {m.name}
              {m.genericName ? ` (${m.genericName})` : ''}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {m.dosage} — {m.route} — {m.frequency}
            </p>
            {m.purpose && (
              <p className="mt-1 text-xs text-slate-400">{m.purpose}</p>
            )}
          </div>
        ))}
        {meds.length === 0 && (
          <p data-testid="medications-empty" className="text-slate-500">
            {t('family.medications.empty')}
          </p>
        )}
      </div>
    </section>
  );
}
