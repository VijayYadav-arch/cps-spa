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

const STATUS_COLORS: Record<CahpsCaseStatus, { bg: string; fg: string }> = {
  Pending: { bg: '#fef3c7', fg: '#92400e' },
  Eligible: { bg: '#dbeafe', fg: '#1e40af' },
  Ineligible: { bg: '#f1f5f9', fg: '#475569' },
  SubmittedToVendor: { bg: '#dcfce7', fg: '#166534' },
  Excluded: { bg: '#fee2e2', fg: '#991b1b' },
};

function metricCard(label: string, value: string, color: string) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        background: '#fff',
        minWidth: 180,
      }}
    >
      <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function statusBadge(status: CahpsCaseStatus) {
  const { bg, fg } = STATUS_COLORS[status];
  return (
    <span
      style={{
        background: bg,
        color: fg,
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
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
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>CAHPS Hospice Survey</h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Per-decedent case lifecycle. Eligibility: adult (≥ 18), on hospice ≥ 48 hours,
          familial primary caregiver. Submission rate is computed over the at-risk
          eligible pool (submitted decedents count toward the denominator).
        </p>
      </header>

      <form style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Year</span>
          <input
            type="number"
            value={year}
            min={2020}
            max={2100}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Quarter</span>
          <select
            value={quarter}
            onChange={(e) => setQuarter(Number(e.target.value))}
          >
            <option value={1}>Q1 (Jan-Mar)</option>
            <option value={2}>Q2 (Apr-Jun)</option>
            <option value={3}>Q3 (Jul-Sep)</option>
            <option value={4}>Q4 (Oct-Dec)</option>
          </select>
        </label>
        <div style={{ color: '#64748b', fontSize: 13, paddingBottom: 4 }}>
          {range.from} → {range.to}
        </div>
      </form>

      {isLoading && <div role="status">Loading…</div>}
      {error && <div role="alert">{error}</div>}
      {actionError && (
        <div role="alert" style={{ color: '#b91c1c' }}>
          {actionError}
        </div>
      )}

      {summary && !isLoading && (
        <>
          <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {metricCard(
              'Submission Rate',
              `${summary.submissionRatePercentage.toFixed(1)}%`,
              summary.submissionRatePercentage >= 90 ? '#15803d' : '#b45309',
            )}
            {metricCard('Total Decedents', summary.totalDecedents.toString(), '#0f172a')}
            {metricCard('Eligible', summary.eligibleCount.toString(), '#1e40af')}
            {metricCard('Submitted', summary.submittedCount.toString(), '#166534')}
            {metricCard(
              'Not Yet Submitted',
              summary.notYetSubmittedCount.toString(),
              summary.notYetSubmittedCount > 0 ? '#b45309' : '#0f172a',
            )}
            {metricCard('Ineligible', summary.ineligibleCount.toString(), '#475569')}
            {metricCard('Excluded', summary.excludedCount.toString(), '#991b1b')}
          </section>

          <section
            style={{
              padding: 12,
              borderRadius: 6,
              background:
                summary.notYetSubmittedCount === 0 && summary.eligibleCount > 0
                  ? '#f0fdf4'
                  : summary.notYetSubmittedCount > 0
                    ? '#fef3c7'
                    : '#f8fafc',
              color:
                summary.notYetSubmittedCount === 0 && summary.eligibleCount > 0
                  ? '#166534'
                  : summary.notYetSubmittedCount > 0
                    ? '#92400e'
                    : '#475569',
              fontWeight: 600,
            }}
          >
            {summary.eligibleCount === 0
              ? `No eligible decedents in Q${quarter} ${year}.`
              : summary.notYetSubmittedCount === 0
                ? `All ${summary.submittedCount} eligible cases submitted for Q${quarter} ${year}.`
                : `${summary.notYetSubmittedCount} eligible case${summary.notYetSubmittedCount === 1 ? '' : 's'} still need vendor submission for Q${quarter} ${year}.`}
          </section>
        </>
      )}

      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>
          Cases ({cases.length})
        </h3>
        {cases.length === 0 ? (
          <p style={{ color: '#64748b' }}>No decedents in this quarter.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Death</th>
                <th style={{ padding: '6px 10px' }}>Patient</th>
                <th style={{ padding: '6px 10px' }}>Age</th>
                <th style={{ padding: '6px 10px' }}>Days on Hospice</th>
                <th style={{ padding: '6px 10px' }}>Status</th>
                <th style={{ padding: '6px 10px' }}>Caregiver</th>
                <th style={{ padding: '6px 10px' }}>Vendor</th>
                <th style={{ padding: '6px 10px' }}></th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>{c.dateOfDeath}</td>
                  <td style={{ padding: '6px 10px' }}>#{c.patientId}</td>
                  <td style={{ padding: '6px 10px' }}>{c.ageAtDeath}</td>
                  <td style={{ padding: '6px 10px' }}>{c.daysOnHospice}</td>
                  <td style={{ padding: '6px 10px' }}>{statusBadge(c.status)}</td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>
                    {c.caregiverName ?? '—'}
                    {c.caregiverIsFamilial === false && (
                      <span style={{ color: '#b91c1c', marginLeft: 6 }}>
                        (nonfamilial)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>
                    {c.vendorName ?? '—'}
                  </td>
                  <td style={{ padding: '6px 10px', display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedCase(c)}
                      style={{ fontSize: 12 }}
                    >
                      Details
                    </button>
                    {c.status === 'Eligible' && (
                      <button
                        type="button"
                        onClick={() => void handleSubmit(c)}
                        style={{ fontSize: 12 }}
                      >
                        Submit
                      </button>
                    )}
                    {c.status !== 'SubmittedToVendor'
                      && c.status !== 'Excluded' && (
                        <button
                          type="button"
                          onClick={() => void handleExclude(c)}
                          style={{ fontSize: 12 }}
                        >
                          Exclude
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <section
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        padding: 16,
        background: '#f8fafc',
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>
            Case #{caseRow.id} — Patient #{caseRow.patientId}
          </h3>
          <div style={{ color: '#64748b', fontSize: 13 }}>
            Death {caseRow.dateOfDeath} · Admit {caseRow.admittedAt} ·
            {' '}{caseRow.daysOnHospice} days · age {caseRow.ageAtDeath} ·
            {' '}{statusBadge(caseRow.status)}
          </div>
        </div>
        <button type="button" onClick={onClose}>Close</button>
      </div>

      {caseRow.ineligibleReason && (
        <div style={{ color: '#b45309' }}>
          <strong>Ineligible:</strong> {caseRow.ineligibleReason}
        </div>
      )}
      {caseRow.exclusionReason && (
        <div style={{ color: '#991b1b' }}>
          <strong>Excluded:</strong> {caseRow.exclusionReason}
        </div>
      )}
      {caseRow.submittedToVendorAt && (
        <div style={{ color: '#166534' }}>
          <strong>Submitted</strong> {caseRow.submittedToVendorAt.slice(0, 10)} to
          {' '}{caseRow.vendorName}
          {caseRow.vendorConfirmation
            && ` (conf ${caseRow.vendorConfirmation})`}
        </div>
      )}

      <form onSubmit={save} style={{ display: 'grid', gap: 8 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
          Primary Caregiver
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <input
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Relationship (nonfamilial legal guardians make case ineligible)
          </span>
          <select value={isFamilial} onChange={(e) => setIsFamilial(e.target.value)}>
            <option value="">— Not specified —</option>
            <option value="true">Familial / informal</option>
            <option value="false">Nonfamilial legal guardian</option>
          </select>
        </label>
        <textarea
          placeholder="Notes (optional)"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {err && <div role="alert" style={{ color: '#b91c1c' }}>{err}</div>}
        <button type="submit" disabled={saving} style={{ justifySelf: 'start' }}>
          {saving ? 'Saving…' : 'Save Caregiver'}
        </button>
      </form>
    </section>
  );
}
