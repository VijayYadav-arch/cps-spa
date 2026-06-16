import { useEffect, useState } from 'react';
import {
  getDashboardSummary,
  getRevenue,
  getPayerMix,
  getArAging,
  getDenialAnalysis,
  getStatementCollection,
  type DashboardSummary,
  type RevenueTimeSeries,
  type PayerMix,
  type AgingSnapshot,
  type DenialAnalysis,
  type StatementCollectionStats,
} from '@/api/analytics';
import {
  getInboxAggregateTiming,
  formatDuration,
  type InboxAggregateTiming,
} from '@/api/billing';

function money(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function metricCard(label: string, value: string, toneClass = 'text-navy-900', subtitle?: string) {
  return (
    <div className="card-hover min-w-[160px] flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${toneClass}`}>{value}</div>
      {subtitle && <div className="mt-1 text-xs text-slate-400">{subtitle}</div>}
    </div>
  );
}

// Minimal inline bar chart — width proportional to max amount in the row set.
function barRow(label: string, value: number, max: number, barClass = 'bg-sky-500') {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-[110px] text-xs text-slate-600">{label}</div>
      <div className="relative h-4 flex-1 rounded bg-slate-100">
        <div
          className={`h-full rounded transition-all ${barClass}`}
          style={{ width: `${w}%` }}
        />
      </div>
      <div className="w-[110px] text-right text-xs text-navy-900">
        {money(value)}
      </div>
    </div>
  );
}

