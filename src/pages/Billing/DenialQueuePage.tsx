import { useEffect, useMemo, useState } from 'react';
import {
  getAppealLetterDraft,
  getDenialQueue,
  getDenialSummary,
  resolveDenial,
  startDenialAppeal,
  submitDenialAppeal,
  type AppealLetterDraft,
  type DenialAgingBucket,
  type DenialQueueItem,
  type DenialQueueResponse,
  type DenialSummaryResponse,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const BUCKETS: DenialAgingBucket[] = ['0-7', '8-30', '31-60', '61+'];

// Text-color class for the days-outstanding cell, keyed by aging bucket.
const BUCKET_TEXT: Record<DenialAgingBucket, string> = {
  '0-7': 'text-success',
  '8-30': 'text-cyan-700',
  '31-60': 'text-accent-600',
  '61+': 'text-error',
};

// Background-color class for the active aging-filter tab, keyed by aging bucket.
const BUCKET_BG: Record<DenialAgingBucket, string> = {
  '0-7': 'bg-green-700',
  '8-30': 'bg-cyan-700',
  '31-60': 'bg-accent-700',
  '61+': 'bg-red-700',
};

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

export function DenialQueuePage() {
  const [queue, setQueue] = useState<DenialQueueResponse | null>(null);
  const [summary, setSummary] = useState<DenialSummaryResponse | null>(null);
  const [bucketFilter, setBucketFilter] = useState<DenialAgingBucket | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [letter, setLetter] = useState<AppealLetterDraft | null>(null);

  // Start/Submit/Resolve all PUT through the billing:denials-gated controller.
  // The "Letter" action is a read-only GET (same gate as page view) → not gated.
  const canManageDenials = usePermission(PERMISSIONS.BILLING_DENIALS);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const [q, s] = await Promise.all([
        getDenialQueue(),
        getDenialSummary(),
      ]);
      setQueue(q);
      setSummary(s);
    } catch {
      setError('Failed to load denial queue.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo<DenialQueueItem[]>(() => {
    if (!queue) return [];
    if (bucketFilter === 'all') return queue.items;
    return queue.items.filter((i) => i.agingBucket === bucketFilter);
  }, [queue, bucketFilter]);

  async function handleDraftLetter(d: DenialQueueItem) {
    setError(null);
    try {
      setLetter(await getAppealLetterDraft(d.id));
    } catch (err) {
      setError(extractError(err, 'Failed to draft appeal letter.'));
    }
  }

  async function handleStartAppeal(d: DenialQueueItem) {
    setError(null);
    const notes = window.prompt('Notes for appeal start (optional):');
    try {
      await startDenialAppeal(d.id, notes?.trim() || null);
      setActionMsg(`Started appeal on denial #${d.id}.`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to start appeal.'));
    }
  }

  async function handleSubmitAppeal(d: DenialQueueItem) {
    setError(null);
    const notes = window.prompt('Notes for appeal submission:');
    try {
      await submitDenialAppeal(d.id, notes?.trim() || null);
      setActionMsg(`Submitted appeal on denial #${d.id}.`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to submit appeal.'));
    }
  }

  async function handleResolve(d: DenialQueueItem) {
    setError(null);
    const resolution = window.prompt('Resolution summary:');
    if (!resolution || !resolution.trim()) return;
    try {
      await resolveDenial(d.id, resolution.trim());
      setActionMsg(`Resolved denial #${d.id}.`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to resolve.'));
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header>
        <h2 className="text-2xl">Denial Queue</h2>
        <div className="section-line mt-2" />
        <p className="mt-2 max-w-3xl text-slate-500">
          Open denials grouped by aging. Click a row to draft an appeal letter,
          assign a worker, or move it through the appeal workflow.
        </p>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}
      {actionMsg && <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">{actionMsg}</div>}

      {summary && !isLoading && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {metricCard('Open Total', summary.totalOpen.toString(), 'text-navy-900')}
          {metricCard('New', summary.new.toString(), 'text-cyan-700')}
          {metricCard('In Review', summary.inReview.toString(), 'text-cyan-700')}
          {metricCard('Appealing', summary.appealing.toString(), 'text-blue-800')}
          {metricCard(
            'Overdue Deadline',
            summary.overdueAppealDeadline.toString(),
            summary.overdueAppealDeadline > 0 ? 'text-error' : 'text-success',
          )}
        </section>
      )}

      {queue && !isLoading && (
        <>
          <section className="flex flex-wrap items-baseline gap-3">
            <strong className="text-slate-700">Aging:</strong>
            <button
              type="button"
              onClick={() => setBucketFilter('all')}
              className={`rounded px-3 py-1 transition-colors ${
                bucketFilter === 'all'
                  ? 'bg-sky-500 font-bold text-white'
                  : 'bg-slate-100 text-navy-900 hover:bg-slate-200'
              }`}
            >
              All ({queue.totalOpen})
            </button>
            {BUCKETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBucketFilter(b)}
                className={`rounded px-3 py-1 transition-colors ${
                  bucketFilter === b
                    ? `${BUCKET_BG[b]} font-bold text-white`
                    : 'bg-slate-100 text-navy-900 hover:bg-slate-200'
                }`}
              >
                {b} ({{
                  '0-7': queue.bucket0To7,
                  '8-30': queue.bucket8To30,
                  '31-60': queue.bucket31To60,
                  '61+': queue.bucket61Plus,
                }[b]})
              </button>
            ))}
            <span className="ml-auto text-slate-500">
              Total at risk: <strong className="text-navy-900">{formatMoney(queue.totalAmountAtRisk)}</strong>
            </span>
          </section>

          {filtered.length === 0 ? (
            <p className="text-slate-500">
              No open denials {bucketFilter !== 'all' && `in the ${bucketFilter} bucket`}.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    <th className="px-4 py-3">Claim</th>
                    <th className="px-4 py-3">Payer</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">$</th>
                    <th className="px-4 py-3 text-right">Days</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {d.claimNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{d.payerName}</td>
                      <td className="px-4 py-3 text-slate-700">{d.denialCode}</td>
                      <td className="px-4 py-3 text-slate-500">{d.category}</td>
                      <td className="px-4 py-3 text-slate-700">{d.status}</td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatMoney(d.claimAmount)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${BUCKET_TEXT[d.agingBucket]}`}>
                        {d.daysOutstanding}d
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDraftLetter(d)}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Letter
                          </button>
                          {d.status === 'new' && (
                            <button
                              type="button"
                              onClick={() => void handleStartAppeal(d)}
                              disabled={!canManageDenials}
                              title={!canManageDenials ? NO_PERMISSION : undefined}
                              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Start
                            </button>
                          )}
                          {d.status === 'in-review' && (
                            <button
                              type="button"
                              onClick={() => void handleSubmitAppeal(d)}
                              disabled={!canManageDenials}
                              title={!canManageDenials ? NO_PERMISSION : undefined}
                              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Submit
                            </button>
                          )}
                          {(d.status === 'appealing' || d.status === 'in-review') && (
                            <button
                              type="button"
                              onClick={() => void handleResolve(d)}
                              disabled={!canManageDenials}
                              title={!canManageDenials ? NO_PERMISSION : undefined}
                              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Resolve
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
        </>
      )}

      {letter && (
        <section className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Appeal Letter Draft — Denial #{letter.denialWorkItemId}
              </h3>
              <div className="mt-1 text-sm text-slate-500">
                {letter.payerName} · Claim {letter.claimNumber}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLetter(null)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Close
            </button>
          </div>
          <div>
            <strong className="text-slate-700">Subject:</strong>
            <div className="mt-1 text-slate-700">{letter.subjectLine}</div>
          </div>
          <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 font-sans text-sm text-slate-700">
            {letter.body}
          </pre>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(`${letter.subjectLine}\n\n${letter.body}`);
              setActionMsg('Letter copied to clipboard.');
            }}
            className="btn-primary justify-self-start"
          >
            Copy to Clipboard
          </button>
        </section>
      )}
    </div>
  );
}
