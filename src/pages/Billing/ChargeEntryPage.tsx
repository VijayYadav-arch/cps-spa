import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BillingCodeAutocomplete } from '@/components/BillingCodeAutocomplete';
import {
  attachChargesToClaim,
  createCharge,
  getPendingChargesSummary,
  listCharges,
  markChargeReviewed,
  voidCharge,
  type ChargeRecord,
  type ChargeStatus,
  type ChargeType,
  type CreateChargeRequest,
  type PendingChargesSummary,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const STATUS_BADGE: Record<ChargeStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  reviewed: 'bg-blue-100 text-blue-800',
  billed: 'bg-green-100 text-green-800',
  voided: 'bg-slate-100 text-slate-600',
};

const CHARGE_TYPE_OPTIONS: { value: ChargeType; label: string }[] = [
  { value: 'per-diem', label: 'Per-diem (hospice)' },
  { value: 'visit', label: 'Visit (home health)' },
  { value: 'procedure', label: 'Procedure (CPT/HCPCS)' },
  { value: 'supply', label: 'Supply' },
];

function money(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function statusBadge(s: ChargeStatus) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[s]}`}>
      {s}
    </span>
  );
}

export function ChargeEntryPage() {
  const [charges, setCharges] = useState<ChargeRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<ChargeStatus | 'all'>('all');
  const [patientFilter, setPatientFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formPatientId, setFormPatientId] = useState('');
  const [formEncounterId, setFormEncounterId] = useState('');
  const [formChargeDate, setFormChargeDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [formChargeType, setFormChargeType] = useState<ChargeType>('per-diem');
  const [formRevenueCode, setFormRevenueCode] = useState('');
  const [formProcedureCode, setFormProcedureCode] = useState('');
  const [formUnits, setFormUnits] = useState('1');
  const [formAmount, setFormAmount] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [pendingSummary, setPendingSummary] = useState<PendingChargesSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [attachingClaimId, setAttachingClaimId] = useState('');

  // Button gates mapped to the ChargesController action policies:
  // create→claims:create, reviewed/attach→claims:edit, void→claims:void.
  const canCreate = usePermission(PERMISSIONS.CLAIMS_CREATE);
  const canEdit = usePermission(PERMISSIONS.CLAIMS_EDIT);
  const canVoid = usePermission(PERMISSIONS.CLAIMS_VOID);

  async function reload() {
    setLoading(true);
    try {
      const params: Parameters<typeof listCharges>[0] = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const pid = Number(patientFilter);
      if (Number.isFinite(pid) && pid > 0) params.patientId = pid;
      const res = await listCharges(params);
      setCharges(res.data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load charges');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const pid = Number(patientFilter);
    if (!Number.isFinite(pid) || pid <= 0) {
      setPendingSummary(null);
      return;
    }
    getPendingChargesSummary(pid)
      .then((r) => setPendingSummary(r.data))
      .catch(() => setPendingSummary(null));
  }, [patientFilter]);

  const selectedTotal = useMemo(() => {
    return charges
      .filter((c) => selectedIds.has(c.id))
      .reduce((sum, c) => sum + c.totalAmount, 0);
  }, [charges, selectedIds]);

  function toggleSelect(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const pid = Number(formPatientId);
    if (!Number.isFinite(pid) || pid <= 0) {
      setError('Patient ID is required');
      return;
    }
    const units = Number(formUnits);
    const amount = Number(formAmount);
    if (!Number.isFinite(units) || units <= 0) {
      setError('Units must be positive');
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Amount must be non-negative');
      return;
    }
    if (formChargeType === 'procedure' && !formProcedureCode.trim()) {
      setError('Procedure code is required for procedure charges');
      return;
    }

    setSubmitting(true);
    try {
      const req: CreateChargeRequest = {
        patientId: pid,
        encounterId: formEncounterId ? Number(formEncounterId) : null,
        chargeDate: new Date(formChargeDate).toISOString(),
        chargeType: formChargeType,
        revenueCode: formRevenueCode || null,
        procedureCode: formProcedureCode || null,
        units,
        amount,
        notes: formNotes || null,
      };
      const created = await createCharge(req);
      setNotice(`Created charge #${created.data.id}`);
      setShowForm(false);
      setFormPatientId('');
      setFormEncounterId('');
      setFormProcedureCode('');
      setFormRevenueCode('');
      setFormAmount('');
      setFormNotes('');
      await reload();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Failed to create charge');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(id: number) {
    setNotice(null);
    setError(null);
    try {
      await markChargeReviewed(id);
      setNotice(`Marked charge #${id} reviewed`);
      await reload();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Could not mark reviewed');
    }
  }

  async function handleVoid(id: number) {
    if (!confirm(`Void charge #${id}? This cannot be undone.`)) return;
    setNotice(null);
    setError(null);
    try {
      await voidCharge(id);
      setNotice(`Voided charge #${id}`);
      await reload();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Could not void charge');
    }
  }

  async function handleAttach() {
    if (selectedIds.size === 0) return;
    const claimId = Number(attachingClaimId);
    if (!Number.isFinite(claimId) || claimId <= 0) {
      setError('Enter a valid claim ID');
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await attachChargesToClaim(Array.from(selectedIds), claimId);
      setNotice(`Attached ${selectedIds.size} charge(s) to claim #${claimId}`);
      setSelectedIds(new Set());
      setAttachingClaimId('');
      await reload();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Could not attach charges');
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Charge Entry</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : '+ New Charge'}
        </button>
      </div>

      {notice && (
        <div role="status" className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Patient ID *</span>
            <input
              value={formPatientId}
              onChange={(e) => setFormPatientId(e.target.value)}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Encounter ID (optional)</span>
            <input
              value={formEncounterId}
              onChange={(e) => setFormEncounterId(e.target.value)}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Charge Date *</span>
            <input
              type="date"
              value={formChargeDate}
              onChange={(e) => setFormChargeDate(e.target.value)}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Charge Type *</span>
            <select
              value={formChargeType}
              onChange={(e) => setFormChargeType(e.target.value as ChargeType)}
              className="form-input"
            >
              {CHARGE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <div>
            <BillingCodeAutocomplete
              id="charge-revenue-code"
              label="Revenue Code"
              type="revenue"
              value={formRevenueCode}
              onChange={setFormRevenueCode}
              placeholder="e.g. 0651"
            />
          </div>
          <div>
            <BillingCodeAutocomplete
              id="charge-procedure-code"
              label={`Procedure Code${formChargeType === 'procedure' ? ' *' : ''}`}
              type="cpt"
              value={formProcedureCode}
              onChange={setFormProcedureCode}
              placeholder="e.g. T2042"
            />
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Units *</span>
            <input
              type="number"
              min="1"
              value={formUnits}
              onChange={(e) => setFormUnits(e.target.value)}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Amount per unit *</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="form-input"
            />
          </label>
          <label className="col-span-2 grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Notes</span>
            <input
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="form-input"
            />
          </label>
          <div className="col-span-2">
            <button
              type="submit"
              disabled={submitting || !canCreate}
              title={!canCreate ? NO_PERMISSION : undefined}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save Charge'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm text-slate-600">
          Patient ID filter:
          <input
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="form-input ml-1.5 inline-block w-auto"
          />
        </label>
        <div className="flex gap-1.5">
          {(['all', 'pending', 'reviewed', 'billed', 'voided'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                statusFilter === s
                  ? 'border-transparent bg-sky-500 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Pending summary for selected patient */}
      {pendingSummary && (
        <div className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-slate-600">
          Patient #{pendingSummary.patientId}: {pendingSummary.chargeCount} pending
          charge(s), total <strong>{money(pendingSummary.totalAmount)}</strong>
          {pendingSummary.earliestServiceDate && (
            <>
              {' '}— service dates {pendingSummary.earliestServiceDate.slice(0, 10)} to{' '}
              {pendingSummary.latestServiceDate?.slice(0, 10)}
            </>
          )}
        </div>
      )}

      {/* Attach to claim strip */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <strong>{selectedIds.size}</strong> selected ({money(selectedTotal)})
          <input
            value={attachingClaimId}
            onChange={(e) => setAttachingClaimId(e.target.value)}
            placeholder="Claim ID"
            className="form-input w-auto"
          />
          <button
            type="button"
            onClick={handleAttach}
            disabled={!canEdit}
            title={!canEdit ? NO_PERMISSION : undefined}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Attach to claim
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-sm font-medium text-slate-600 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3 text-right">Units</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={11} className="px-4 py-5 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && charges.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-5 text-center text-slate-500">
                  No charges in this view.
                </td>
              </tr>
            )}
            {!loading &&
              charges.map((c) => {
                const selectable = c.status === 'pending' || c.status === 'reviewed';
                return (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {selectable && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={(e) => toggleSelect(c.id, e.target.checked)}
                          aria-label={`Select charge ${c.id}`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">#{c.id}</td>
                    <td className="px-4 py-3 text-slate-700">{c.patientId}</td>
                    <td className="px-4 py-3 text-slate-700">{c.chargeDate.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-slate-700">{c.chargeType}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {c.procedureCode || c.revenueCode || ''}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{c.units}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{money(c.amount)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{money(c.totalAmount)}</td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {c.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleReview(c.id)}
                          disabled={!canEdit}
                          title={!canEdit ? NO_PERMISSION : undefined}
                          className="mr-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Mark reviewed
                        </button>
                      )}
                      {(c.status === 'pending' || c.status === 'reviewed') && (
                        <button
                          type="button"
                          onClick={() => handleVoid(c.id)}
                          disabled={!canVoid}
                          title={!canVoid ? NO_PERMISSION : undefined}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Void
                        </button>
                      )}
                      {c.status === 'billed' && c.claimId && (
                        <span className="text-xs text-slate-500">
                          on claim #{c.claimId}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