export function AnalyticsDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueTimeSeries | null>(null);
  const [payerMix, setPayerMix] = useState<PayerMix | null>(null);
  const [aging, setAging] = useState<AgingSnapshot | null>(null);
  const [denials, setDenials] = useState<DenialAnalysis | null>(null);
  const [statements, setStatements] = useState<StatementCollectionStats | null>(null);
  const [opsTiming, setOpsTiming] = useState<InboxAggregateTiming | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getDashboardSummary(),
      getRevenue(),
      getPayerMix(),
      getArAging(),
      getDenialAnalysis(),
      getStatementCollection(),
      // Inbox aggregate is best-effort — a user without billing:queue
      // can still see the rest of the dashboard.
      getInboxAggregateTiming().catch(() => null),
    ])
      .then(([s, r, p, a, d, st, ops]) => {
        if (cancelled) return;
        setSummary(s);
        setRevenue(r);
        setPayerMix(p);
        setAging(a);
        setDenials(d);
        setStatements(st);
        setOpsTiming(ops);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div role="status" className="p-6 text-slate-500">Loading analytics…</div>;
  if (error) return <div role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;

  const revenuePoints = revenue?.points ?? [];
  const revenueMax = Math.max(1, ...revenuePoints.map((p) => p.billedAmount));
  const payerRows = payerMix?.rows.slice(0, 6) ?? [];

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl">Analytics</h1>
        <div className="section-line" />
      </header>

      {/* Headline row */}
      {summary && (
        <div className="flex flex-wrap gap-4">
          {metricCard('Revenue (30d)', money(summary.revenueLast30), 'text-success')}
          {metricCard('Revenue (90d)', money(summary.revenueLast90), 'text-sky-600')}
          {metricCard('Outstanding AR', money(summary.outstandingAr), 'text-accent-600')}
          {metricCard('Open denials', summary.openDenials.toString(), 'text-error')}
          {metricCard('Open statements', summary.openStatements.toString(), 'text-violet-600')}
          {metricCard(
            'Collection rate (90d)',
            pct(summary.overallCollectionRatePct),
            summary.overallCollectionRatePct >= 90 ? 'text-success' : 'text-accent-600',
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue series */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Monthly revenue (last 12 months)</h2>
          {revenuePoints.length === 0 ? (
            <div className="text-sm text-slate-500">No revenue data in window.</div>
          ) : (
            <div>
              {revenuePoints.map((p) => (
                <div key={p.month} className="mb-1">
                  {barRow(p.month.slice(0, 7), p.billedAmount, revenueMax, 'bg-sky-500')}
                  <div className="-mt-0.5 ml-[118px] text-xs text-slate-400">
                    Collected: {money(p.collectedAmount)} · {p.claimCount} claims
                  </div>
                </div>
              ))}
              <div className="mt-3 text-sm text-slate-700">
                <strong>Total billed:</strong> {money(revenue!.totalBilled)} ·{' '}
                <strong>Collected:</strong> {money(revenue!.totalCollected)} ·{' '}
                <strong>Rate:</strong> {pct(revenue!.collectionRatePct)}
              </div>
            </div>
          )}
        </section>

        {/* Payer mix */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Top payers by billed amount</h2>
          {payerRows.length === 0 ? (
            <div className="text-sm text-slate-500">No payer data.</div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="p-1.5 text-left">Payer</th>
                  <th className="p-1.5 text-right">Claims</th>
                  <th className="p-1.5 text-right">Billed</th>
                  <th className="p-1.5 text-right">Collected</th>
                  <th className="p-1.5 text-right">Denial %</th>
                </tr>
              </thead>
              <tbody>
                {payerRows.map((r) => (
                  <tr key={r.payer} className="border-b border-slate-100">
                    <td className="p-1.5 text-slate-700">{r.payer}</td>
                    <td className="p-1.5 text-right text-slate-700">{r.claimCount}</td>
                    <td className="p-1.5 text-right text-slate-700">{money(r.billedAmount)}</td>
                    <td className="p-1.5 text-right text-slate-700">{money(r.collectedAmount)}</td>
                    <td
                      className={`p-1.5 text-right ${
                        r.denialRatePct > 10 ? 'text-error' : 'text-slate-600'
                      }`}
                    >
                      {pct(r.denialRatePct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* AR aging */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">AR aging</h2>
          {aging && (
            <>
              <div className="mb-2 text-sm text-slate-500">
                Outstanding: <strong className="text-navy-900">{money(aging.totalOutstanding)}</strong> ·
                DSO: <strong className="text-navy-900">{aging.daysSalesOutstanding.toFixed(1)} days</strong>
              </div>
              {aging.buckets.map((b) => (
                <div key={b.bucket}>
                  {barRow(`${b.bucket} days`, b.amount, aging.totalOutstanding || 1,
                    b.bucket === '120+' ? 'bg-red-500' : b.bucket === '91-120' ? 'bg-amber-500' : 'bg-sky-500')}
                  <div className="-mt-0.5 ml-[118px] text-xs text-slate-400">
                    {b.claimCount} claims
                  </div>
                </div>
              ))}
            </>
          )}
        </section>

        {/* Denial analysis */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Top denial reasons (6 mo)</h2>
          {denials && (
            <>
              <div className="mb-2 text-sm text-slate-500">
                <strong className="text-navy-900">{denials.totalDenials}</strong> total denials ·
                {' '}<strong className="text-error">{denials.openDenials}</strong> open ·
                {' '}<strong className="text-success">{denials.resolvedDenials}</strong> resolved
              </div>
              {denials.topReasons.length === 0 ? (
                <div className="text-sm text-slate-500">No denials in window.</div>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="p-1.5 text-left">CARC</th>
                      <th className="p-1.5 text-left">Reason</th>
                      <th className="p-1.5 text-right">Count</th>
                      <th className="p-1.5 text-right">Recovered</th>
                      <th className="p-1.5 text-right">Written off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {denials.topReasons.map((r) => (
                      <tr key={`${r.carc}-${r.description}`} className="border-b border-slate-100">
                        <td className="p-1.5 font-mono text-slate-700">{r.carc}</td>
                        <td className="p-1.5 text-slate-700">{r.description}</td>
                        <td className="p-1.5 text-right text-slate-700">{r.count}</td>
                        <td className="p-1.5 text-right text-success">
                          {money(r.recoveredAmount)}
                        </td>
                        <td className="p-1.5 text-right text-error">
                          {money(r.writtenOffAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </section>
      </div>

      {/* Statement collection — full width */}
      {statements && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Patient statement collection (6 mo)</h2>
          <div className="flex flex-wrap gap-4">
            {metricCard('Sent', statements.statementsSent.toString())}
            {metricCard('Paid', statements.statementsPaid.toString(), 'text-success')}
            {metricCard('Partial', statements.statementsPartial.toString(), 'text-accent-600')}
            {metricCard('Outstanding', statements.statementsOutstanding.toString(), 'text-error')}
            {metricCard('Total billed', money(statements.totalBilled))}
            {metricCard('Total collected', money(statements.totalCollected), 'text-success')}
            {metricCard(
              'Collection rate',
              pct(statements.collectionRatePct),
              statements.collectionRatePct >= 70 ? 'text-success' : 'text-accent-600',
            )}
            {metricCard('Avg days to pay', `${statements.avgDaysToPay.toFixed(1)} d`)}
          </div>
        </section>
      )}

      {/* Operations efficiency (inbox timing, 30d) */}
      {opsTiming && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Operations efficiency (30 days)</h2>
          <div className="flex flex-wrap gap-4">
            {metricCard('Items completed', opsTiming.completedCount.toString())}
            {metricCard('Avg time to claim', formatDuration(opsTiming.averageTimeToClaim))}
            {metricCard(
              'Avg time to complete',
              formatDuration(opsTiming.averageTimeToComplete),
              'text-success',
            )}
          </div>
        </section>
      )}
    </div>
  );
}
