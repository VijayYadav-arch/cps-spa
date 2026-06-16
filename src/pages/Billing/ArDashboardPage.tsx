import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getArDashboard,
  logArCall,
  type ArActionQueueItem,
  type ArDashboardSummary,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const VALID_OUTCOMES = [
  'pending',
  'promised-payment',
  'needs-resubmit',
  'needs-documentation',
  'escalated',
  'written-off',
];

function metricCard(label: string, value: string, tone: string) {
  return (
    <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${tone}`}>
        {value}
      </div>
    </div>
  );
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? fallback
  );
}

export function ArDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ArDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Log Call posts to /billing/ar-followup/claims/{id}/notes → billing:ar-followup.
  const canFollowUp = usePermission(PERMISSIONS.BILLING_AR_FOLLOW_UP);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      setSummary(await getArDashboard());
    } catch {
      setError('Failed to load AR dashboard.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function handleLogCall(c: ArActionQueueItem) {
    setError(null);
    const contact = window.prompt('Contact name at payer:');
    if (!contact || !contact.trim()) return;
    const outcome = window.prompt(
      `Outcome — one of: ${VALID_OUTCOMES.join(' | ')}`,
      'pending',
    );
    if (!outcome || !VALID_OUTCOMES.includes(outcome)) return;
    const note = window.prompt('Note:');
    if (!note || !note.trim()) return;
    const nextDateStr = window.prompt(
      'Next follow-up date (YYYY-MM-DD, blank = none):',
    );
    let nextDate: string | null = null;
    if (nextDateStr?.trim()) {
      const parsed = new Date(nextDateStr.trim());
      if (Number.isNaN(parsed.getTime())) {
        setError('Invalid date.');
        return;
      }
      nextDate = parsed.toISOString();
    }
    try {
      await logArCall(c.claimId, {
        contactName: contact.trim(),
        outcome,
        note: note.trim(),
        nextFollowUpDate: nextDate,
      });
      setActionMsg(`Logged call for claim ${c.claimNumber}.`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to log call.'));
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl">AR Follow-Up Dashboard</h2>
          <div className="section-line mt-2" />
          <p className="mt-2 max-w-3xl text-slate-500">
            Claims flagged for follow-up. The action queue shows what's due
            today or overdue; the by-payer view shows where your AR balance is
            stuck.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/billing/ar/ticklers')}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Open tickler queue →
        </button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}
      {actionMsg && <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">{actionMsg}</div>}
      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}

      {summary && !isLoading && (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {metricCard('Follow-Up Claims', summary.totalFollowUpClaims.toString(), 'text-navy-900')}
            {metricCard('Total AR', formatMoney(summary.totalAmount), 'text-navy-900')}
            {metricCard(
              '> 90-Day AR',
              formatMoney(summary.amountOver90Days),
              summary.amountOver90Days > 0 ? 'text-error' : 'text-success',
            )}
            {metricCard(
              'Actions Due Today',
              summary.actionsDueToday.toString(),
              summary.actionsDueToday > 0 ? 'text-accent-600' : 'text-success',
            )}
            {metricCard(
              'Actions Overdue',
              summary.actionsOverdue.toString(),
              summary.actionsOverdue > 0 ? 'text-error' : 'text-success',
            )}
          </section>

          <section className="grid gap-3">
            <h3 className="text-lg font-semibold">
              Action Queue ({summary.actionQueue.length})
            </h3>
            {summary.actionQueue.length === 0 ? (
              <p className="text-slate-500">
                No follow-ups due today. Great job staying on top of AR.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                      <th className="px-4 py-3">Claim</th>
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">Payer</th>
                      <th className="px-4 py-3 text-right">$</th>
                      <th className="px-4 py-3 text-right">Aged</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3">Last Contact</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.actionQueue.map((c) => (
                      <tr key={c.claimId} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          {c.claimNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{c.patientName}</td>
                        <td className="px-4 py-3 text-slate-700">{c.payer}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatMoney(c.amount)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {c.daysAged}d
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold ${
                            c.daysUntilFollowUp < 0
                              ? 'text-error'
                              : c.daysUntilFollowUp === 0
                                ? 'text-accent-600'
                                : 'text-navy-900'
                          }`}
                        >
                          {c.daysUntilFollowUp < 0
                            ? `${Math.abs(c.daysUntilFollowUp)}d overdue`
                            : c.daysUntilFollowUp === 0
                              ? 'Today'
                              : `${c.daysUntilFollowUp}d`}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {c.lastContactedAt?.slice(0, 10) ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void handleLogCall(c)}
                            disabled={!canFollowUp}
                            title={!canFollowUp ? NO_PERMISSION : undefined}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Log Call
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="grid gap-3">
            <h3 className="text-lg font-semibold">
              AR by Payer
            </h3>
            {summary.byPayer.length === 0 ? (
              <p className="text-slate-500">No payer activity yet.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                      <th className="px-4 py-3">Payer</th>
                      <th className="px-4 py-3 text-right">Claims</th>
                      <th className="px-4 py-3 text-right">Total $</th>
                      <th className="px-4 py-3 text-right">0-30</th>
                      <th className="px-4 py-3 text-right">31-60</th>
                      <th className="px-4 py-3 text-right">61-90</th>
                      <th className="px-4 py-3 text-right">&gt; 90</th>
                      <th className="px-4 py-3 text-right">&gt; 90 $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byPayer.map((p) => (
                      <tr key={p.payer} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-700">{p.payer}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {p.claimCount}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatMoney(p.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {p.bucket0To30Count}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {p.bucket31To60Count}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {p.bucket61To90Count}
                        </td>
                        <td
                          className={`px-4 py-3 text-right ${
                            p.over90Count > 0 ? 'font-semibold text-error' : 'text-navy-900'
                          }`}
                        >
                          {p.over90Count}
                        </td>
                        <td
                          className={`px-4 py-3 text-right ${
                            p.over90Amount > 0 ? 'font-semibold text-error' : 'text-navy-900'
                          }`}
                        >
                          {formatMoney(p.over90Amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
