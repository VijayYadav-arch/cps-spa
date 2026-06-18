import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkQueue, getDenials, type WorkQueueStats, type DenialItem } from '@/api/billing';

export function BillingDashboard() {
  const [stats, setStats] = useState<WorkQueueStats | null>(null);
  const [denials, setDenials] = useState<DenialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getWorkQueue(),
      getDenials({ pageSize: 5 }),
    ])
      .then(([wq, dn]) => {
        if (!cancelled) {
          setStats(wq.stats);
          setDenials(dn.data);
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load billing data.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (isLoading) return <div role="status" className="text-slate-500">Loading billing dashboard…</div>;
  if (error) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <h2 className="text-2xl">Billing Dashboard</h2>
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Total Items', value: stats.total, alert: false },
            { label: 'Pending', value: stats.pending, alert: false },
            { label: 'In Progress', value: stats.inProgress, alert: false },
            { label: 'Critical', value: stats.critical, alert: stats.critical > 0 },
            { label: 'Overdue', value: stats.overdue, alert: stats.overdue > 0 },
          ].map(({ label, value, alert }) => (
            <div key={label} className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <p className={`mt-1.5 text-2xl font-bold ${alert ? 'text-red-600' : 'text-navy-900'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Denials</h3>
          <Link to="/billing/denials/queue" className="font-medium text-teal-700 hover:underline">View all</Link>
        </div>
        {denials.length === 0 ? (
          <p className="text-slate-500">No recent denials.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Payer</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {denials.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{d.id}</td>
                    <td className="px-4 py-3 text-slate-700">{d.payerName}</td>
                    <td className="px-4 py-3 text-slate-700">{d.denialCode}</td>
                    <td className="px-4 py-3 text-slate-700">{d.status}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {(() => { const dt = new Date(d.createdAt); return isNaN(dt.getTime()) ? d.createdAt : dt.toLocaleDateString(); })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
