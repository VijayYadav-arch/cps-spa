import { useEffect, useState } from 'react';
import {
  getArDashboard,
  logArCall,
  type ArActionQueueItem,
  type ArDashboardSummary,
} from '@/api/billing';

const VALID_OUTCOMES = [
  'pending',
  'promised-payment',
  'needs-resubmit',
  'needs-documentation',
  'escalated',
  'written-off',
];

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

export function ArDashboardPage() {
  const [summary, setSummary] = useState<ArDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

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
    <div style={{ padding: 24, maxWidth: 1200, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>AR Follow-Up Dashboard</h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Claims flagged for follow-up. The action queue shows what's due
          today or overdue; the by-payer view shows where your AR balance is
          stuck.
        </p>
      </header>

      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {actionMsg && <div style={{ color: '#15803d' }}>{actionMsg}</div>}
      {isLoading && <div role="status">Loading…</div>}

      {summary && !isLoading && (
        <>
          <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {metricCard('Follow-Up Claims', summary.totalFollowUpClaims.toString(), '#0f172a')}
            {metricCard('Total AR', formatMoney(summary.totalAmount), '#0f172a')}
            {metricCard(
              '> 90-Day AR',
              formatMoney(summary.amountOver90Days),
              summary.amountOver90Days > 0 ? '#b91c1c' : '#15803d',
            )}
            {metricCard(
              'Actions Due Today',
              summary.actionsDueToday.toString(),
              summary.actionsDueToday > 0 ? '#b45309' : '#15803d',
            )}
            {metricCard(
              'Actions Overdue',
              summary.actionsOverdue.toString(),
              summary.actionsOverdue > 0 ? '#b91c1c' : '#15803d',
            )}
          </section>

          <section style={{ display: 'grid', gap: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>
              Action Queue ({summary.actionQueue.length})
            </h3>
            {summary.actionQueue.length === 0 ? (
              <p style={{ color: '#64748b' }}>
                No follow-ups due today. Great job staying on top of AR.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px' }}>Claim</th>
                    <th style={{ padding: '6px 10px' }}>Patient</th>
                    <th style={{ padding: '6px 10px' }}>Payer</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>$</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Aged</th>
                    <th style={{ padding: '6px 10px' }}>Due</th>
                    <th style={{ padding: '6px 10px' }}>Last Contact</th>
                    <th style={{ padding: '6px 10px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {summary.actionQueue.map((c) => (
                    <tr key={c.claimId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 13 }}>
                        {c.claimNumber}
                      </td>
                      <td style={{ padding: '6px 10px' }}>{c.patientName}</td>
                      <td style={{ padding: '6px 10px' }}>{c.payer}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {formatMoney(c.amount)}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {c.daysAged}d
                      </td>
                      <td
                        style={{
                          padding: '6px 10px',
                          color: c.daysUntilFollowUp < 0
                            ? '#b91c1c'
                            : c.daysUntilFollowUp === 0
                              ? '#b45309'
                              : '#0f172a',
                          fontWeight: 600,
                        }}
                      >
                        {c.daysUntilFollowUp < 0
                          ? `${Math.abs(c.daysUntilFollowUp)}d overdue`
                          : c.daysUntilFollowUp === 0
                            ? 'Today'
                            : `${c.daysUntilFollowUp}d`}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>
                        {c.lastContactedAt?.slice(0, 10) ?? '—'}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <button
                          type="button"
                          onClick={() => void handleLogCall(c)}
                          style={{ fontSize: 12 }}
                        >
                          Log Call
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section style={{ display: 'grid', gap: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>
              AR by Payer
            </h3>
            {summary.byPayer.length === 0 ? (
              <p style={{ color: '#64748b' }}>No payer activity yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px' }}>Payer</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Claims</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Total $</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>0-30</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>31-60</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>61-90</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>&gt; 90</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>&gt; 90 $</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byPayer.map((p) => (
                    <tr key={p.payer} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{p.payer}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {p.claimCount}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {formatMoney(p.totalAmount)}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {p.bucket0To30Count}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {p.bucket31To60Count}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {p.bucket61To90Count}
                      </td>
                      <td
                        style={{
                          padding: '6px 10px',
                          textAlign: 'right',
                          color: p.over90Count > 0 ? '#b91c1c' : '#0f172a',
                          fontWeight: p.over90Count > 0 ? 600 : 400,
                        }}
                      >
                        {p.over90Count}
                      </td>
                      <td
                        style={{
                          padding: '6px 10px',
                          textAlign: 'right',
                          color: p.over90Amount > 0 ? '#b91c1c' : '#0f172a',
                          fontWeight: p.over90Amount > 0 ? 600 : 400,
                        }}
                      >
                        {formatMoney(p.over90Amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
