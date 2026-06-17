import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  convertedPatientId?: number | null;
}

// Full referral as returned by GET /clinical/referrals/{id} (adds the PHI fields the
// list view omits) — used to prefill the intake wizard on conversion.
interface ReferralDetail extends Referral {
  patientPhone?: string | null;
  patientDOB?: string | null;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
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
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState<number | null>(null);

  async function handleConvert(id: number) {
    setConverting(id);
    setError(null);
    try {
      // Pull the full referral so we can prefill DOB/phone/diagnosis, not just the name.
      const res = await apiClient.get<{ data: ReferralDetail }>(
        `/clinical/referrals/${id}`,
      );
      const r = res.data.data;
      const { firstName, lastName } = splitName(r.patientName);
      navigate('/patients/intake', {
        state: {
          referralId: id,
          prefill: {
            firstName,
            lastName,
            dateOfBirth: r.patientDOB ? r.patientDOB.slice(0, 10) : '',
            phone: r.patientPhone ?? '',
            primaryDiagnosisDesc: r.primaryDiagnosis ?? '',
          },
        },
      });
    } catch {
      setError('Could not start conversion for this referral.');
      setConverting(null);
    }
  }

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
                <th className="px-5 py-3">Actions</th>
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
                  <td className="px-5 py-4 text-sm">
                    {r.status === 'converted' ? (
                      r.convertedPatientId ? (
                        <button
                          onClick={() => navigate(`/patients/${r.convertedPatientId}`)}
                          className="font-medium text-teal-700 hover:underline"
                        >
                          View patient →
                        </button>
                      ) : (
                        <span className="text-slate-400">Converted</span>
                      )
                    ) : r.status === 'declined' ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <button
                        onClick={() => handleConvert(r.id)}
                        disabled={converting === r.id}
                        className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-60"
                      >
                        {converting === r.id ? 'Opening…' : 'Convert to Intake'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
