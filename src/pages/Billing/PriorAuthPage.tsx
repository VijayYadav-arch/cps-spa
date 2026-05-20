import { useEffect, useMemo, useState } from 'react';
import {
  listExpiringPriorAuths,
  listPriorAuths,
  recordPriorAuthDecision,
  submitPriorAuth,
  type PriorAuth,
  type PriorAuthStatus,
  type SubmitPriorAuthRequest,
} from '@/api/billing';

const STATUS_COLORS: Record<PriorAuthStatus, { bg: string; fg: string }> = {
  pending: { bg: '#fef3c7', fg: '#92400e' },
  approved: { bg: '#dcfce7', fg: '#166534' },
  denied: { bg: '#fee2e2', fg: '#991b1b' },
  expired: { bg: '#f1f5f9', fg: '#475569' },
  cancelled: { bg: '#f1f5f9', fg: '#475569' },
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
  const c = STATUS_COLORS[s];
  return (
    <span
      style={{
        background: c.bg, color: c.fg,
        padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
      }}
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
  const [items, setItems] = useState<PriorAuth[]>([]);
  const [expiring, setExpiring] = useState<PriorAuth[]>([]);
  const [statusFilter, setStatusFilter] = useState<PriorAuthStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SubmitPriorAuthRequest>(EMPTY_FORM);
  const [diagnosesInput, setDiagnosesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

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
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Prior Authorization (X12 278)</h2>
          <p style={{ color: '#64748b', marginTop: 4 }}>
            Submit and track payer authorizations. Approved auths are flagged
            when within 30 days of expiration.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Inquiry'}
        </button>
      </header>

      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {actionMsg && <div style={{ color: '#15803d' }}>{actionMsg}</div>}

      {expiring.length > 0 && (
        <section
          style={{
            background: '#fef3c7', border: '1px solid #f59e0b',
            borderRadius: 8, padding: 12,
          }}
        >
          <strong style={{ color: '#92400e' }}>
            {expiring.length} authorization{expiring.length === 1 ? '' : 's'} expiring within 30 days
          </strong>
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {expiring.slice(0, 5).map((e) => (
              <li key={e.id} style={{ color: '#92400e' }}>
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
          style={{
            border: '1px solid #cbd5e1', borderRadius: 8, padding: 16,
            background: '#f8fafc', display: 'grid', gap: 12,
            gridTemplateColumns: '1fr 1fr',
          }}
        >
          <h3 style={{ gridColumn: '1 / -1', fontSize: 16, fontWeight: 600 }}>
            New Prior Auth Inquiry
          </h3>
          <label>
            <div>Patient ID *</div>
            <input
              type="number" required
              value={form.patientId || ''}
              onChange={(e) => setForm({ ...form, patientId: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <div>Service Type *</div>
            <select
              value={form.serviceTypeCode}
              onChange={(e) => setForm({ ...form, serviceTypeCode: e.target.value })}
              style={{ width: '100%' }}
            >
              {SERVICE_TYPES.map((s) => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </select>
          </label>
          <label>
            <div>Payer *</div>
            <select
              value={form.payerId}
              onChange={(e) => setForm({ ...form, payerId: e.target.value })}
              style={{ width: '100%' }}
            >
              {COMMON_PAYERS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            <div>Member ID *</div>
            <input required value={form.memberId}
              onChange={(e) => setForm({ ...form, memberId: e.target.value })}
              style={{ width: '100%' }} />
          </label>
          <label>
            <div>Member First Name *</div>
            <input required value={form.memberFirstName}
              onChange={(e) => setForm({ ...form, memberFirstName: e.target.value })}
              style={{ width: '100%' }} />
          </label>
          <label>
            <div>Member Last Name *</div>
            <input required value={form.memberLastName}
              onChange={(e) => setForm({ ...form, memberLastName: e.target.value })}
              style={{ width: '100%' }} />
          </label>
          <label>
            <div>Member DOB *</div>
            <input type="date" required value={form.memberDob}
              onChange={(e) => setForm({ ...form, memberDob: e.target.value })}
              style={{ width: '100%' }} />
          </label>
          <label>
            <div>Provider NPI *</div>
            <input required value={form.providerNpi}
              onChange={(e) => setForm({ ...form, providerNpi: e.target.value })}
              style={{ width: '100%' }} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <div>Provider Organization *</div>
            <input required value={form.providerOrganizationName}
              onChange={(e) => setForm({ ...form, providerOrganizationName: e.target.value })}
              style={{ width: '100%' }} />
          </label>
          <label>
            <div>From Date *</div>
            <input type="date" required value={form.fromDate}
              onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
              style={{ width: '100%' }} />
          </label>
          <label>
            <div>To Date *</div>
            <input type="date" required value={form.toDate}
              onChange={(e) => setForm({ ...form, toDate: e.target.value })}
              style={{ width: '100%' }} />
          </label>
          <label>
            <div>Requested Units</div>
            <input type="number" min={1} value={form.requestedUnits ?? ''}
              onChange={(e) => setForm({ ...form, requestedUnits: e.target.value ? Number(e.target.value) : null })}
              style={{ width: '100%' }} />
          </label>
          <label>
            <div>Diagnosis Codes (comma-separated)</div>
            <input value={diagnosesInput} onChange={(e) => setDiagnosesInput(e.target.value)}
              placeholder="C50.911, Z80.3" style={{ width: '100%' }} />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Prior Auth'}
            </button>
          </div>
        </form>
      )}

      <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <strong>Filter:</strong>
        {(['all', 'pending', 'approved', 'denied', 'expired'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            style={{
              fontWeight: statusFilter === s ? 700 : 400,
              background: statusFilter === s ? '#0ea5e9' : '#f1f5f9',
              color: statusFilter === s ? '#fff' : '#0f172a',
              border: 'none', padding: '4px 12px', borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: '#64748b' }}>
          {counts.pending} pending · {counts.approved} approved · {counts.denied} denied
        </span>
      </section>

      {isLoading && <div role="status">Loading…</div>}
      {!isLoading && items.length === 0 && (
        <p style={{ color: '#64748b' }}>No prior authorizations match this filter.</p>
      )}
      {!isLoading && items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '6px 10px' }}>Patient</th>
              <th style={{ padding: '6px 10px' }}>Payer</th>
              <th style={{ padding: '6px 10px' }}>Member</th>
              <th style={{ padding: '6px 10px' }}>Service</th>
              <th style={{ padding: '6px 10px' }}>Dates</th>
              <th style={{ padding: '6px 10px' }}>Status</th>
              <th style={{ padding: '6px 10px' }}>Auth #</th>
              <th style={{ padding: '6px 10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 10px' }}>
                  #{a.patientId} · {a.memberLastName}, {a.memberFirstName}
                </td>
                <td style={{ padding: '6px 10px' }}>{a.payerName}</td>
                <td style={{ padding: '6px 10px', fontSize: 12, fontFamily: 'monospace' }}>
                  {a.memberId}
                </td>
                <td style={{ padding: '6px 10px' }}>{a.serviceTypeCode}</td>
                <td style={{ padding: '6px 10px', fontSize: 12, color: '#64748b' }}>
                  {a.fromDate} → {a.toDate}
                </td>
                <td style={{ padding: '6px 10px' }}>{statusBadge(a.status)}</td>
                <td style={{ padding: '6px 10px', fontSize: 12, fontFamily: 'monospace' }}>
                  {a.authNumber ?? '—'}
                </td>
                <td style={{ padding: '6px 10px', display: 'flex', gap: 4 }}>
                  {a.status === 'pending' && (
                    <>
                      <button type="button" onClick={() => void handleApprove(a)} style={{ fontSize: 12 }}>
                        Approve
                      </button>
                      <button type="button" onClick={() => void handleDeny(a)} style={{ fontSize: 12, color: '#b91c1c' }}>
                        Deny
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
