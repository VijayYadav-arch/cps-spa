import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getHomeHealthDashboard,
  listHomeHealthEpisodes,
  listHomeHealthBillingWorklist,
  type HomeHealthDashboard,
  type HomeHealthEpisodeListItem,
  type HomeHealthBillingWorklistItem,
} from '@/api/homehealth';

type View = 'active' | 'recerts' | 'noa' | 'oasis' | 'billing' | 'discharged';

const TABS: { key: View; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'recerts', label: 'Recerts due' },
  { key: 'noa', label: 'NOA overdue' },
  { key: 'oasis', label: 'OASIS incomplete' },
  { key: 'billing', label: 'Billing' },
  { key: 'discharged', label: 'Discharged' },
];

function metricCard(label: string, value: number, tone: string) {
  return (
    <div className="card-hover min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function HomeHealthDashboardPage() {
  const [dashboard, setDashboard] = useState<HomeHealthDashboard | null>(null);
  const [episodes, setEpisodes] = useState<HomeHealthEpisodeListItem[]>([]);
  const [billing, setBilling] = useState<HomeHealthBillingWorklistItem[]>([]);
  const [view, setView] = useState<View>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHomeHealthDashboard()
      .then((d) => { if (!cancelled) setDashboard(d); })
      .catch(() => { /* non-critical */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const load = view === 'billing'
      ? listHomeHealthBillingWorklist().then((b) => { if (!cancelled) setBilling(b); })
      : listHomeHealthEpisodes(view === 'discharged' ? 'discharged' : 'active')
          .then((rows) => { if (!cancelled) setEpisodes(rows); });
    load
      .catch(() => { if (!cancelled) setError('Failed to load home-health data.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [view]);

  // Recerts / NOA / OASIS worklists are the active set filtered by the relevant flag.
  const visibleEpisodes = useMemo(() => {
    switch (view) {
      case 'recerts': return episodes.filter((e) => e.recertDueSoon);
      case 'noa': return episodes.filter((e) => e.noaOverdue);
      case 'oasis': return episodes.filter((e) => !e.oasisComplete);
      default: return episodes; // active, discharged
    }
  }, [episodes, view]);

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-serif text-navy-900">Home Health</h1>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Agency-wide view of home-health episodes and the certification / billing worklists. Open an
          episode to manage its plan of care, F2F, OASIS, payment periods, and NOA.
        </p>
      </header>

      {dashboard && (
        <section className="flex flex-wrap gap-4" data-testid="hh-metrics">
          {metricCard('Active', dashboard.activeCount, 'text-navy-900')}
          {metricCard('Recert due', dashboard.recertDueSoonCount, dashboard.recertDueSoonCount > 0 ? 'text-error' : 'text-success')}
          {metricCard('NOA overdue', dashboard.noaOverdueCount, dashboard.noaOverdueCount > 0 ? 'text-error' : 'text-success')}
          {metricCard('OASIS incomplete', dashboard.oasisIncompleteCount, dashboard.oasisIncompleteCount > 0 ? 'text-error' : 'text-success')}
          {metricCard('Started (30d)', dashboard.startedLast30Count, 'text-teal-700')}
          {metricCard('Discharged', dashboard.dischargedCount, 'text-slate-500')}
        </section>
      )}

      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Home health views">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={view === t.key}
            data-testid={`hh-tab-${t.key}`}
            onClick={() => setView(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === t.key ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}

      {!isLoading && !error && view === 'billing' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table data-testid="hh-billing-table" className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3 text-right">Period</th>
                <th className="px-4 py-3">HIPPS</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {billing.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-3 text-slate-400" data-testid="hh-empty">No periods ready to bill.</td></tr>
              )}
              {billing.map((p) => (
                <tr key={p.periodId} data-testid={`hh-billing-${p.periodId}`} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/patients/${p.patientId}/home-health/${p.episodeId}`} className="font-medium text-teal-700 hover:underline">{p.patientName}</Link>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{p.periodSequence}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.hippsCode || '—'}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !error && view !== 'billing' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table data-testid="hh-episodes-table" className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3 text-right">Period</th>
                <th className="px-4 py-3">Cert window</th>
                <th className="px-4 py-3">NOA</th>
                <th className="px-4 py-3">OASIS</th>
              </tr>
            </thead>
            <tbody>
              {visibleEpisodes.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-3 text-slate-400" data-testid="hh-empty">Nothing in this worklist.</td></tr>
              )}
              {visibleEpisodes.map((e) => (
                <tr key={e.id} data-testid={`hh-row-${e.id}`} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/patients/${e.patientId}/home-health/${e.id}`} className="font-medium text-teal-700 hover:underline">{e.patientName}</Link>
                    <div className="text-xs text-slate-400">#{e.patientId}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{e.periodNumber}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {fmtDate(e.certFromDate)} – {fmtDate(e.certToDate)}
                    {e.recertDueSoon && <span data-testid={`hh-recert-${e.id}`} className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Recert due</span>}
                  </td>
                  <td className="px-4 py-3">
                    {e.noaSubmitted
                      ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Submitted</span>
                      : e.noaOverdue
                        ? <span data-testid={`hh-noa-overdue-${e.id}`} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Overdue</span>
                        : <span className="text-xs text-slate-500">Due {fmtDate(e.noaDueDate)}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {e.oasisComplete
                      ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Complete</span>
                      : <span data-testid={`hh-oasis-incomplete-${e.id}`} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Incomplete</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
