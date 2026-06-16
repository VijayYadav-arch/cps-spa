import { useEffect, useMemo, useState } from 'react';
import {
  excludeCahpsCase,
  getCahpsCompliance,
  listCahpsCases,
  submitCahpsCase,
  updateCahpsCaregiver,
  type CahpsCaseStatus,
  type CahpsComplianceSummary,
  type HospiceCahpsCase,
} from '@/api/hospice';

const STATUS_BADGE: Record<CahpsCaseStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800',
  Eligible: 'bg-blue-100 text-blue-800',
  Ineligible: 'bg-slate-100 text-slate-600',
  SubmittedToVendor: 'bg-green-100 text-green-800',
  Excluded: 'bg-red-100 text-red-800',
};

function metricCard(label: string, value: string, tone: string) {
  return (
    <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function statusBadge(status: CahpsCaseStatus) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}
    >
      {status}
    </span>
  );
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error ?? fallback
  );
}

function defaultQuarter(): { year: number; quarter: number } {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 };
}

function quarterRange(year: number, q: number): { from: string; to: string } {
  const startMonth = (q - 1) * 3;
  const from = new Date(Date.UTC(year, startMonth, 1));
  const to = new Date(Date.UTC(year, startMonth + 3, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function HospiceCahpsDashboard() {
  const initial = defaultQuarter();
  const [year, setYear] = useState(initial.year);
  const [quarter, setQuarter] = useState(initial.quarter);
  const [cases, setCases] = useState<HospiceCahpsCase[]>([]);
  const [summary, setSummary] = useState<CahpsComplianceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<HospiceCahpsCase | null>(null);

  const range = useMemo(() => quarterRange(year, quarter), [year, quarter]);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const [list, comp] = await Promise.all([
        listCahpsCases(range.from, range.to),
        getCahpsCompliance(year, quarter),
      ]);
      setCases(list.data);
      setSummary(comp);
    } catch {
      setError('Failed to load CAHPS cases.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, quarter]);

  async function handleSubmit(c: HospiceCahpsCase) {
    setActionError(null);
    const vendor = window.prompt('Vendor name:', c.vendorName ?? '');
    if (!vendor || !vendor.trim()) return;
    const confirmation = window.prompt(
      'Vendor confirmation # (optional):',
      c.vendorConfirmation ?? '',
    );
    try {
      const updated = await submitCahpsCase(c.id, {
        vendorName: vendor.trim(),
        vendorConfirmation: confirmation?.trim() || null,
        submittedAt: null,
      });
      setSelectedCase(updated);
      await refresh();
    } catch (err) {
      setActionError(extractError(err, 'Failed to submit case.'));
    }
  }

  async function handleExclude(c: HospiceCahpsCase) {
    setActionError(null);
    const reason = window.prompt('Exclusion reason:');
    if (!reason || !reason.trim()) return;
    try {
      const updated = await excludeCahpsCase(c.id, { reason: reason.trim() });
      setSelectedCase(updated);
      await refresh();
    } catch (err) {
      setActionError(extractError(err, 'Failed to exclude case.'));
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">CAHPS Hospice Survey</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Per-decedent case lifecycle. Eligibility: adult (≥ 18), on hospice ≥ 48 hours,
          familial primary caregiver. Submission rate is computed over the at-risk
          eligible pool (submitted decedents count toward the denominator).
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Year</span>
          <input
            type="number"
            className="form-input w-28"
            value={year}
            min={2020}
            max={2100}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Quarter</span>
          <select
            className="form-input w-44"
            value={quarter}
            onChange={(e) => setQuarter(Number(e.target.value))}
          >
            <option value={1}>Q1 (Jan-Mar)</option>
            <option value={2}>Q2 (Apr-Jun)</option>
            <option value={3}>Q3 (Jul-Sep)</option>
            <option value={4}>Q4 (Oct-Dec)</option>
          </select>
        </label>
        <div className="pb-2 text-sm text-slate-500">
          {range.from} → {range.to}
        </div>
      </form>

      {isLoading && (
        <div role="status" className="text-slate-500">
          Loading…
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </div>
      )}
      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {actionError}
        </div>
      )}

      {summary && !isLoading && (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
            {metricCard(
              'Submission Rate',
              `${summary.submissionRatePercentage.toFixed(1)}%`,
              summary.submissionRatePercentage >= 90
                ? 'text-success'
                : 'text-accent-600',
            )}
            {metricCard(
              'Total Decedents',
              summary.totalDecedents.toString(),
              'text-navy-900',
            )}
            {metricCard('Eligible', summary.eligibleCount.toString(), 'text-blue-800')}
            {metricCard(
              'Submitted',
              summary.submittedCount.toString(),
              'text-success',
            )}
            {metricCard(
              'Not Yet Submitted',
              summary.notYetSubmittedCount.toString(),
              summary.notYetSubmittedCount > 0
                ? 'text-accent-600'
                : 'text-navy-900',
            )}
            {metricCard(
              'Ineligible',
              summary.ineligibleCount.toString(),
              'text-slate-500',
            )}
            {metricCard('Excluded', summary.excludedCount.toString(), 'text-error')}
          </section>

          <section
            className={`rounded-lg border-l-4 px-4 py-3 font-semibold ${
              summary.notYetSubmittedCount === 0 && summary.eligibleCount > 0
                ? 'border-success bg-green-50 text-green-800'
                : summary.notYetSubmittedCount > 0
                  ? 'border-warning bg-amber-50 text-amber-800'
                  : 'border-slate-300 bg-slate-50 text-slate-600'
            }`}
          >
            {summary.eligibleCount === 0
              ? `No eligible decedents in Q${quarter} ${year}.`
              : summary.notYetSubmittedCount === 0
                ? `All ${summary.submittedCount} eligible cases submitted for Q${quarter} ${year}.`
                : `${summary.notYetSubmittedCount} eligible case${summary.notYetSubmittedCount === 1 ? '' : 's'} still need vendor submission for Q${quarter} ${year}.`}
          </section>
        </>
      )}

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">Cases ({cases.length})</h3>
        {cases.length === 0 ? (
          <p className="text-slate-500">No decedents in this quarter.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Death</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Days on Hospice</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Caregiver</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-700">{c.dateOfDeath}</td>
                    <td className="px-4 py-3 text-slate-700">#{c.patientId}</td>
                    <td className="px-4 py-3 text-slate-700">{c.ageAtDeath}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {c.daysOnHospice}
                    </td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {c.caregiverName ?? '—'}
                      {c.caregiverIsFamilial === false && (
                        <span className="ml-1.5 text-error">(nonfamilial)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {c.vendorName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCase(c)}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          Details
                        </button>
                        {c.status === 'Eligible' && (
                          <button
                            type="button"
                            onClick={() => void handleSubmit(c)}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Submit
                          </button>
                        )}
                        {c.status !== 'SubmittedToVendor'
                          && c.status !== 'Excluded' && (
                            <button
                              type="button"
                              onClick={() => void handleExclude(c)}
                              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            >
                              Exclude
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedCase && (
        <CahpsCaseDetail
          caseRow={selectedCase}
          onClose={() => setSelectedCase(null)}
          onChange={async (updated) => {
            setSelectedCase(updated);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

interface DetailProps {
  caseRow: HospiceCahpsCase;
  onClose: () => void;
  onChange: (updated: HospiceCahpsCase) => Promise<void>;
}

function CahpsCaseDetail({ caseRow, onClose, onChange }: DetailProps) {
  const [name, setName] = useState(caseRow.caregiverName ?? '');
  const [address, setAddress] = useState(caseRow.caregiverAddress ?? '');
  const [phone, setPhone] = useState(caseRow.caregiverPhone ?? '');
  const [isFamilial, setIsFamilial] = useState<string>(
    caseRow.caregiverIsFamilial === null
      ? ''
      : caseRow.caregiverIsFamilial
        ? 'true'
        : 'false',
  );
  const [notes, setNotes] = useState(caseRow.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const updated = await updateCahpsCaregiver(caseRow.id, {
        caregiverName: name.trim() || null,
        caregiverAddress: address.trim() || null,
        caregiverPhone: phone.trim() || null,
        caregiverIsFamilial: isFamilial === '' ? null : isFamilial === 'true',
        notes: notes.trim() || null,
      });
      await onChange(updated);
    } catch (e2) {
      setErr(extractError(e2, 'Failed to save caregiver.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Case #{caseRow.id} — Patient #{caseRow.patientId}
          </h3>
          <div className="text-sm text-slate-500">
            Death {caseRow.dateOfDeath} · Admit {caseRow.admittedAt} ·
            {' '}{caseRow.daysOnHospice} days · age {caseRow.ageAtDeath} ·
            {' '}{statusBadge(caseRow.status)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      {caseRow.ineligibleReason && (
        <div className="text-accent-600">
          <strong>Ineligible:</strong> {caseRow.ineligibleReason}
        </div>
      )}
      {caseRow.exclusionReason && (
        <div className="text-error">
          <strong>Excluded:</strong> {caseRow.exclusionReason}
        </div>
      )}
      {caseRow.submittedToVendorAt && (
        <div className="text-success">
          <strong>Submitted</strong> {caseRow.submittedToVendorAt.slice(0, 10)} to
          {' '}{caseRow.vendorName}
          {caseRow.vendorConfirmation
            && ` (conf ${caseRow.vendorConfirmation})`}
        </div>
      )}

      <form onSubmit={save} className="grid gap-3">
        <h4 className="m-0 text-sm font-semibold text-slate-800">
          Primary Caregiver
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="form-input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="form-input"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <input
          className="form-input"
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">
            Relationship (nonfamilial legal guardians make case ineligible)
          </span>
          <select
            className="form-input"
            value={isFamilial}
            onChange={(e) => setIsFamilial(e.target.value)}
          >
            <option value="">— Not specified —</option>
            <option value="true">Familial / informal</option>
            <option value="false">Nonfamilial legal guardian</option>
          </select>
        </label>
        <textarea
          className="form-input"
          placeholder="Notes (optional)"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {err && (
          <div role="alert" className="text-error">
            {err}
          </div>
        )}
        <button
          type="submit"
          className="btn-primary justify-self-start"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Caregiver'}
        </button>
      </form>
    </section>
  );
}
