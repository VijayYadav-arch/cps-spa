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
      <p
        data-testid="family-error"
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </p>
    );
  }
  if (visits === null) {
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
        {t('family.visits.title')}
      </h1>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
              <th className="px-4 py-3">{t('family.visits.columnDate')}</th>
              <th className="px-4 py-3">{t('family.visits.columnType')}</th>
              <th className="px-4 py-3">{t('family.visits.columnStatus')}</th>
            </tr>
          </thead>
          <tbody data-testid="visits-rows">
            {visits.map((v) => (
              <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">
                  {new Date(v.visitDate).toLocaleDateString(dateLocale)}
                </td>
                <td className="px-4 py-3 capitalize text-slate-700">
                  {v.visitType.replace(/-/g, ' ')}
                </td>
                <td className="px-4 py-3 capitalize text-slate-700">{v.status}</td>
              </tr>
            ))}
            {visits.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-slate-500"
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
