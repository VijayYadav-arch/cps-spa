import '@/styles/denials.css';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDenials, type DenialItem } from '@/api/billing';
import { DocsLink } from '@/components/DocsLink';

const STATUS_TABS = [
  { label: 'All', value: null },
  { label: 'New', value: 'new' },
  { label: 'In Review', value: 'in-review' },
  { label: 'Appealing', value: 'appealing' },
  { label: 'Correcting', value: 'correcting' },
  { label: 'Resolved', value: 'resolved' },
] as const;

const CATEGORY_OPTIONS = [
  'auth',
  'medical-necessity',
  'coding',
  'timely-filing',
  'duplicate',
  'documentation',
  'patient-responsibility',
  'other',
] as const;

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-red-100 text-red-700',
  'in-review': 'bg-amber-100 text-amber-700',
  appealing: 'bg-purple-100 text-purple-700',
  correcting: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  'written-off': 'bg-slate-100 text-slate-600',
};

const CATEGORY_BADGE: Record<string, string> = {
  auth: 'bg-orange-100 text-orange-700',
  'medical-necessity': 'bg-red-100 text-red-700',
  coding: 'bg-blue-100 text-blue-700',
  'timely-filing': 'bg-purple-100 text-purple-700',
  duplicate: 'bg-amber-100 text-amber-700',
  documentation: 'bg-cyan-100 text-cyan-700',
  'patient-responsibility': 'bg-pink-100 text-pink-700',
  other: 'bg-slate-100 text-slate-600',
};

function daysOld(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

function contextActionLabel(status: string) {
  if (status === 'new') return 'Appeal';
  if (status === 'in-review') return 'Submit Appeal';
  if (status === 'appealing') return 'Escalate';
  if (status === 'correcting') return 'Resolve';
  return null;
}

const PAGE_SIZE = 50;

export function DenialsList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DenialItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDenials({
      status: activeStatus ?? undefined,
      category: activeCategory ?? undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data ?? []);
        setTotal(res.pagination?.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load denials');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeStatus, activeCategory, page]);

  function setStatus(next: string | null) {
    setPage(1);
    setActiveStatus(next);
  }

  function setCategory(next: string | null) {
    setPage(1);
    setActiveCategory(next);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/billing" className="text-sm text-teal-600 hover:text-teal-700">
            &larr; Back to Billing
          </Link>
          <h1 className="text-2xl font-serif text-navy-900 mt-2">Denial Management</h1>
          <p className="text-navy-600 mt-1">Track, appeal, and resolve denied claims by status.</p>
          <DocsLink
            path="user-guide/billing-denials-era/"
            className="inline-block text-sm font-medium text-teal-700 hover:underline mt-1"
          >
            Denials &amp; appeals guide ↗
          </DocsLink>
        </div>
        <Link
          to="/billing/denials/queue"
          className="px-3 py-2 text-sm rounded-md border border-navy-300 text-navy-700 hover:bg-navy-50 whitespace-nowrap"
        >
          View aging queue
        </Link>
      </header>

      <div className="flex flex-wrap gap-1 mb-4" role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={activeStatus === tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeStatus === tab.value
                ? 'bg-navy-900 text-white'
                : 'bg-white text-navy-600 hover:bg-navy-100 border border-navy-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={`px-3 py-1 rounded-md text-xs font-medium ${
            activeCategory === null
              ? 'bg-navy-700 text-white'
              : 'bg-white text-navy-600 hover:bg-navy-100 border border-navy-200'
          }`}
        >
          All categories
        </button>
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1 rounded-md text-xs font-medium ${
              activeCategory === cat
                ? CATEGORY_BADGE[cat] ?? 'bg-navy-700 text-white'
                : 'bg-white text-navy-600 hover:bg-navy-100 border border-navy-200'
            }`}
          >
            {cat.replace(/-/g, ' ')}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-navy-400">Loading denials...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-navy-400">No denials match the current filters.</div>
        ) : (
          <>
            <ul className="md:hidden divide-y divide-navy-100">
              {items.map((d) => {
                const days = daysOld(d.createdAt);
                const actionLabel = contextActionLabel(d.status);
                return (
                  <li
                    key={d.id}
                    className="p-4 hover:bg-navy-50 cursor-pointer"
                    onClick={() => navigate(`/billing/denials/${d.id}`)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm text-navy-900">{d.denialCode}</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                          STATUS_BADGE[d.status] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {d.status.replace(/-/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-navy-700 mt-1 line-clamp-2">{d.denialReason}</p>
                    <div className="flex items-center justify-between text-xs text-navy-500 mt-2">
                      <span>Claim #{d.claimId}</span>
                      <span className={days > 30 ? 'text-red-600 font-semibold' : ''}>{days}d old</span>
                    </div>
                    {actionLabel && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/billing/denials/${d.id}`);
                        }}
                        className="mt-2 px-2 py-1 text-xs rounded bg-purple-100 text-purple-700"
                      >
                        {actionLabel}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <table className="hidden md:table w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-navy-500 uppercase tracking-wider border-b border-navy-100">
                  <th className="px-5 py-3">Claim</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-right">Days</th>
                  <th className="px-5 py-3">Deadline</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {items.map((d) => {
                  const days = daysOld(d.createdAt);
                  const actionLabel = contextActionLabel(d.status);
                  return (
                    <tr key={d.id} className="hover:bg-navy-50">
                      <td className="px-5 py-3 text-sm font-medium text-navy-900">#{d.claimId}</td>
                      <td className="px-5 py-3 text-sm font-mono">{d.denialCode}</td>
                      <td className="px-5 py-3 text-sm text-navy-700 max-w-xs truncate">{d.denialReason}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                            CATEGORY_BADGE[d.category] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {d.category.replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-right">
                        <span className={days > 30 ? 'text-red-600 font-semibold' : 'text-navy-600'}>
                          {days}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-navy-600">
                        {d.appealDeadline ? new Date(d.appealDeadline).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                            STATUS_BADGE[d.status] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {d.status.replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/billing/denials/${d.id}`)}
                            className="text-xs px-2 py-1 bg-navy-50 text-navy-700 rounded hover:bg-navy-100"
                          >
                            View
                          </button>
                          {actionLabel && (
                            <button
                              type="button"
                              onClick={() => navigate(`/billing/denials/${d.id}`)}
                              className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                            >
                              {actionLabel}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      <nav className="flex items-center justify-between mt-4 text-sm text-navy-600">
        <span>
          Page {page} of {totalPages} ({total} total)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 rounded-md border border-navy-300 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded-md border border-navy-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </nav>
    </section>
  );
}
