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
    <div style={{ padding: 24 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Background jobs</h1>
        <p style={{ color: '#64748b', maxWidth: 720 }}>
          Health of recurring background services. Each service updates its
          row after every tick. The registry is in-memory — services with
          no row yet either haven't ticked since the last deploy or aren't
          registered.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, color: '#64748b' }}>
          <Link to="/platform">← Platform dashboard</Link>
          {asOf && <span>· as of {new Date(asOf).toLocaleTimeString()}</span>}
          <button
            type="button"
            onClick={() => { void load(); }}
            style={{ fontSize: 12 }}
          >
            Refresh now
          </button>
          <span>· auto-refreshes every 30s</span>
        </div>
      </header>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>
      )}

      {isLoading && rows.length === 0 && <div>Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div style={{ color: '#64748b' }}>
          No background services have ticked since the last deploy.
        </div>
      )}

      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>Service</th>
              <th style={{ padding: 8 }}>Cadence</th>
              <th style={{ padding: 8 }}>Last ran</th>
              <th style={{ padding: 8 }}>Last result</th>
              <th style={{ padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tone =
                r.lastError ? '#b91c1c'
                  : r.stale ? '#b45309'
                  : '#15803d';
              const label =
                r.lastError ? 'failed'
                  : r.stale ? 'stale'
                  : 'healthy';
              return (
                <tr key={r.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>
                    <div style={{ fontWeight: 600 }}>{r.displayName}</div>
                    <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                      {r.name}
                    </div>
                  </td>
                  <td style={{ padding: 8, fontSize: 13 }}>
                    {formatInterval(r.intervalSeconds)}
                  </td>
                  <td style={{ padding: 8, fontSize: 13 }}>
                    {formatRelative(r.secondsSinceLastRun)}
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {new Date(r.lastRanAtUtc).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: 8, fontSize: 13, maxWidth: 360 }}>
                    {r.summary}
                    {r.lastError && (
                      <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>
                        last error{r.lastErrorAtUtc
                          ? ` (${new Date(r.lastErrorAtUtc).toLocaleTimeString()})`
                          : ''}:{' '}{r.lastError}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4,
                      fontSize: 12, fontWeight: 600,
                      background: r.lastError ? '#fee2e2'
                        : r.stale ? '#fef3c7'
                        : '#dcfce7',
                      color: tone,
                    }}>
                      {label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
