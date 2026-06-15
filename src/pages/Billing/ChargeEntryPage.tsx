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

const STATUS_COLORS: Record<ChargeStatus, { bg: string; fg: string }> = {
  pending: { bg: '#fef3c7', fg: '#92400e' },
  reviewed: { bg: '#dbeafe', fg: '#1e40af' },
  billed: { bg: '#dcfce7', fg: '#166534' },
  voided: { bg: '#f1f5f9', fg: '#475569' },
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
  const c = STATUS_COLORS[s];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        background: c.bg,
        color: c.fg,
        fontWeight: 600,
      }}
    >
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
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Charge Entry</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            background: '#0ea5e9',
            color: '#fff',
            border: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {showForm ? 'Cancel' : '+ New Charge'}
        </button>
      </div>

      {notice && (
        <div role="status" style={{ marginTop: 12, color: '#166534', background: '#dcfce7', padding: 10, borderRadius: 6 }}>
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" style={{ marginTop: 12, color: '#991b1b', background: '#fee2e2', padding: 10, borderRadius: 6 }}>
          {error}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            marginTop: 16,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            background: '#f8fafc',
          }}
        >
          <label>
            <div style={{ fontSize: 12, color: '#64748b' }}>Patient ID *</div>
            <input
              value={formPatientId}
              onChange={(e) => setFormPatientId(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 4 }}
            />
          </label>
          <label>
            <div style={{ fontSize: 12, color: '#64748b' }}>Encounter ID (optional)</div>
            <input
              value={formEncounterId}
              onChange={(e) => setFormEncounterId(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 4 }}
            />
          </label>
          <label>
            <div style={{ fontSize: 12, color: '#64748b' }}>Charge Date *</div>
            <input
              type="date"
              value={formChargeDate}
              onChange={(e) => setFormChargeDate(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 4 }}
            />
          </label>
          <label>
            <div style={{ fontSize: 12, color: '#64748b' }}>Charge Type *</div>
            <select
              value={formChargeType}
              onChange={(e) => setFormChargeType(e.target.value as ChargeType)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 4 }}
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
          <label>
            <div style={{ fontSize: 12, color: '#64748b' }}>Units *</div>
            <input
              type="number"
              min="1"
              value={formUnits}
              onChange={(e) => setFormUnits(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 4 }}
            />
          </label>
          <label>
            <div style={{ fontSize: 12, color: '#64748b' }}>Amount per unit *</div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 4 }}
            />
          </label>
          <label style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>Notes</div>
            <input
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 4 }}
            />
          </label>
          <div style={{ gridColumn: 'span 2' }}>
            <button
              type="submit"
              disabled={submitting || !canCreate}
              title={!canCreate ? NO_PERMISSION : undefined}
              style={{
                background: (submitting || !canCreate) ? '#94a3b8' : '#0ea5e9',
                color: '#fff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: 6,
                cursor: (submitting || !canCreate) ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {submitting ? 'Saving…' : 'Save Charge'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ fontSize: 13, color: '#475569' }}>
          Patient ID filter:
          <input
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            style={{ marginLeft: 6, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }}
          />
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'pending', 'reviewed', 'billed', 'voided'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '4px 10px',
                background: statusFilter === s ? '#0ea5e9' : '#fff',
                color: statusFilter === s ? '#fff' : '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Pending summary for selected patient */}
      {pendingSummary && (
        <div style={{ marginTop: 12, padding: 10, border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, color: '#475569', background: '#fafafa' }}>
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
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: '#eff6ff',
            border: '1px solid #93c5fd',
            borderRadius: 6,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <strong>{selectedIds.size}</strong> selected ({money(selectedTotal)})
          <input
            value={attachingClaimId}
            onChange={(e) => setAttachingClaimId(e.target.value)}
            placeholder="Claim ID"
            style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }}
          />
          <button
            type="button"
            onClick={handleAttach}
            disabled={!canEdit}
            title={!canEdit ? NO_PERMISSION : undefined}
            style={{
              background: canEdit ? '#0ea5e9' : '#94a3b8',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 4,
              cursor: canEdit ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
          >
            Attach to claim
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            style={{
              background: 'transparent',
              color: '#475569',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
            <th style={{ padding: '8px 6px', textAlign: 'left' }}></th>
            <th style={{ padding: '8px 6px', textAlign: 'left' }}>ID</th>
            <th style={{ padding: '8px 6px', textAlign: 'left' }}>Patient</th>
            <th style={{ padding: '8px 6px', textAlign: 'left' }}>Date</th>
            <th style={{ padding: '8px 6px', textAlign: 'left' }}>Type</th>
            <th style={{ padding: '8px 6px', textAlign: 'left' }}>Code</th>
            <th style={{ padding: '8px 6px', textAlign: 'right' }}>Units</th>
            <th style={{ padding: '8px 6px', textAlign: 'right' }}>Amount</th>
            <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total</th>
            <th style={{ padding: '8px 6px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '8px 6px', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={11} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                Loading…
              </td>
            </tr>
          )}
          {!loading && charges.length === 0 && (
            <tr>
              <td colSpan={11} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                No charges in this view.
              </td>
            </tr>
          )}
          {!loading &&
            charges.map((c) => {
              const selectable = c.status === 'pending' || c.status === 'reviewed';
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 6px' }}>
                    {selectable && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={(e) => toggleSelect(c.id, e.target.checked)}
                        aria-label={`Select charge ${c.id}`}
                      />
                    )}
                  </td>
                  <td style={{ padding: '8px 6px' }}>#{c.id}</td>
                  <td style={{ padding: '8px 6px' }}>{c.patientId}</td>
                  <td style={{ padding: '8px 6px' }}>{c.chargeDate.slice(0, 10)}</td>
                  <td style={{ padding: '8px 6px' }}>{c.chargeType}</td>
                  <td style={{ padding: '8px 6px', fontFamily: 'monospace' }}>
                    {c.procedureCode || c.revenueCode || ''}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'right' }}>{c.units}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right' }}>{money(c.amount)}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right' }}>{money(c.totalAmount)}</td>
                  <td style={{ padding: '8px 6px' }}>{statusBadge(c.status)}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                    {c.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleReview(c.id)}
                        disabled={!canEdit}
                        title={!canEdit ? NO_PERMISSION : undefined}
                        style={{
                          background: 'transparent',
                          border: '1px solid #cbd5e1',
                          padding: '2px 8px',
                          borderRadius: 4,
                          cursor: canEdit ? 'pointer' : 'not-allowed',
                          marginRight: 4,
                          fontSize: 12,
                        }}
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
                        style={{
                          background: 'transparent',
                          border: '1px solid #fecaca',
                          color: '#991b1b',
                          padding: '2px 8px',
                          borderRadius: 4,
                          cursor: canVoid ? 'pointer' : 'not-allowed',
                          fontSize: 12,
                        }}
                      >
                        Void
                      </button>
                    )}
                    {c.status === 'billed' && c.claimId && (
                      <span style={{ fontSize: 12, color: '#64748b' }}>
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
  );
}
