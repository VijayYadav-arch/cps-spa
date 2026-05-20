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

function money(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function metricCard(label: string, value: string, color = '#0f172a', subtitle?: string) {
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
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 6 }}>{value}</div>
      {subtitle && <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

// Minimal inline bar chart — width proportional to max amount in the row set.
function barRow(label: string, value: number, max: number, color = '#2563eb') {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <div style={{ width: 110, fontSize: 12, color: '#475569' }}>{label}</div>
      <div style={{ flex: 1, background: '#f1f5f9', height: 16, borderRadius: 4, position: 'relative' }}>
        <div
          style={{
            width: `${w}%`,
            background: color,
            height: '100%',
            borderRadius: 4,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <div style={{ width: 110, fontSize: 12, color: '#0f172a', textAlign: 'right' }}>
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
    ])
      .then(([s, r, p, a, d, st]) => {
        if (cancelled) return;
        setSummary(s);
        setRevenue(r);
        setPayerMix(p);
        setAging(a);
        setDenials(d);
        setStatements(st);
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

  if (loading) return <div style={{ padding: 24 }}>Loading analytics…</div>;
  if (error) return <div style={{ padding: 24, color: '#dc2626' }}>{error}</div>;

  const revenuePoints = revenue?.points ?? [];
  const revenueMax = Math.max(1, ...revenuePoints.map((p) => p.billedAmount));
  const payerRows = payerMix?.rows.slice(0, 6) ?? [];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Analytics</h1>

      {/* Headline row */}
      {summary && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          {metricCard('Revenue (30d)', money(summary.revenueLast30), '#16a34a')}
          {metricCard('Revenue (90d)', money(summary.revenueLast90), '#0ea5e9')}
          {metricCard('Outstanding AR', money(summary.outstandingAr), '#f59e0b')}
          {metricCard('Open denials', summary.openDenials.toString(), '#dc2626')}
          {metricCard('Open statements', summary.openStatements.toString(), '#8b5cf6')}
          {metricCard(
            'Collection rate (90d)',
            pct(summary.overallCollectionRatePct),
            summary.overallCollectionRatePct >= 90 ? '#16a34a' : '#f59e0b',
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Revenue series */}
        <section>
          <h2 style={{ marginBottom: 12, fontSize: 16 }}>Monthly revenue (last 12 months)</h2>
          {revenuePoints.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>No revenue data in window.</div>
          ) : (
            <div>
              {revenuePoints.map((p) => (
                <div key={p.month} style={{ marginBottom: 4 }}>
                  {barRow(p.month.slice(0, 7), p.billedAmount, revenueMax, '#0ea5e9')}
                  <div style={{ marginLeft: 118, fontSize: 11, color: '#94a3b8', marginTop: -2 }}>
                    Collected: {money(p.collectedAmount)} · {p.claimCount} claims
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 13 }}>
                <strong>Total billed:</strong> {money(revenue!.totalBilled)} ·{' '}
                <strong>Collected:</strong> {money(revenue!.totalCollected)} ·{' '}
                <strong>Rate:</strong> {pct(revenue!.collectionRatePct)}
              </div>
            </div>
          )}
        </section>

        {/* Payer mix */}
        <section>
          <h2 style={{ marginBottom: 12, fontSize: 16 }}>Top payers by billed amount</h2>
          {payerRows.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>No payer data.</div>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ textAlign: 'left', padding: 6 }}>Payer</th>
                  <th style={{ textAlign: 'right', padding: 6 }}>Claims</th>
                  <th style={{ textAlign: 'right', padding: 6 }}>Billed</th>
                  <th style={{ textAlign: 'right', padding: 6 }}>Collected</th>
                  <th style={{ textAlign: 'right', padding: 6 }}>Denial %</th>
                </tr>
              </thead>
              <tbody>
                {payerRows.map((r) => (
                  <tr key={r.payer} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 6 }}>{r.payer}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>{r.claimCount}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>{money(r.billedAmount)}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>{money(r.collectedAmount)}</td>
                    <td
                      style={{
                        padding: 6,
                        textAlign: 'right',
                        color: r.denialRatePct > 10 ? '#dc2626' : '#475569',
                      }}
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
        <section>
          <h2 style={{ marginBottom: 12, fontSize: 16 }}>AR aging</h2>
          {aging && (
            <>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                Outstanding: <strong style={{ color: '#0f172a' }}>{money(aging.totalOutstanding)}</strong> ·
                DSO: <strong style={{ color: '#0f172a' }}>{aging.daysSalesOutstanding.toFixed(1)} days</strong>
              </div>
              {aging.buckets.map((b) => (
                <div key={b.bucket}>
                  {barRow(`${b.bucket} days`, b.amount, aging.totalOutstanding || 1,
                    b.bucket === '120+' ? '#dc2626' : b.bucket === '91-120' ? '#f59e0b' : '#0ea5e9')}
                  <div style={{ marginLeft: 118, fontSize: 11, color: '#94a3b8', marginTop: -2 }}>
                    {b.claimCount} claims
                  </div>
                </div>
              ))}
            </>
          )}
        </section>

        {/* Denial analysis */}
        <section>
          <h2 style={{ marginBottom: 12, fontSize: 16 }}>Top denial reasons (6 mo)</h2>
          {denials && (
            <>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                <strong style={{ color: '#0f172a' }}>{denials.totalDenials}</strong> total denials ·
                {' '}<strong style={{ color: '#dc2626' }}>{denials.openDenials}</strong> open ·
                {' '}<strong style={{ color: '#16a34a' }}>{denials.resolvedDenials}</strong> resolved
              </div>
              {denials.topReasons.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 13 }}>No denials in window.</div>
              ) : (
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ textAlign: 'left', padding: 6 }}>CARC</th>
                      <th style={{ textAlign: 'left', padding: 6 }}>Reason</th>
                      <th style={{ textAlign: 'right', padding: 6 }}>Count</th>
                      <th style={{ textAlign: 'right', padding: 6 }}>Recovered</th>
                      <th style={{ textAlign: 'right', padding: 6 }}>Written off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {denials.topReasons.map((r) => (
                      <tr key={`${r.carc}-${r.description}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: 6, fontFamily: 'monospace' }}>{r.carc}</td>
                        <td style={{ padding: 6 }}>{r.description}</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>{r.count}</td>
                        <td style={{ padding: 6, textAlign: 'right', color: '#16a34a' }}>
                          {money(r.recoveredAmount)}
                        </td>
                        <td style={{ padding: 6, textAlign: 'right', color: '#dc2626' }}>
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
        <section style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 12, fontSize: 16 }}>Patient statement collection (6 mo)</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {metricCard('Sent', statements.statementsSent.toString())}
            {metricCard('Paid', statements.statementsPaid.toString(), '#16a34a')}
            {metricCard('Partial', statements.statementsPartial.toString(), '#f59e0b')}
            {metricCard('Outstanding', statements.statementsOutstanding.toString(), '#dc2626')}
            {metricCard('Total billed', money(statements.totalBilled))}
            {metricCard('Total collected', money(statements.totalCollected), '#16a34a')}
            {metricCard(
              'Collection rate',
              pct(statements.collectionRatePct),
              statements.collectionRatePct >= 70 ? '#16a34a' : '#f59e0b',
            )}
            {metricCard('Avg days to pay', `${statements.avgDaysToPay.toFixed(1)} d`)}
          </div>
        </section>
      )}
    </div>
  );
}
