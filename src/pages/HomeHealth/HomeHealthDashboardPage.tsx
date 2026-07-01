import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getHomeHealthDashboard,
  listHomeHealthEpisodes,
  type HomeHealthDashboard,
  type HomeHealthEpisodeListItem,
} from '@/api/homehealth';

const STATUS_TABS = [
  { key: 'active', label: 'Active' },
  { key: 'discharged', label: 'Discharged' },
  { key: 'all', label: 'All' },
] as const;

function metricCard(label: string, value: number, tone: string) {
  return (
    <div className="card-hover min-w-[150px] flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Agency-level Home Health overview — a dashboard header (counts) over a filterable list of every
 * episode across patients. Mirrors the Hospice work-queue surface for home health. Each row drills
 * into the existing patient-scoped episode detail. Gated by homehealth:view (route-level).
 */
export function HomeHealthDashboardPage() {
  const [dashboard, setDashboard] = useState<HomeHealthDashboard | null>(null);
  const [episodes, setEpisodes] = useState<HomeHealthEpisodeListItem[]>([]);
  const [status, setStatus] = useState<string>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHomeHealthDashboard()
      .then((d) => { if (!cancelled) setDashboard(d); })
      .catch(() => { /* dashboard is non-critical; the list drives the page */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listHomeHealthEpisodes(status)
      .then((rows) => { if (!cancelled) setEpisodes(rows); })
      .catch(() => { if (!cancelled) setError('Failed to load home-health episodes.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [status]);

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-serif text-navy-900">Home Health</h1>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Agency-wide view of home-health episodes. Open an episode to manage its plan of care,
          OASIS, payment periods, and NOA.
        </p>
      </header>

      {dashboard && (
        <section className="flex flex-wrap gap-4" data-testid="hh-metrics">
          {metricCard('Active episodes', dashboard.activeCount, 'text-navy-900')}
          {metricCard('Recert due ≤14d', dashboard.recertDueSoonCount, dashboard.recertDueSoonCount > 0 ? 'text-error' : 'text-success')}
          {metricCard('Started (30d)', dashboard.startedLast30Count, 'text-teal-700')}
          {metricCard('Community', dashboard.communityCount, 'text-navy-900')}
          {metricCard('Institutional', dashboard.institutionalCount, 'text-navy-900')}
          {metricCard('Discharged', dashboard.dischargedCount, 'text-slate-500')}
        </section>
      )}

      <div className="flex gap-1" role="tablist" aria-label="Episode status">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={status === t.key}
            data-testid={`hh-tab-${t.key}`}
            onClick={() => setStatus(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              status === t.key ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table data-testid="hh-episodes-table" className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Period</th>
                <th className="px-4 py-3">Cert window</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {episodes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-slate-400" data-testid="hh-empty">
                    No episodes for this filter.
                  </td>
                </tr>
              )}
              {episodes.map((e) => (
                <tr key={e.id} data-testid={`hh-row-${e.id}`} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/patients/${e.patientId}/home-health/${e.id}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      {e.patientName}
                    </Link>
                    <div className="text-xs text-slate-400">#{e.patientId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      e.status === 'active' ? 'bg-green-100 text-green-800'
                        : e.status === 'discharged' ? 'bg-slate-100 text-slate-600'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {e.status}
                    </span>
                    {e.recertDueSoon && (
                      <span data-testid={`hh-recert-${e.id}`} className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Recert due
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{e.periodNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{fmtDate(e.certFromDate)} – {fmtDate(e.certToDate)}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{e.admissionSource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
