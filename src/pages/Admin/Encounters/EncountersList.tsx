import '@/styles/encounters.css';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { encountersApi } from './encountersApi';
import { CodingSuggestionsModal } from './CodingSuggestionsModal';
import type { EncounterListItem } from './encountersTypes';

/**
 * Admin encounters list — mobile-first responsive.
 *  - Cards on mobile (<md): serviceDate + status / patient name / provider · claims / org.
 *  - Compact table at md (+provider, +claims, +status).
 *  - Full table at lg (+organization column).
 *
 * Debounced 300ms search on `q` (provider + patient name ILIKE on the server).
 * Include-deleted toggle. Pagination via Prev/Next at fixed pageSize=50.
 *
 * Rows are non-interactive read displays — there is no per-encounter detail
 * page in scope for this restoration PR.
 */
export function EncountersList() {
  const [items, setItems] = useState<EncounterListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestFor, setSuggestFor] = useState<EncounterListItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      encountersApi
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
        <h1 className="text-2xl font-serif text-navy-900">Encounters</h1>
        <Link
          to="/admin/encounters/new"
          className="px-4 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md bg-teal-600 text-white text-center hover:bg-teal-700"
        >
          New encounter
        </Link>
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
          <li key={e.id} className="bg-white rounded-md border border-navy-100 p-4">
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
            <p className="text-sm text-navy-500 mt-1">{e.organizationName}</p>
            {!e.isDeleted && (
              <button
                type="button"
                onClick={() => setSuggestFor(e)}
                className="mt-2 text-xs text-teal-700 hover:text-teal-900 underline"
              >
                Suggest codes (AI)
              </button>
            )}
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
            <th className="py-2 px-3 hidden lg:table-cell">Organization</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id} className="border-b border-navy-100 hover:bg-navy-50">
              <td className="py-2 px-3 text-navy-700">{e.serviceDate}</td>
              <td className="py-2 px-3 text-navy-900">
                {e.patientFirstName} {e.patientLastName}
              </td>
              <td className="py-2 px-3 text-navy-700">{e.provider}</td>
              <td className="py-2 px-3 text-right text-navy-700">{e.claimsCount}</td>
              <td className="py-2 px-3 text-navy-600 hidden lg:table-cell">{e.organizationName}</td>
              <td className="py-2 px-3">
                {e.isDeleted ? (
                  <span className="text-xs text-red-600">deleted</span>
                ) : (
                  <span className="text-xs text-green-600">active</span>
                )}
              </td>
              <td className="py-2 px-3">
                {!e.isDeleted && (
                  <button
                    type="button"
                    onClick={() => setSuggestFor(e)}
                    className="text-xs text-teal-700 hover:text-teal-900 underline"
                  >
                    Suggest codes (AI)
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty state */}
      {!loading && items.length === 0 && !error && (
        <p className="text-navy-500 text-sm mt-6 text-center">No encounters found.</p>
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

      {suggestFor && (
        <CodingSuggestionsModal
          encounterId={suggestFor.id}
          patientLabel={`${suggestFor.patientFirstName} ${suggestFor.patientLastName} · ${suggestFor.serviceDate}`}
          onClose={() => setSuggestFor(null)}
        />
      )}
    </section>
  );
}
