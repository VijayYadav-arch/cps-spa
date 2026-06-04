import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getInbox,
  getWorkQueue,
  getWorkQueueStats,
  type WorkQueueItem,
  type WorkQueueStats,
} from '@/api/billing';

const TYPE_BADGE: Record<string, string> = {
  'new-encounter': 'bg-teal-100 text-teal-700',
  resubmit: 'bg-purple-100 text-purple-700',
  denied: 'bg-red-100 text-red-700',
  'follow-up': 'bg-amber-100 text-amber-700',
  secondary: 'bg-slate-100 text-slate-600',
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-slate-100 text-slate-600',
};

const FILTERS = [
  { label: 'All', value: 'all' as const },
  { label: 'Assigned to me', value: 'mine' as const },
] as const;

type FilterMode = (typeof FILTERS)[number]['value'];

export function WorkQueuePage() {
  const [items, setItems] = useState<WorkQueueItem[]>([]);
  const [stats, setStats] = useState<WorkQueueStats | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const loader = filter === 'mine' ? getInbox(true) : getWorkQueue();
    Promise.all([loader, getWorkQueueStats()])
      .then(([list, s]) => {
        if (cancelled) return;
        setItems(list.data ?? []);
        setStats(s);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load work queue');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <section className="p-4 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <Link to="/billing" className="text-sm text-teal-600 hover:text-teal-700">
          &larr; Back to Billing
        </Link>
        <h1 className="text-2xl font-serif text-slate-900 mt-2">Work Queue</h1>
        <p className="text-slate-500 text-sm mt-1">
          Prioritized billing tasks across the org. Switch to "Assigned to me" for your inbox.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {stats &&
          [
            { label: 'Total', value: stats.total, color: '' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-blue-600' },
            { label: 'Critical', value: stats.critical, color: 'text-red-600' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-700' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
      </div>

      <div className="flex gap-1 mb-4" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === f.value
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading work queue...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium mb-1">Queue clear</p>
            <p className="text-sm">No items match the current filter.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Due</th>
                <th className="px-5 py-3">Claim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        PRIORITY_BADGE[it.priority] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {it.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        TYPE_BADGE[it.type] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {it.type.replace(/-/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-700 max-w-md truncate">
                    {it.description}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 capitalize">
                    {it.status.replace(/-/g, ' ')}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">
                    {it.dueDate ? new Date(it.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm">
                    {it.claimId ? (
                      <Link to={`/claims/${it.claimId}`} className="text-teal-600 hover:text-teal-700">
                        #{it.claimId}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
