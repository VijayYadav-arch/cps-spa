import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBackgroundJobs, type BackgroundJobTick } from '@/api/platform';

const REFRESH_INTERVAL_MS = 30_000;

function formatRelative(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatInterval(seconds: number): string {
  if (seconds < 60) return `every ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `every ${minutes}m`;
  return `every ${Math.floor(minutes / 60)}h`;
}

export function BackgroundJobsPage() {
  const [rows, setRows] = useState<BackgroundJobTick[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await getBackgroundJobs();
      setRows(res.data);
      setAsOf(res.asOfUtc);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to load background-job health';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const id = window.setInterval(() => { void load(); }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl">Background jobs</h1>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Health of recurring background services. Each service updates its
          row after every tick. The registry is in-memory — services with
          no row yet either haven't ticked since the last deploy or aren't
          registered.
        </p>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Link to="/platform" className="font-medium text-teal-700 hover:underline">← Platform dashboard</Link>
          {asOf && <span>· as of {new Date(asOf).toLocaleTimeString()}</span>}
          <button
            type="button"
            onClick={() => { void load(); }}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Refresh now
          </button>
          <span>· auto-refreshes every 30s</span>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}

      {isLoading && rows.length === 0 && <div role="status" className="text-slate-500">Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div className="text-slate-500">
          No background services have ticked since the last deploy.
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Cadence</th>
                <th className="px-4 py-3">Last ran</th>
                <th className="px-4 py-3">Last result</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const badgeTone =
                  r.lastError ? 'bg-red-100 text-red-800'
                    : r.stale ? 'bg-amber-100 text-amber-800'
                    : 'bg-green-100 text-green-800';
                const label =
                  r.lastError ? 'failed'
                    : r.stale ? 'stale'
                    : 'healthy';
                return (
                  <tr key={r.name} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-700">{r.displayName}</div>
                      <div className="font-mono text-xs text-slate-500">
                        {r.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatInterval(r.intervalSeconds)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatRelative(r.secondsSinceLastRun)}
                      <div className="text-xs text-slate-500">
                        {new Date(r.lastRanAtUtc).toLocaleString()}
                      </div>
                    </td>
                    <td className="max-w-[360px] px-4 py-3 text-slate-700">
                      {r.summary}
                      {r.lastError && (
                        <div className="mt-1 text-xs text-red-700">
                          last error{r.lastErrorAtUtc
                            ? ` (${new Date(r.lastErrorAtUtc).toLocaleTimeString()})`
                            : ''}:{' '}{r.lastError}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badgeTone}`}>
                        {label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
