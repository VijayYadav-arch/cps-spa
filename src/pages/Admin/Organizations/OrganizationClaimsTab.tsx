import '@/styles/clients.css';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orgsApi } from './orgsApi';
import type { ClaimSummary, OrganizationDetail as Org } from './orgsTypes';

const PAGE_SIZE = 50;

/**
 * Org-scoped claims tab — read-only listing of every claim belonging to an
 * organization, surfaced to admins holding `admin:manage_orgs`.
 *
 *  - On mount: parallel fetch of `orgsApi.getById(orgId)` + the first claims
 *    page so the header can render with the org name while data loads.
 *  - Status filter dropdown reuses the same vocabulary as ClaimsList
 *    (draft / pending / submitted / paid / denied).
 *  - Mobile cards (<md) / desktop table (md+) mirror the OrganizationsList
 *    layout for visual consistency.
 *  - Pagination via Prev/Next at fixed pageSize=50.
 */
export function OrganizationClaimsTab() {
  const { id } = useParams<{ id: string }>();
  const orgId = id ? parseInt(id, 10) : 0;

  const [org, setOrg] = useState<Org | null>(null);
  const [claims, setClaims] = useState<ClaimSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load org header once per orgId
  useEffect(() => {
    if (!orgId) return;
    setError(null);
    orgsApi
      .getById(orgId)
      .then(setOrg)
      .catch((e: Error) => setError(e.message));
  }, [orgId]);

  // Load claims on page/status changes
  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    orgsApi
      .getClaims(orgId, {
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
      })
      .then((r) => {
        setClaims(r.data);
        setTotal(r.pagination.total);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orgId, page, status]);

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
          {org.name} — Claims
        </h1>
      </header>

      <div className="mb-4">
        <label className="flex flex-col gap-1 max-w-xs">
          <span className="text-sm text-navy-700">Status</span>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 focus:border-teal-500"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="paid">Paid</option>
            <option value="denied">Denied</option>
          </select>
        </label>
      </div>

      {/* Mobile: card list */}
      <ul className="md:hidden flex flex-col gap-3">
        {claims.map((c) => (
          <li
            key={c.id}
            className="bg-white rounded-md border border-navy-100 p-4"
          >
            <Link to={`/claims/${c.id}`} className="block min-h-12">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-medium text-navy-900">
                  Claim #{c.id}
                </h2>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-sm text-navy-700">{c.patientName}</p>
              <p className="text-sm text-navy-700 mt-2">
                ${c.amount.toFixed(2)} ·{' '}
                {new Date(c.createdAt).toLocaleDateString()}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Tablet/Desktop: table */}
      <table className="hidden md:table w-full">
        <thead>
          <tr className="text-left text-sm text-navy-700 border-b border-navy-200">
            <th className="py-2 px-3">ID</th>
            <th className="py-2 px-3">Patient</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3 text-right">Amount</th>
            <th className="py-2 px-3">Created</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <tr
              key={c.id}
              className="border-b border-navy-100 hover:bg-navy-50"
            >
              <td className="py-2 px-3">
                <Link
                  to={`/claims/${c.id}`}
                  className="text-teal-600 hover:underline"
                >
                  #{c.id}
                </Link>
              </td>
              <td className="py-2 px-3 text-navy-700">{c.patientName}</td>
              <td className="py-2 px-3">
                <StatusBadge status={c.status} />
              </td>
              <td className="py-2 px-3 text-right text-navy-700">
                ${c.amount.toFixed(2)}
              </td>
              <td className="py-2 px-3 text-navy-600">
                {new Date(c.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty state */}
      {!loading && claims.length === 0 && !error && (
        <p className="text-navy-500 text-sm mt-6 text-center">
          No claims found.
        </p>
      )}

      {/* Pagination */}
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
            disabled={claims.length < PAGE_SIZE}
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

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'paid'
      ? 'bg-green-50 text-green-700'
      : status === 'denied'
        ? 'bg-red-50 text-red-700'
        : status === 'submitted'
          ? 'bg-teal-50 text-teal-700'
          : 'bg-navy-50 text-navy-700';
  return (
    <span className={`px-2 py-1 rounded-md text-xs ${tone}`}>{status}</span>
  );
}
