import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/api/client';

interface Referral {
  id: number;
  referralDate: string;
  patientName: string;
  sourceName: string;
  sourceType: string;
  primaryDiagnosis?: string | null;
  urgency: string;
  status: string;
}

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  evaluating: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  converted: 'bg-teal-50 text-teal-700 border-teal-200',
};

const URGENCY_BADGE: Record<string, string> = {
  stat: 'bg-red-100 text-red-800',
  urgent: 'bg-amber-100 text-amber-800',
  routine: 'bg-slate-100 text-slate-600',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
        STATUS_BADGE[status] ?? STATUS_BADGE.new
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
        URGENCY_BADGE[urgency] ?? URGENCY_BADGE.routine
      }`}
    >
      {urgency.toUpperCase()}
    </span>
  );
}

export function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ data: Referral[] }>('/clinical/referrals')
      .then((res) => {
        if (!cancelled) setReferrals(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load referrals');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pipeline = useMemo(
    () => ({
      new: referrals.filter((r) => r.status === 'new').length,
      evaluating: referrals.filter((r) => r.status === 'evaluating').length,
      accepted: referrals.filter((r) => r.status === 'accepted').length,
      declined: referrals.filter((r) => r.status === 'declined').length,
      converted: referrals.filter((r) => r.status === 'converted').length,
    }),
    [referrals]
  );

  return (
    <section className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-serif text-slate-900">Referrals</h1>
        <p className="text-slate-600 mt-1">Manage the referral intake pipeline</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {Object.entries(pipeline).map(([status, count]) => (
          <div key={status} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
            <p className="text-sm text-slate-500 capitalize">{status}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading referrals...</div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium mb-1">No referrals yet</p>
            <p className="text-sm">Incoming referrals will appear here.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Diagnosis</th>
                <th className="px-5 py-3">Urgency</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {referrals.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm">{new Date(r.referralDate).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-sm font-medium">{r.patientName}</td>
                  <td className="px-5 py-4 text-sm">{r.sourceName}</td>
                  <td className="px-5 py-4 text-sm capitalize">{r.sourceType}</td>
                  <td className="px-5 py-4 text-sm">{r.primaryDiagnosis ?? '—'}</td>
                  <td className="px-5 py-4"><UrgencyBadge urgency={r.urgency} /></td>
                  <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
