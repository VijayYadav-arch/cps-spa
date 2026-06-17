import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  listExpiringPriorAuths,
  listPriorAuths,
  recordPriorAuthDecision,
  refreshPriorAuthStatusNow,
  submitPriorAuth,
  type PriorAuth,
  type PriorAuthStatus,
  type SubmitPriorAuthRequest,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const STATUS_BADGE: Record<PriorAuthStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  expired: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-slate-100 text-slate-600',
};

const COMMON_PAYERS = [
  { id: '00100', name: 'Medicare Part A/B' },
  { id: '00200', name: 'Medicaid' },
  { id: 'BCBS', name: 'Blue Cross Blue Shield' },
  { id: 'AETNA', name: 'Aetna' },
  { id: 'UHC', name: 'UnitedHealthcare' },
  { id: 'CIGNA', name: 'Cigna' },
];

const SERVICE_TYPES = [
  { code: '42', label: '42 — Hospice' },
  { code: '50', label: '50 — Home Health' },
  { code: '54', label: '54 — Long Term Care' },
  { code: '30', label: '30 — Health Benefit Plan Coverage' },
  { code: '1', label: '1 — Medical Care' },
];

function statusBadge(s: PriorAuthStatus) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[s]}`}
    >
      {s}
    </span>
  );
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? fallback
  );
}

const EMPTY_FORM: SubmitPriorAuthRequest = {
  patientId: 0,
  encounterId: null,
  payerId: '00100',
  memberId: '',
  memberFirstName: '',
  memberLastName: '',
  memberDob: '',
  providerNpi: '',
  providerOrganizationName: '',
  serviceTypeCode: '42',
  fromDate: '',
  toDate: '',
  requestedUnits: null,
  diagnosisCodes: null,
  clearinghouse: 'mock',
};

export function PriorAuthPage() {
  const navigate = useNavigate();
  // This page is mounted at both /billing/prior-auth (billing roles) and /prior-auth
  // (clinical:prior_auth roles). Navigate to the detail relative to wherever we are.
  const { pathname } = useLocation();
  const detailBase = pathname.replace(/\/$/, '');
  const [items, setItems] = useState<PriorAuth[]>([]);
  const [expiring, setExpiring] = useState<PriorAuth[]>([]);
  const [statusFilter, setStatusFilter] = useState<PriorAuthStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SubmitPriorAuthRequest>(EMPTY_FORM);
  const [diagnosesInput, setDiagnosesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Submit / decision / refresh-status all hit /billing/prior-auth/* → clinical:prior_auth.
  const canManage = usePermission(PERMISSIONS.CLINICAL_PRIOR_AUTH);

  async function refresh() {
    setIsLoading(true);
    try {
      const [list, exp] = await Promise.all([
        listPriorAuths(statusFilter === 'all' ? undefined : statusFilter),
        listExpiringPriorAuths(30),
      ]);
      setItems(list.data);
      setExpiring(exp.data);
    } catch {
      setError('Failed to load prior authorizations.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, [statusFilter]);

  const counts = useMemo(() => ({
    pending: items.filter((i) => i.status === 'pending').length,
    approved: items.filter((i) => i.status === 'approved').length,
    denied: items.filter((i) => i.status === 'denied').length,
  }), [items]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setActionMsg(null);
    setSubmitting(true);
    try {
      const diagnoses = diagnosesInput.trim()
        ? diagnosesInput.split(',').map((d) => d.trim()).filter(Boolean)
        : null;
      const result = await submitPriorAuth({ ...form, diagnosisCodes: diagnoses });
      setActionMsg(`Submitted prior auth #${result.id} (status: ${result.status}).`);
      setShowForm(false);
      setForm(EMPTY_FORM);
      setDiagnosesInput('');
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Submission failed.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(a: PriorAuth) {
    setError(null);
    const authNum = window.prompt('Auth number:');
    if (!authNum?.trim()) return;
    const units = window.prompt('Approved units:', a.requestedUnits?.toString() ?? '');
    const effective = window.prompt('Auth effective date (YYYY-MM-DD):', a.fromDate ?? '');
    const expiration = window.prompt('Auth expiration date (YYYY-MM-DD):', a.toDate ?? '');
    try {
      await recordPriorAuthDecision(a.id, {
        status: 'approved',
        authNumber: authNum.trim(),
        approvedUnits: units ? Number(units) : null,
        authEffectiveDate: effective?.trim() || null,
        authExpirationDate: expiration?.trim() || null,
        denialReason: null,
      });
      setActionMsg(`Approved auth #${a.id}.`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to approve.'));
    }
  }

  async function handleDeny(a: PriorAuth) {
    setError(null);
    const reason = window.prompt('Denial reason:');
    if (!reason?.trim()) return;
    try {
      await recordPriorAuthDecision(a.id, {
        status: 'denied',
        authNumber: null,
        approvedUnits: null,
        authEffectiveDate: null,
        authExpirationDate: null,
        denialReason: reason.trim(),
      });
      setActionMsg(`Denied auth #${a.id}.`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to deny.'));
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="flex items-baseline justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl">Prior Authorization (X12 278)</h2>
          <div className="section-line" />
          <p className="max-w-3xl text-slate-500">
            Submit and track payer authorizations. Approved auths are flagged
            when within 30 days of expiration.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true);
              try {
                await refreshPriorAuthStatusNow();
                await refresh();
              } finally {
                setRefreshing(false);
              }
            }}
            disabled={refreshing || !canManage}
            aria-busy={refreshing}
            title={!canManage ? NO_PERMISSION : undefined}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {refreshing ? 'Refreshing…' : 'Refresh pending'}
          </button>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {showForm ? 'Cancel' : '+ New Inquiry'}
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}
      {actionMsg && <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">{actionMsg}</div>}

      {expiring.length > 0 && (
        <section className="rounded-lg border-l-4 border-warning bg-amber-50 px-4 py-3">
          <strong className="text-amber-800">
            {expiring.length} authorization{expiring.length === 1 ? '' : 's'} expiring within 30 days
          </strong>
          <ul className="mt-1.5 list-disc pl-5">
            {expiring.slice(0, 5).map((e) => (
              <li key={e.id} className="text-amber-800">
                Auth #{e.authNumber} ({e.payerName}, member {e.memberId}) — expires{' '}
                {e.authExpirationDate}
              </li>
            ))}
          </ul>
        </section>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 className="col-span-full text-lg font-semibold">
            New Prior Auth Inquiry
          </h3>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Patient ID *</span>
            <input
              type="number" required
              value={form.patientId || ''}
              onChange={(e) => setForm({ ...form, patientId: Number(e.target.value) })}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Service Type *</span>
            <select
              value={form.serviceTypeCode}
              onChange={(e) => setForm({ ...form, serviceTypeCode: e.target.value })}
              className="form-input"
            >
              {SERVICE_TYPES.map((s) => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Payer *</span>
            <select
              value={form.payerId}
              onChange={(e) => setForm({ ...form, payerId: e.target.value })}
              className="form-input"
            >
              {COMMON_PAYERS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Member ID *</span>
            <input required value={form.memberId}
              onChange={(e) => setForm({ ...form, memberId: e.target.value })}
              className="form-input" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Member First Name *</span>
            <input required value={form.memberFirstName}
              onChange={(e) => setForm({ ...form, memberFirstName: e.target.value })}
              className="form-input" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Member Last Name *</span>
            <input required value={form.memberLastName}
              onChange={(e) => setForm({ ...form, memberLastName: e.target.value })}
              className="form-input" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Member DOB *</span>
            <input type="date" required value={form.memberDob}
              onChange={(e) => setForm({ ...form, memberDob: e.target.value })}
              className="form-input" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Provider NPI *</span>
            <input required value={form.providerNpi}
              onChange={(e) => setForm({ ...form, providerNpi: e.target.value })}
              className="form-input" />
          </label>
          <label className="col-span-full grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Provider Organization *</span>
            <input required value={form.providerOrganizationName}
              onChange={(e) => setForm({ ...form, providerOrganizationName: e.target.value })}
              className="form-input" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">From Date *</span>
            <input type="date" required value={form.fromDate}
              onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
              className="form-input" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">To Date *</span>
            <input type="date" required value={form.toDate}
              onChange={(e) => setForm({ ...form, toDate: e.target.value })}
              className="form-input" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Requested Units</span>
            <input type="number" min={1} value={form.requestedUnits ?? ''}
              onChange={(e) => setForm({ ...form, requestedUnits: e.target.value ? Number(e.target.value) : null })}
              className="form-input" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Diagnosis Codes (comma-separated)</span>
            <input value={diagnosesInput} onChange={(e) => setDiagnosesInput(e.target.value)}
              placeholder="C50.911, Z80.3" className="form-input" />
          </label>
          <div className="col-span-full">
            <button
              type="submit"
              disabled={submitting || !canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit Prior Auth'}
            </button>
          </div>
        </form>
      )}

      <section className="flex flex-wrap items-center gap-2">
        <strong className="text-slate-700">Filter:</strong>
        {(['all', 'pending', 'approved', 'denied', 'expired'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-teal-600 font-semibold text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-slate-500">
          {counts.pending} pending · {counts.approved} approved · {counts.denied} denied
        </span>
      </section>

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {!isLoading && items.length === 0 && (
        <p className="text-slate-500">No prior authorizations match this filter.</p>
      )}
      {!isLoading && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Payer</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Auth #</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">
                    #{a.patientId} · {a.memberLastName}, {a.memberFirstName}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{a.payerName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {a.memberId}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{a.serviceTypeCode}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {a.fromDate} → {a.toDate}
                  </td>
                  <td className="px-4 py-3">{statusBadge(a.status)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {a.authNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`${detailBase}/${a.id}`)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        View
                      </button>
                      {a.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleApprove(a)}
                            disabled={!canManage}
                            title={!canManage ? NO_PERMISSION : undefined}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeny(a)}
                            disabled={!canManage}
                            title={!canManage ? NO_PERMISSION : undefined}
                            className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Deny
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
