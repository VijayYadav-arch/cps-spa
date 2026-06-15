import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getArTicklers,
  bulkLogArCalls,
  type ArTicklerRow,
  type TicklerStatus,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const STATUS_TABS: { value: TicklerStatus; label: string; tone: string }[] = [
  { value: 'overdue', label: 'Overdue', tone: '#b91c1c' },
  { value: 'today', label: 'Today', tone: '#b45309' },
  { value: 'upcoming', label: 'Upcoming (7d)', tone: '#0369a1' },
  { value: 'all', label: 'All', tone: '#475569' },
];

const OUTCOMES = [
  'pending',
  'promised-payment',
  'needs-resubmit',
  'needs-documentation',
  'escalated',
  'written-off',
];

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function ArTicklerPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TicklerStatus>('overdue');
  const [rows, setRows] = useState<ArTicklerRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    contactName: '',
    outcome: 'promised-payment',
    note: '',
    nextFollowUpDate: '',
  });

  // Bulk log call posts to /billing/ar-followup/claims/bulk-notes → billing:ar-followup.
  const canFollowUp = usePermission(PERMISSIONS.BILLING_AR_FOLLOW_UP);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    setBulkResult(null);
    try {
      const res = await getArTicklers(tab, 100);
      setRows(res.data);
      setSelected(new Set());
    } catch {
      setError('Failed to load ticklers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [tab]);

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.claimId)));
  };

  const toggleRow = (claimId: number) => {
    const next = new Set(selected);
    if (next.has(claimId)) next.delete(claimId);
    else next.add(claimId);
    setSelected(next);
  };

  const submitBulk = async () => {
    try {
      const res = await bulkLogArCalls({
        claimIds: [...selected],
        contactName: form.contactName,
        outcome: form.outcome,
        note: form.note,
        nextFollowUpDate: form.nextFollowUpDate || null,
      });
      setBulkOpen(false);
      await load();
      // Set the summary AFTER reload — load() clears it on its way in.
      setBulkResult(
        `Logged ${res.summary.applied}/${res.summary.requested} ` +
        (res.summary.failed > 0 ? `(${res.summary.failed} failed)` : '— all applied'),
      );
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Bulk log failed';
      setError(message);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <button type="button" onClick={() => navigate('/billing/ar')}>
          ← AR Dashboard
        </button>
        <h1 style={{ margin: 0 }}>Tickler queue</h1>
      </div>
      <p style={{ color: '#64748b', maxWidth: 720 }}>
        Claims whose next follow-up date is past due, today, or in the next
        seven days. Select multiple rows and "Bulk log call" to apply the
        same outcome to all of them in one shot.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            style={{
              padding: '6px 12px', border: '1px solid #cbd5e1',
              background: tab === t.value ? t.tone : '#fff',
              color: tab === t.value ? '#fff' : '#0f172a',
              borderRadius: 6, cursor: 'pointer',
              fontWeight: tab === t.value ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          disabled={selected.size === 0 || !canFollowUp}
          title={!canFollowUp ? NO_PERMISSION : undefined}
        >
          Bulk log call ({selected.size})
        </button>
      </div>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>
      )}
      {bulkResult && (
        <div style={{ color: '#15803d', marginBottom: 12 }}>{bulkResult}</div>
      )}

      {isLoading && <div>Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div style={{ color: '#64748b' }}>No claims match this view.</div>
      )}

      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={selected.size > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                />
              </th>
              <th style={{ padding: 8 }}>Claim</th>
              <th style={{ padding: 8 }}>Patient</th>
              <th style={{ padding: 8 }}>Payer</th>
              <th style={{ padding: 8, textAlign: 'right' }}>$</th>
              <th style={{ padding: 8 }}>Aged</th>
              <th style={{ padding: 8 }}>Due</th>
              <th style={{ padding: 8 }}>Last contact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const dueColor =
                r.daysUntilFollowUp < 0 ? '#b91c1c'
                  : r.daysUntilFollowUp === 0 ? '#b45309'
                  : '#0f172a';
              const dueText =
                r.daysUntilFollowUp < 0 ? `${Math.abs(r.daysUntilFollowUp)}d overdue`
                  : r.daysUntilFollowUp === 0 ? 'Today'
                  : `in ${r.daysUntilFollowUp}d`;
              return (
                <tr key={r.claimId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>
                    <input
                      type="checkbox"
                      aria-label={`Select claim ${r.claimNumber}`}
                      checked={selected.has(r.claimId)}
                      onChange={() => toggleRow(r.claimId)}
                    />
                  </td>
                  <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 13 }}>
                    {r.claimNumber}
                  </td>
                  <td style={{ padding: 8 }}>{r.patientName}</td>
                  <td style={{ padding: 8 }}>{r.payer}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    {formatMoney(r.amount)}
                  </td>
                  <td style={{ padding: 8 }}>{r.daysAged}d</td>
                  <td style={{ padding: 8, color: dueColor, fontWeight: 600 }}>
                    {dueText}
                  </td>
                  <td style={{ padding: 8, color: '#64748b' }}>
                    {r.lastContactedAt?.slice(0, 10) ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {bulkOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bulk log call"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 420 }}>
            <h2 style={{ marginTop: 0 }}>Bulk log call ({selected.size})</h2>
            <p style={{ color: '#64748b', fontSize: 13 }}>
              Same outcome + note will be applied to all {selected.size} selected
              claims.
            </p>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Contact name
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                style={{ width: '100%' }}
              />
            </label>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Outcome
              <select
                value={form.outcome}
                onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
                style={{ width: '100%' }}
              >
                {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Note
              <textarea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                rows={3}
                style={{ width: '100%' }}
              />
            </label>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Next follow-up date
              <input
                type="date"
                value={form.nextFollowUpDate}
                onChange={(e) => setForm((f) => ({ ...f, nextFollowUpDate: e.target.value }))}
                style={{ width: '100%' }}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setBulkOpen(false)}>Cancel</button>
              <button
                type="button"
                onClick={() => { void submitBulk(); }}
                disabled={!canFollowUp}
                title={!canFollowUp ? NO_PERMISSION : undefined}
              >
                Apply to {selected.size}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
