import '@/styles/clients.css';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orgsApi } from './orgsApi';
import type { OrganizationDetail as Org, ReportSummary } from './orgsTypes';

const PAGE_SIZE = 50;

/**
 * Org-scoped reports tab — read-only listing of every report belonging to an
 * organization, surfaced via the cross-org-admin query-override on
 * /api/v2/reports shipped in cps-dotnet PR #195. The aggregate-summary
 * endpoints (claims-summary / aging / denials) stay tenant-scoped and are NOT
 * consumed here.
 *
 *  - cps-dotnet ReportsController.GetAll only accepts (organizationId, page,
 *    pageSize) — no `type` filter server-side. We surface a type select that
 *    filters the current page window client-side. When backend type filtering
 *    lands the wrapper signature can be widened without a UI change.
 */
export function OrganizationReportsTab() {
  const { id } = useParams<{ id: string }>();
  const orgId = id ? parseInt(id, 10) : 0;

  const [org, setOrg] = useState<Org | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    setError(null);
    orgsApi
      .getById(orgId)
      .then(setOrg)
      .catch((e: Error) => setError(e.message));
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    orgsApi
      .getReports(orgId, { page, pageSize: PAGE_SIZE })
      .then((r) => {
        setReports(r.data);
        setTotal(r.pagination.total);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orgId, page]);

  // Client-side filter over the current page window — see comment on the tab
  // header about the missing server-side filter.
  const visible = useMemo(
    () => (type ? reports.filter((r) => r.type === type) : reports),
    [reports, type],
  );

  if (error && !org) {
    return (
      <p role="alert" className="text-red-600 p-6">
        {error}
      </p>
    );
  }
  if (!org) {
    return (
      <p role="status" className="text-navy-500 p-6">
        Loading…
      </p>
    );
  }

  return (
    <section className="max-w-7xl mx-auto p-4 lg:p-8">
      <header className="mb-6">
        <Link
          to={`/admin/organizations/${orgId}`}
          className="text-sm text-teal-600 hover:underline min-h-12 md:min-h-11 lg:min-h-10 inline-block"
        >
          ← Back to {org.name}
        </Link>
        <h1 className="text-2xl font-serif text-navy-900 mt-2">
          {org.name} — Reports
        </h1>
      </header>

      <div className="mb-4">
        <label className="flex flex-col gap-1 max-w-xs">
          <span className="text-sm text-navy-700">Type</span>
          <select
            aria-label="Filter by type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 focus:border-teal-500"
          >
            <option value="">All types</option>
            <option value="monthly">Monthly</option>
            <option value="ar-aging">AR aging</option>
            <option value="denials">Denials</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>

      {/* Mobile: card list */}
      <ul className="md:hidden flex flex-col gap-3">
        {visible.map((r) => (
          <li
            key={r.id}
            className="bg-white rounded-md border border-navy-100 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium text-navy-900 truncate">{r.title}</h2>
              <TypeBadge type={r.type} />
            </div>
            <p className="text-sm text-navy-700">Period: {r.period}</p>
            <p className="text-sm text-navy-500 mt-1">
              Created {new Date(r.createdAt).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>

      {/* Tablet/Desktop: table */}
      <table className="hidden md:table w-full">
        <thead>
          <tr className="text-left text-sm text-navy-700 border-b border-navy-200">
            <th className="py-2 px-3">Title</th>
            <th className="py-2 px-3">Type</th>
            <th className="py-2 px-3">Period</th>
            <th className="py-2 px-3">Created</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr
              key={r.id}
              className="border-b border-navy-100 hover:bg-navy-50"
            >
              <td className="py-2 px-3 text-navy-900">{r.title}</td>
              <td className="py-2 px-3">
                <TypeBadge type={r.type} />
              </td>
              <td className="py-2 px-3 text-navy-700">{r.period}</td>
              <td className="py-2 px-3 text-navy-600">
                {new Date(r.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty state */}
      {!loading && visible.length === 0 && !error && (
        <p className="text-navy-500 text-sm mt-6 text-center">
          No reports found.
        </p>
      )}

      {/* Pagination — `total` is the unfiltered backend total; the visible
          window may be smaller when the client-side type filter is active. */}
      <div className="mt-4 flex items-center justify-between text-sm text-navy-700">
        <span>{total} total</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={reports.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-navy-500 text-sm mt-4" role="status">
          Loading…
        </p>
      )}
      {error && org && (
        <p role="alert" className="text-red-600 text-sm mt-4">
          {error}
        </p>
      )}
    </section>
  );
}

function TypeBadge({ type }: { type: string }) {
  const tone =
    type === 'monthly'
      ? 'bg-teal-50 text-teal-700'
      : type === 'ar-aging'
        ? 'bg-amber-50 text-amber-700'
        : type === 'denials'
          ? 'bg-red-50 text-red-700'
          : 'bg-navy-50 text-navy-700';
  return <span className={`px-2 py-1 rounded-md text-xs ${tone}`}>{type}</span>;
}
