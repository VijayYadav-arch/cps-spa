import '@/styles/clients.css';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orgsApi } from './orgsApi';
import type { OrganizationDetail as Org } from './orgsTypes';
import type { EncounterListItem } from '@/pages/Admin/Encounters/encountersTypes';

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

/**
 * Org-scoped encounters tab — read-only listing of every encounter belonging
 * to an organization, surfaced to admins holding `admin:manage_orgs` via the
 * cross-org-admin query-override on /api/v2/encounters (admin-list branch).
 *
 *  - Debounced 300ms `q` search (provider + patient name ILIKE on the server,
 *    same vocabulary as the EncountersList admin page).
 *  - Include-deleted toggle.
 *  - Reuses EncounterListItem from the existing Admin/Encounters module so we
 *    don't drift on the enriched join shape (claimsCount, patientFirstName,
 *    organizationName, etc.).
 */
export function OrganizationEncountersTab() {
  const { id } = useParams<{ id: string }>();
  const orgId = id ? parseInt(id, 10) : 0;

  const [org, setOrg] = useState<Org | null>(null);
  const [items, setItems] = useState<EncounterListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
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

  // Debounced load on page / q / includeDeleted
  useEffect(() => {
    if (!orgId) return;
    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      orgsApi
        .getEncounters(orgId, {
          page,
          pageSize: PAGE_SIZE,
          q: q || undefined,
          includeDeleted,
        })
        .then((r) => {
          setItems(r.data);
          setTotal(r.pagination.total);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [orgId, page, q, includeDeleted]);

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
          {org.name} — Encounters
        </h1>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center mb-4">
        <input
          type="search"
          aria-label="Search encounters"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search provider or patient name…"
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
        {items.map((e) => (
          <li
            key={e.id}
            className="bg-white rounded-md border border-navy-100 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-navy-600">{e.serviceDate}</span>
              {e.isDeleted ? (
                <span className="text-xs text-red-600">deleted</span>
              ) : (
                <span className="text-xs text-green-600">active</span>
              )}
            </div>
            <h2 className="font-medium text-navy-900">
              {e.patientFirstName} {e.patientLastName}
            </h2>
            <p className="text-sm text-navy-700 mt-1">
              {e.provider} · {e.claimsCount} claims
            </p>
          </li>
        ))}
      </ul>

      {/* Tablet/Desktop: table */}
      <table className="hidden md:table w-full">
        <thead>
          <tr className="text-left text-sm text-navy-700 border-b border-navy-200">
            <th className="py-2 px-3">Service date</th>
            <th className="py-2 px-3">Patient</th>
            <th className="py-2 px-3">Provider</th>
            <th className="py-2 px-3 text-right">Claims</th>
            <th className="py-2 px-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr
              key={e.id}
              className="border-b border-navy-100 hover:bg-navy-50"
            >
              <td className="py-2 px-3 text-navy-700">{e.serviceDate}</td>
              <td className="py-2 px-3 text-navy-900">
                {e.patientFirstName} {e.patientLastName}
              </td>
              <td className="py-2 px-3 text-navy-700">{e.provider}</td>
              <td className="py-2 px-3 text-right text-navy-700">
                {e.claimsCount}
              </td>
              <td className="py-2 px-3">
                {e.isDeleted ? (
                  <span className="text-xs text-red-600">deleted</span>
                ) : (
                  <span className="text-xs text-green-600">active</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty state */}
      {!loading && items.length === 0 && !error && (
        <p className="text-navy-500 text-sm mt-6 text-center">
          No encounters found.
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
            disabled={items.length < PAGE_SIZE}
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
