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

const BUCKETS: DenialAgingBucket[] = ['0-7', '8-30', '31-60', '61+'];

const BUCKET_COLOR: Record<DenialAgingBucket, string> = {
  '0-7': '#15803d',
  '8-30': '#0e7490',
  '31-60': '#b45309',
  '61+': '#b91c1c',
};

function metricCard(label: string, value: string, color: string) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        background: '#fff',
        minWidth: 160,
      }}
    >
      <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 6 }}>
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
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Denial Queue</h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Open denials grouped by aging. Click a row to draft an appeal letter,
          assign a worker, or move it through the appeal workflow.
        </p>
      </header>

      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {actionMsg && <div style={{ color: '#15803d' }}>{actionMsg}</div>}

      {summary && !isLoading && (
        <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {metricCard('Open Total', summary.totalOpen.toString(), '#0f172a')}
          {metricCard('New', summary.new.toString(), '#0e7490')}
          {metricCard('In Review', summary.inReview.toString(), '#0e7490')}
          {metricCard('Appealing', summary.appealing.toString(), '#1e40af')}
          {metricCard(
            'Overdue Deadline',
            summary.overdueAppealDeadline.toString(),
            summary.overdueAppealDeadline > 0 ? '#b91c1c' : '#15803d',
          )}
        </section>
      )}

      {queue && !isLoading && (
        <>
          <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <strong>Aging:</strong>
            <button
              type="button"
              onClick={() => setBucketFilter('all')}
              style={{
                fontWeight: bucketFilter === 'all' ? 700 : 400,
                background: bucketFilter === 'all' ? '#0ea5e9' : '#f1f5f9',
                color: bucketFilter === 'all' ? '#fff' : '#0f172a',
                border: 'none',
                padding: '4px 12px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              All ({queue.totalOpen})
            </button>
            {BUCKETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBucketFilter(b)}
                style={{
                  fontWeight: bucketFilter === b ? 700 : 400,
                  background: bucketFilter === b ? BUCKET_COLOR[b] : '#f1f5f9',
                  color: bucketFilter === b ? '#fff' : '#0f172a',
                  border: 'none',
                  padding: '4px 12px',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {b} ({{
                  '0-7': queue.bucket0To7,
                  '8-30': queue.bucket8To30,
                  '31-60': queue.bucket31To60,
                  '61+': queue.bucket61Plus,
                }[b]})
              </button>
            ))}
            <span style={{ marginLeft: 'auto', color: '#64748b' }}>
              Total at risk: <strong style={{ color: '#0f172a' }}>{formatMoney(queue.totalAmountAtRisk)}</strong>
            </span>
          </section>

          {filtered.length === 0 ? (
            <p style={{ color: '#64748b' }}>
              No open denials {bucketFilter !== 'all' && `in the ${bucketFilter} bucket`}.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px' }}>Claim</th>
                  <th style={{ padding: '6px 10px' }}>Payer</th>
                  <th style={{ padding: '6px 10px' }}>Code</th>
                  <th style={{ padding: '6px 10px' }}>Category</th>
                  <th style={{ padding: '6px 10px' }}>Status</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>$</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Days</th>
                  <th style={{ padding: '6px 10px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 13 }}>
                      {d.claimNumber}
                    </td>
                    <td style={{ padding: '6px 10px' }}>{d.payerName}</td>
                    <td style={{ padding: '6px 10px' }}>{d.denialCode}</td>
                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{d.category}</td>
                    <td style={{ padding: '6px 10px' }}>{d.status}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      {formatMoney(d.claimAmount)}
                    </td>
                    <td
                      style={{
                        padding: '6px 10px',
                        textAlign: 'right',
                        color: BUCKET_COLOR[d.agingBucket],
                        fontWeight: 600,
                      }}
                    >
                      {d.daysOutstanding}d
                    </td>
                    <td style={{ padding: '6px 10px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => void handleDraftLetter(d)}
                        style={{ fontSize: 12 }}
                      >
                        Letter
                      </button>
                      {d.status === 'new' && (
                        <button
                          type="button"
                          onClick={() => void handleStartAppeal(d)}
                          style={{ fontSize: 12 }}
                        >
                          Start
                        </button>
                      )}
                      {d.status === 'in-review' && (
                        <button
                          type="button"
                          onClick={() => void handleSubmitAppeal(d)}
                          style={{ fontSize: 12 }}
                        >
                          Submit
                        </button>
                      )}
                      {(d.status === 'appealing' || d.status === 'in-review') && (
                        <button
                          type="button"
                          onClick={() => void handleResolve(d)}
                          style={{ fontSize: 12 }}
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {letter && (
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
                Appeal Letter Draft — Denial #{letter.denialWorkItemId}
              </h3>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                {letter.payerName} · Claim {letter.claimNumber}
              </div>
            </div>
            <button type="button" onClick={() => setLetter(null)}>Close</button>
          </div>
          <div>
            <strong>Subject:</strong>
            <div style={{ marginTop: 4 }}>{letter.subjectLine}</div>
          </div>
          <pre
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: 12,
              whiteSpace: 'pre-wrap',
              fontFamily: 'system-ui',
              fontSize: 13,
            }}
          >
            {letter.body}
          </pre>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(`${letter.subjectLine}\n\n${letter.body}`);
              setActionMsg('Letter copied to clipboard.');
            }}
            style={{ justifySelf: 'start' }}
          >
            Copy to Clipboard
          </button>
        </section>
      )}
    </div>
  );
}
