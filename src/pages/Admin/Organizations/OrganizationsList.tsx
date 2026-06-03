import '@/styles/clients.css';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orgsApi } from './orgsApi';
import type { OrganizationListItem } from './orgsTypes';

/**
 * Admin organizations list — mobile-first responsive.
 *  - Cards on mobile (<md).
 *  - Compact table at md (+slug, +counts, status).
 *  - Full table at lg (+email column).
 * Debounced 300ms search on `q` (name + slug ILIKE). Include-deleted toggle.
 * Pagination via Prev/Next at fixed pageSize=50.
 */
export function OrganizationsList() {
  const [items, setItems] = useState<OrganizationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      orgsApi
        .list({ q: q || undefined, includeDeleted, page, pageSize: 50 })
        .then((r) => {
          setItems(r.data);
          setTotal(r.pagination.total);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q, includeDeleted, page]);

  return (
    <section className="max-w-7xl mx-auto p-4 lg:p-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-serif text-navy-900">Organizations</h1>
        <Link
          to="/admin/organizations/new"
          className="px-4 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md bg-teal-600 text-white text-center hover:bg-teal-700"
        >
          New organization
        </Link>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center mb-4">
        <input
          type="search"
          aria-label="Search organizations"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search name or slug…"
          className="flex-1 px-3 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 focus:border-teal-500"
        />
        <label className="flex items-center gap-2 text-sm text-navy-700 min-h-12 md:min-h-11 lg:min-h-10">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => {
              setIncludeDeleted(e.target.checked);
              setPage(1);
            }}
          />
          Include deleted
        </label>
      </div>

      {/* Mobile: card list */}
      <ul className="md:hidden flex flex-col gap-3">
        {items.map((o) => (
          <li key={o.id} className="bg-white rounded-md border border-navy-100 p-4">
            <Link to={`/admin/organizations/${o.id}`} className="block min-h-12">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-medium text-navy-900">{o.name}</h2>
                {o.isDeleted ? (
                  <span className="text-xs text-red-600">deleted</span>
                ) : !o.active ? (
                  <span className="text-xs text-amber-600">inactive</span>
                ) : (
                  <span className="text-xs text-green-600">active</span>
                )}
              </div>
              <p className="text-sm text-navy-500">{o.slug}</p>
              <p className="text-sm text-navy-700 mt-2">
                {o.claimsCount} claims · {o.patientsCount} patients
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Tablet/Desktop: table */}
      <table className="hidden md:table w-full">
        <thead>
          <tr className="text-left text-sm text-navy-700 border-b border-navy-200">
            <th className="py-2 px-3">Name</th>
            <th className="py-2 px-3">Slug</th>
            <th className="py-2 px-3 hidden lg:table-cell">Email</th>
            <th className="py-2 px-3 text-right">Claims</th>
            <th className="py-2 px-3 text-right">Patients</th>
            <th className="py-2 px-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr key={o.id} className="border-b border-navy-100 hover:bg-navy-50">
              <td className="py-2 px-3">
                <Link to={`/admin/organizations/${o.id}`} className="text-teal-600 hover:underline">
                  {o.name}
                </Link>
              </td>
              <td className="py-2 px-3 text-navy-600">{o.slug}</td>
              <td className="py-2 px-3 text-navy-600 hidden lg:table-cell">{o.email ?? '—'}</td>
              <td className="py-2 px-3 text-right">{o.claimsCount}</td>
              <td className="py-2 px-3 text-right">{o.patientsCount}</td>
              <td className="py-2 px-3">
                {o.isDeleted ? (
                  <span className="text-xs text-red-600">deleted</span>
                ) : o.active ? (
                  <span className="text-xs text-green-600">active</span>
                ) : (
                  <span className="text-xs text-amber-600">inactive</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty state */}
      {!loading && items.length === 0 && !error && (
        <p className="text-navy-500 text-sm mt-6 text-center">No organizations found.</p>
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
            disabled={items.length < 50}
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
      {error && (
        <p role="alert" className="text-red-600 text-sm mt-4">
          {error}
        </p>
      )}
    </section>
  );
}
