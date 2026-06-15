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
      <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
        Unknown
      </span>
    );
  }
  return value ? (
    <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
      Eligible
    </span>
  ) : (
    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
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
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Insurance Eligibility (270/271)</h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Pre-service insurance verification. Each check submits a 270 inquiry
          to the clearinghouse and persists the 271 response.
        </p>
      </header>

      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}

      <form
        onSubmit={handleSubmit}
        style={{
          border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#fff',
          display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr',
        }}
      >
        <h3 style={{ gridColumn: '1 / -1', fontSize: 16, fontWeight: 600 }}>New Verification</h3>

        <label>
          <div>Patient ID (optional)</div>
          <input
            type="number"
            value={form.patientId ?? ''}
            onChange={(e) => setForm({ ...form, patientId: e.target.value ? Number(e.target.value) : null })}
            style={{ width: '100%' }}
          />
        </label>
        <label>
          <div>Payer *</div>
          <select
            value={form.payerId}
            onChange={(e) => setForm({ ...form, payerId: e.target.value })}
            style={{ width: '100%' }}
            required
          >
            {COMMON_PAYERS.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
            ))}
          </select>
        </label>
        <label>
          <div>Member ID *</div>
          <input
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            style={{ width: '100%' }}
            required
          />
        </label>
        <label>
          <div>Member DOB *</div>
          <input
            type="date"
            value={form.memberDob}
            onChange={(e) => setForm({ ...form, memberDob: e.target.value })}
            style={{ width: '100%' }}
            required
          />
        </label>
        <label>
          <div>Member First Name *</div>
          <input
            value={form.memberFirstName}
            onChange={(e) => setForm({ ...form, memberFirstName: e.target.value })}
            style={{ width: '100%' }}
            required
          />
        </label>
        <label>
          <div>Member Last Name *</div>
          <input
            value={form.memberLastName}
            onChange={(e) => setForm({ ...form, memberLastName: e.target.value })}
            style={{ width: '100%' }}
            required
          />
        </label>
        <label>
          <div>Service Type</div>
          <select
            value={form.serviceTypeCode ?? '30'}
            onChange={(e) => setForm({ ...form, serviceTypeCode: e.target.value })}
            style={{ width: '100%' }}
          >
            {SERVICE_TYPE_CODES.map((s) => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </select>
        </label>
        <label>
          <div>Provider NPI</div>
          <input
            value={form.providerNpi ?? ''}
            onChange={(e) => setForm({ ...form, providerNpi: e.target.value || null })}
            style={{ width: '100%' }}
          />
        </label>
        <div style={{ gridColumn: '1 / -1' }}>
          <button
            type="submit"
            disabled={submitting || !canVerify}
            title={!canVerify ? NO_PERMISSION : undefined}
            style={{ cursor: (submitting || !canVerify) ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'Verifying…' : 'Verify Eligibility'}
          </button>
        </div>
      </form>

      {latest && (
        <section
          style={{
            border: '1px solid #cbd5e1', borderRadius: 8, padding: 16,
            background: latest.eligible === true ? '#f0fdf4' : latest.eligible === false ? '#fef2f2' : '#f8fafc',
            display: 'grid', gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>
              Verification #{latest.id} {eligibilityBadge(latest.eligible)}
            </h3>
            <span style={{ color: '#64748b', fontSize: 13 }}>
              {latest.checkedAtUtc.slice(0, 19).replace('T', ' ')}
            </span>
          </div>
          <div style={{ color: '#475569' }}>
            <strong>{latest.memberFirstName} {latest.memberLastName}</strong> ·
            {' '}{latest.payerName} · Member {latest.memberId}
          </div>
          {latest.planName && (
            <div><strong>Plan:</strong> {latest.planName}</div>
          )}
          {(latest.coverageStart || latest.coverageEnd) && (
            <div>
              <strong>Coverage:</strong>{' '}
              {latest.coverageStart?.slice(0, 10) ?? '—'} → {latest.coverageEnd?.slice(0, 10) ?? '—'}
            </div>
          )}
          {latest.errorMessage && (
            <div style={{ color: '#991b1b' }}>
              <strong>Error:</strong> {latest.errorMessage}
            </div>
          )}
        </section>
      )}

      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>
          Recent Verifications ({recent.length})
        </h3>
        {isLoading && <div role="status">Loading…</div>}
        {!isLoading && recent.length === 0 && (
          <p style={{ color: '#64748b' }}>No verifications yet.</p>
        )}
        {!isLoading && recent.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>When</th>
                <th style={{ padding: '6px 10px' }}>Member</th>
                <th style={{ padding: '6px 10px' }}>Payer</th>
                <th style={{ padding: '6px 10px' }}>Plan</th>
                <th style={{ padding: '6px 10px' }}>Eligible</th>
                <th style={{ padding: '6px 10px' }}>By</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px', fontSize: 12 }}>
                    {r.checkedAtUtc.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    {r.memberLastName}, {r.memberFirstName} · {r.memberId}
                  </td>
                  <td style={{ padding: '6px 10px' }}>{r.payerName}</td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>{r.planName ?? '—'}</td>
                  <td style={{ padding: '6px 10px' }}>{eligibilityBadge(r.eligible)}</td>
                  <td style={{ padding: '6px 10px', color: '#64748b', fontSize: 12 }}>
                    {r.checkedByEmail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
