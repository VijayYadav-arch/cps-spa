import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { familyApi } from '@/portal/familyApi';
import { usePortalAuth } from '@/portal/PortalAuthContext';

interface BillingRow {
  id: number;
  serviceDate: string;
  amount: number;
  status: string;
}

interface BillingResponse {
  data: BillingRow[];
}

export function FamilyBilling() {
  const { session } = usePortalAuth();
  const patientId = session?.patientId;
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<BillingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    familyApi
      .get<BillingResponse>(`/patients/${patientId}/billing`)
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setError(t('family.billing.loadFailed')));
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
  if (rows === null) {
    return (
      <p data-testid="family-loading" role="status" className="p-4 text-slate-500">
        {t('common.loading')}
      </p>
    );
  }

  const dateLocale = i18n.resolvedLanguage ?? 'en-US';

  return (
    <section className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 data-testid="page-title" className="text-2xl">
          {t('family.billing.title')}
        </h1>
        <Link to="/family/payments" className="text-sm font-medium text-teal-700 hover:underline">
          {t('family.billing.statementsLink')}
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
              <th className="px-4 py-3">{t('family.billing.columnServiceDate')}</th>
              <th className="px-4 py-3">{t('family.billing.columnAmount')}</th>
              <th className="px-4 py-3">{t('family.billing.columnStatus')}</th>
            </tr>
          </thead>
          <tbody data-testid="billing-rows">
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">
                  {new Date(r.serviceDate).toLocaleDateString(dateLocale)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {Number(r.amount).toLocaleString(dateLocale, {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </td>
                <td className="px-4 py-3 capitalize text-slate-700">{r.status}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-slate-500"
                  data-testid="billing-empty"
                >
                  {t('family.billing.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
