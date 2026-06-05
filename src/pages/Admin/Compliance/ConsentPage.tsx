import { useEffect, useState } from 'react';
import { listConsentForms, type ConsentForm } from '@/api/consentForms';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  signed: 'bg-green-50 text-green-700 border-green-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  revoked: 'bg-slate-50 text-slate-600 border-slate-200',
};

const FORM_TYPE_LABELS: Record<string, string> = {
  'election-of-benefits': 'Election of Benefits',
  abn: 'ABN',
  'hipaa-auth': 'HIPAA Auth',
  'consent-to-treat': 'Consent to Treat',
  dnr: 'DNR',
  'advance-directive': 'Advance Directive',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
        STATUS_BADGE[status] ?? STATUS_BADGE.pending
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function FormTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700">
      {FORM_TYPE_LABELS[type] ?? type}
    </span>
  );
}

export function ConsentPage() {
  const [forms, setForms] = useState<ConsentForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listConsentForms({ pageSize: 100 })
      .then((res) => {
        if (!cancelled) setForms(res.data ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message || 'Failed to load consent forms');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingCount = forms.filter((f) => f.status === 'pending').length;

  return (
    <section className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-serif text-slate-900">Consent Forms</h1>
        <p className="text-slate-600 mt-1">
          Manage patient consent forms and advance directives.
        </p>
      </header>

      {pendingCount > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-700 font-semibold">
            {pendingCount} consent form(s) pending signature
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading consent forms...</div>
        ) : forms.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium mb-1">No consent forms yet</p>
            <p className="text-sm">Patient consent forms will appear here.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Patient ID</th>
                <th className="px-5 py-3">Form Type</th>
                <th className="px-5 py-3">Signed By</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Witness</th>
                <th className="px-5 py-3">Expiration</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forms.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-medium">{f.patientId}</td>
                  <td className="px-5 py-4"><FormTypeBadge type={f.formType} /></td>
                  <td className="px-5 py-4 text-sm">
                    {f.signedBy ?? '—'}
                    {f.relationship && (
                      <span className="text-xs text-slate-400 ml-1">({f.relationship})</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {f.signedAt ? new Date(f.signedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm">{f.witnessName ?? '—'}</td>
                  <td className="px-5 py-4 text-sm">
                    {f.expirationDate ? new Date(f.expirationDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
