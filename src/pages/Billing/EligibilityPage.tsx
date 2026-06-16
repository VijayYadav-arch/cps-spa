import { useEffect, useState } from 'react';
import {
  listRecentEligibility,
  verifyEligibility,
  type EligibilityCheck,
  type VerifyEligibilityRequest,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const COMMON_PAYERS = [
  { id: '00100', name: 'Medicare Part A/B' },
  { id: '00200', name: 'Medicaid' },
  { id: 'BCBS', name: 'Blue Cross Blue Shield' },
  { id: 'AETNA', name: 'Aetna' },
  { id: 'UHC', name: 'UnitedHealthcare' },
  { id: 'CIGNA', name: 'Cigna' },
];

const SERVICE_TYPE_CODES = [
  { code: '30', label: '30 — Health Benefit Plan Coverage' },
  { code: '1', label: '1 — Medical Care' },
  { code: '45', label: '45 — Hospice Care' },
  { code: '54', label: '54 — Long Term Care' },
];

const EMPTY_FORM: VerifyEligibilityRequest = {
  patientId: null,
  payerId: '00100',
  memberId: '',
  memberFirstName: '',
  memberLastName: '',
  memberDob: '',
  providerNpi: null,
  serviceTypeCode: '30',
  clearinghouse: 'mock',
};

function eligibilityBadge(value: boolean | null) {
  if (value === null) {
    return (
      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
        Unknown
      </span>
    );
  }
  return value ? (
    <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
      Eligible
    </span>
  ) : (
    <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
      Not Eligible
    </span>
  );
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? fallback
  );
}

export function EligibilityPage() {
  const [form, setForm] = useState<VerifyEligibilityRequest>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [latest, setLatest] = useState<EligibilityCheck | null>(null);
  const [recent, setRecent] = useState<EligibilityCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify posts to /billing/eligibility/verify → billing:scrub.
  const canVerify = usePermission(PERMISSIONS.BILLING_SCRUB);

  async function refresh() {
    setIsLoading(true);
    try {
      const { data } = await listRecentEligibility(25);
      setRecent(data);
    } catch {
      setError('Failed to load recent eligibility checks.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLatest(null);
    setSubmitting(true);
    try {
      const result = await verifyEligibility(form);
      setLatest(result);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Verification failed.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header>
        <h2 className="text-2xl">Insurance Eligibility (270/271)</h2>
        <div className="section-line mt-2" />
        <p className="mt-2 max-w-3xl text-slate-500">
          Pre-service insurance verification. Each check submits a 270 inquiry
          to the clearinghouse and persists the 271 response.
        </p>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h3 className="col-span-full text-lg font-semibold">New Verification</h3>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Patient ID (optional)</span>
          <input
            type="number"
            value={form.patientId ?? ''}
            onChange={(e) => setForm({ ...form, patientId: e.target.value ? Number(e.target.value) : null })}
            className="form-input"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Payer *</span>
          <select
            value={form.payerId}
            onChange={(e) => setForm({ ...form, payerId: e.target.value })}
            className="form-input"
            required
          >
            {COMMON_PAYERS.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Member ID *</span>
          <input
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            className="form-input"
            required
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Member DOB *</span>
          <input
            type="date"
            value={form.memberDob}
            onChange={(e) => setForm({ ...form, memberDob: e.target.value })}
            className="form-input"
            required
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Member First Name *</span>
          <input
            value={form.memberFirstName}
            onChange={(e) => setForm({ ...form, memberFirstName: e.target.value })}
            className="form-input"
            required
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Member Last Name *</span>
          <input
            value={form.memberLastName}
            onChange={(e) => setForm({ ...form, memberLastName: e.target.value })}
            className="form-input"
            required
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Service Type</span>
          <select
            value={form.serviceTypeCode ?? '30'}
            onChange={(e) => setForm({ ...form, serviceTypeCode: e.target.value })}
            className="form-input"
          >
            {SERVICE_TYPE_CODES.map((s) => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Provider NPI</span>
          <input
            value={form.providerNpi ?? ''}
            onChange={(e) => setForm({ ...form, providerNpi: e.target.value || null })}
            className="form-input"
          />
        </label>
        <div className="col-span-full">
          <button
            type="submit"
            disabled={submitting || !canVerify}
            title={!canVerify ? NO_PERMISSION : undefined}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Verifying…' : 'Verify Eligibility'}
          </button>
        </div>
      </form>

      {latest && (
        <section
          className={`grid gap-2 rounded-xl border p-4 ${
            latest.eligible === true
              ? 'border-green-200 bg-green-50'
              : latest.eligible === false
                ? 'border-red-200 bg-red-50'
                : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold">
              Verification #{latest.id} {eligibilityBadge(latest.eligible)}
            </h3>
            <span className="text-sm text-slate-500">
              {latest.checkedAtUtc.slice(0, 19).replace('T', ' ')}
            </span>
          </div>
          <div className="text-slate-600">
            <strong>{latest.memberFirstName} {latest.memberLastName}</strong> ·
            {' '}{latest.payerName} · Member {latest.memberId}
          </div>
          {latest.planName && (
            <div className="text-slate-700"><strong>Plan:</strong> {latest.planName}</div>
          )}
          {(latest.coverageStart || latest.coverageEnd) && (
            <div className="text-slate-700">
              <strong>Coverage:</strong>{' '}
              {latest.coverageStart?.slice(0, 10) ?? '—'} → {latest.coverageEnd?.slice(0, 10) ?? '—'}
            </div>
          )}
          {latest.errorMessage && (
            <div className="text-red-800">
              <strong>Error:</strong> {latest.errorMessage}
            </div>
          )}
        </section>
      )}

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">
          Recent Verifications ({recent.length})
        </h3>
        {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
        {!isLoading && recent.length === 0 && (
          <p className="text-slate-500">No verifications yet.</p>
        )}
        {!isLoading && recent.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Payer</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Eligible</th>
                  <th className="px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {r.checkedAtUtc.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.memberLastName}, {r.memberFirstName} · {r.memberId}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.payerName}</td>
                    <td className="px-4 py-3 text-slate-500">{r.planName ?? '—'}</td>
                    <td className="px-4 py-3">{eligibilityBadge(r.eligible)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.checkedByEmail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
