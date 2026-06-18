import { useEffect, useState } from 'react';
import {
  listEligibilityForPatient,
  verifyEligibility,
  type EligibilityCheck,
} from '@/api/billing';
import { useAnyPermission } from '@/permissions/useAnyPermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

// Payer codes the clearinghouse eligibility check understands (mirrors the
// server-side EligibilityService.PayerNames map).
const PAYERS: { code: string; name: string }[] = [
  { code: '00100', name: 'Medicare Part A/B' },
  { code: '00200', name: 'Medicaid' },
  { code: 'BCBS', name: 'Blue Cross Blue Shield' },
  { code: 'AETNA', name: 'Aetna' },
  { code: 'UHC', name: 'UnitedHealthcare' },
  { code: 'CIGNA', name: 'Cigna' },
];

interface Props {
  patientId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  insuranceId: string | null;
}

function EligibleBadge({ eligible }: { eligible: boolean | null }) {
  const tint =
    eligible === true
      ? 'bg-green-100 text-green-800'
      : eligible === false
        ? 'bg-red-100 text-red-800'
        : 'bg-slate-100 text-slate-600';
  const label = eligible === true ? 'Eligible' : eligible === false ? 'Not eligible' : 'Unknown';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${tint}`}>
      {label}
    </span>
  );
}

export function PatientEligibilityCard({
  patientId,
  firstName,
  lastName,
  dateOfBirth,
  insuranceId,
}: Props) {
  // Eligibility verify is now allowed for billing staff OR intake (coverage check at admission).
  const canVerify = useAnyPermission([PERMISSIONS.BILLING_SCRUB, PERMISSIONS.PATIENTS_INTAKE]);
  const [checks, setChecks] = useState<EligibilityCheck[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [payerId, setPayerId] = useState(PAYERS[0].code);
  const [memberId, setMemberId] = useState(insuranceId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listEligibilityForPatient(patientId)
      .then((r) => setChecks(r.data))
      .catch(() => undefined);
  }

  useEffect(refresh, [patientId]);

  async function handleVerify() {
    setSubmitting(true);
    setError(null);
    try {
      await verifyEligibility({
        patientId,
        payerId,
        memberId: memberId.trim(),
        memberFirstName: firstName,
        memberLastName: lastName,
        memberDob: dateOfBirth.slice(0, 10),
        providerNpi: null,
        serviceTypeCode: null,
        clearinghouse: null,
      });
      setShowForm(false);
      refresh();
    } catch (e) {
      setError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Eligibility verification failed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Insurance Eligibility</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            disabled={!canVerify}
            title={!canVerify ? NO_PERMISSION : undefined}
            className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Verify Eligibility
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-3 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Payer</span>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="form-input w-64"
            >
              {PAYERS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Member ID</span>
            <input
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="form-input w-64"
              placeholder="Subscriber / member number"
            />
          </label>
          {error && (
            <div role="alert" className="text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              disabled={submitting}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={submitting || !memberId.trim()}
              className="rounded-md bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? 'Checking…' : 'Run check'}
            </button>
          </div>
        </div>
      )}

      {checks.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No eligibility checks on file.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Checked</th>
                <th className="px-3 py-2">Payer</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-500">
                    {new Date(c.checkedAtUtc).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{c.payerName}</td>
                  <td className="px-3 py-2"><EligibleBadge eligible={c.eligible} /></td>
                  <td className="px-3 py-2 text-slate-500">{c.planName ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {c.coverageStart
                      ? `${c.coverageStart.slice(0, 10)} – ${c.coverageEnd?.slice(0, 10) ?? 'open'}`
                      : c.errorMessage
                        ? c.errorMessage
                        : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
