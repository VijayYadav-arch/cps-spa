import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getDashboardSummary,
  getDenialAnalysis,
  getRevenue,
  type DashboardSummary,
  type DenialAnalysis,
  type RevenueTimeSeries,
} from '@/api/analytics';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const percent = (pct: number) => `${pct.toFixed(1)}%`;

export function BillingAnalyticsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueTimeSeries | null>(null);
  const [denials, setDenials] = useState<DenialAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getDashboardSummary(), getRevenue(), getDenialAnalysis()])
      .then(([s, r, d]) => {
        if (cancelled) return;
        setSummary(s);
        setRevenue(r);
        setDenials(d);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = summary
    ? [
        { label: 'Revenue (last 30d)', value: currency.format(summary.revenueLast30) },
        { label: 'Revenue (last 90d)', value: currency.format(summary.revenueLast90) },
        {
          label: 'Outstanding AR',
          value: currency.format(summary.outstandingAr),
          color: 'text-amber-600',
        },
        {
          label: 'Open Denials',
          value: String(summary.openDenials),
          color: summary.openDenials > 0 ? 'text-red-600' : '',
        },
        {
          label: 'Collection Rate',
          value: percent(summary.overallCollectionRatePct),
          color:
            summary.overallCollectionRatePct >= 95
              ? 'text-green-600'
              : summary.overallCollectionRatePct >= 90
              ? 'text-amber-600'
              : 'text-red-600',
        },
      ]
    : [];

  return (
    <section className="p-4 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/billing" className="text-sm text-teal-600 hover:text-teal-700">
            &larr; Back to Billing
          </Link>
          <h1 className="text-2xl font-serif text-slate-900 mt-2">Billing Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">
            Revenue cycle performance metrics and trends.
          </p>
        </div>
        <Link
          to="/analytics"
          className="px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
        >
          Full analytics dashboard &rarr;
        </Link>
      </header>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-500">
          Loading analytics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${k.color ?? ''}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {revenue && (
            <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenue Trend</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Total Billed</p>
                  <p className="font-bold text-slate-900">{currency.format(revenue.totalBilled)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Total Collected</p>
                  <p className="font-bold text-green-700">{currency.format(revenue.totalCollected)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Collection Rate</p>
                  <p className="font-bold text-slate-900">{percent(revenue.collectionRatePct)}</p>
                </div>
              </div>
              {revenue.points.length === 0 ? (
                <p className="text-sm text-slate-500">No revenue data in range.</p>
              ) : (
                <div className="flex items-end gap-1 h-24">
                  {revenue.points.map((p) => {
                    const maxBilled = Math.max(...revenue.points.map((x) => x.billedAmount), 1);
                    const height = Math.max((p.billedAmount / maxBilled) * 100, 4);
                    return (
                      <div
                        key={p.month}
                        className="flex-1 bg-teal-500 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${p.month}: ${currency.format(p.billedAmount)} billed`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {denials && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Top Denial Reasons</h2>
                <div className="text-sm text-slate-600">
                  {denials.totalDenials} total &middot; {denials.openDenials} open &middot;{' '}
                  {denials.resolvedDenials} resolved
                </div>
              </div>
              {denials.topReasons.length === 0 ? (
                <p className="text-sm text-slate-500">No denial activity in range.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-3 py-2">CARC</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2 text-right">Count</th>
                      <th className="px-3 py-2 text-right">Written Off</th>
                      <th className="px-3 py-2 text-right">Recovered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {denials.topReasons.map((r) => (
                      <tr key={r.carc} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono">{r.carc}</td>
                        <td className="px-3 py-2 text-slate-700">{r.description}</td>
                        <td className="px-3 py-2 text-right">{r.count}</td>
                        <td className="px-3 py-2 text-right text-red-700">
                          {currency.format(r.writtenOffAmount)}
                        </td>
                        <td className="px-3 py-2 text-right text-green-700">
                          {currency.format(r.recoveredAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
