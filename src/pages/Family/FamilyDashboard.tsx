import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { familyApi } from '@/portal/familyApi';
import { usePortalAuth } from '@/portal/PortalAuthContext';

interface Summary {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  primaryDiagnosis: string | null;
}

export function FamilyDashboard() {
  const { session } = usePortalAuth();
  const patientId = session?.patientId;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!patientId) return;
    familyApi
      .get<Summary>(`/patients/${patientId}/summary`)
      .then((r) => setSummary(r.data))
      .catch(() => setError(t('family.dashboard.loadFailed')));
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
  if (!summary) {
    return (
      <p data-testid="family-loading" role="status" className="p-4 text-slate-500">
        {t('common.loading')}
      </p>
    );
  }
  const dateLocale = i18n.resolvedLanguage ?? 'en-US';

  return (
    <section className="grid max-w-[1200px] gap-6 p-6">
      <h1 data-testid="page-title" className="text-2xl">
        {summary.firstName} {summary.lastName}
      </h1>
      <div className="max-w-[480px] rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {summary.dateOfBirth && (
          <p className="mb-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">{t('family.dashboard.dobLabel')}</span>{' '}
            <span data-testid="patient-dob">
              {new Date(summary.dateOfBirth).toLocaleDateString(dateLocale)}
            </span>
          </p>
        )}
        {summary.primaryDiagnosis && (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-700">{t('family.dashboard.primaryDiagnosisLabel')}</span>{' '}
            <span data-testid="patient-diagnosis">{summary.primaryDiagnosis}</span>
          </p>
        )}
      </div>
    </section>
  );
}
