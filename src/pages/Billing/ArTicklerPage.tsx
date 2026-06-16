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
  { value: 'overdue', label: 'Overdue', tone: 'bg-red-700' },
  { value: 'today', label: 'Today', tone: 'bg-accent-700' },
  { value: 'upcoming', label: 'Upcoming (7d)', tone: 'bg-sky-700' },
  { value: 'all', label: 'All', tone: 'bg-slate-600' },
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
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex items-baseline gap-3">
        <button
          type="button"
          onClick={() => navigate('/billing/ar')}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ← AR Dashboard
        </button>
        <h1 className="text-2xl">Tickler queue</h1>
      </div>
      <p className="max-w-3xl text-slate-500">
        Claims whose next follow-up date is past due, today, or in the next
        seven days. Select multiple rows and "Bulk log call" to apply the
        same outcome to all of them in one shot.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              tab === t.value
                ? `${t.tone} border-transparent font-semibold text-white`
                : 'border-slate-300 bg-white text-navy-900 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          disabled={selected.size === 0 || !canFollowUp}
          title={!canFollowUp ? NO_PERMISSION : undefined}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Bulk log call ({selected.size})
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}
      {bulkResult && (
        <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">{bulkResult}</div>
      )}

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div className="text-slate-500">No claims match this view.</div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={selected.size > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3">Claim</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Payer</th>
                <th className="px-4 py-3 text-right">$</th>
                <th className="px-4 py-3">Aged</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Last contact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const dueColor =
                  r.daysUntilFollowUp < 0 ? 'text-error'
                    : r.daysUntilFollowUp === 0 ? 'text-accent-600'
                    : 'text-navy-900';
                const dueText =
                  r.daysUntilFollowUp < 0 ? `${Math.abs(r.daysUntilFollowUp)}d overdue`
                    : r.daysUntilFollowUp === 0 ? 'Today'
                    : `in ${r.daysUntilFollowUp}d`;
                return (
                  <tr key={r.claimId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select claim ${r.claimNumber}`}
                        checked={selected.has(r.claimId)}
                        onChange={() => toggleRow(r.claimId)}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {r.claimNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.patientName}</td>
                    <td className="px-4 py-3 text-slate-700">{r.payer}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatMoney(r.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.daysAged}d</td>
                    <td className={`px-4 py-3 font-semibold ${dueColor}`}>
                      {dueText}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {r.lastContactedAt?.slice(0, 10) ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {bulkOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bulk log call"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/50"
        >
          <div className="min-w-[420px] rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Bulk log call ({selected.size})</h2>
            <p className="text-sm text-slate-500">
              Same outcome + note will be applied to all {selected.size} selected
              claims.
            </p>
            <label className="mt-3 grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Contact name</span>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                className="form-input"
              />
            </label>
            <label className="mt-3 grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Outcome</span>
              <select
                value={form.outcome}
                onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
                className="form-input"
              >
                {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="mt-3 grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Note</span>
              <textarea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                rows={3}
                className="form-input"
              />
            </label>
            <label className="mt-3 grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Next follow-up date</span>
              <input
                type="date"
                value={form.nextFollowUpDate}
                onChange={(e) => setForm((f) => ({ ...f, nextFollowUpDate: e.target.value }))}
                className="form-input"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void submitBulk(); }}
                disabled={!canFollowUp}
                title={!canFollowUp ? NO_PERMISSION : undefined}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
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
