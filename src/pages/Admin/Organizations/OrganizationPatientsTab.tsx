import '@/styles/clients.css';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orgsApi } from './orgsApi';
import type { OrganizationDetail as Org } from './orgsTypes';
import type { PatientSummary } from '@/api/patients';

const PAGE_SIZE = 50;

/**
 * Org-scoped patients tab — read-only listing of every patient belonging to an
 * organization, surfaced to admins holding `admin:manage_orgs` via the
 * cps-dotnet PR #195 cross-org-admin query-override on /api/v2/patients.
 *
 *  - On mount: parallel fetch of `orgsApi.getById(orgId)` + the first patients
 *    page so the header can render with the org name while data loads.
 *  - PatientSummary from `@/api/patients` matches the PatientResponseDto shape
 *    after PHI masking (DateOfBirth truncated to Jan 1 for cross-org admins).
 *  - No server-side filter exists today on /api/v2/patients beyond pagination,
 *    so this tab is a plain paginated list (no search/status select).
 *  - Mobile cards (<md) / desktop table (md+) mirror OrganizationClaimsTab.
 */
export function OrganizationPatientsTab() {
  const { id } = useParams<{ id: string }>();
  const orgId = id ? parseInt(id, 10) : 0;

  const [org, setOrg] = useState<Org | null>(null);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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

  // Load patients on page changes
  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    orgsApi
      .getPatients(orgId, { page, pageSize: PAGE_SIZE })
      .then((r) => {
        setPatients(r.data);
        setTotal(r.pagination.total);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orgId, page]);

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
          {org.name} — Patients
        </h1>
      </header>

      {/* Mobile: card list */}
      <ul className="md:hidden flex flex-col gap-3">
        {patients.map((p) => (
          <li
            key={p.id}
            className="bg-white rounded-md border border-navy-100 p-4"
          >
            <h2 className="font-medium text-navy-900">
              {p.lastName}, {p.firstName}
            </h2>
            <p className="text-sm text-navy-700 mt-1">
              DOB: {new Date(p.dateOfBirth).toLocaleDateString()}
            </p>
            <p className="text-sm text-navy-500 mt-1">
              Created {new Date(p.createdAt).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>

      {/* Tablet/Desktop: table */}
      <table className="hidden md:table w-full">
        <thead>
          <tr className="text-left text-sm text-navy-700 border-b border-navy-200">
            <th className="py-2 px-3">Last name</th>
            <th className="py-2 px-3">First name</th>
            <th className="py-2 px-3">Date of birth</th>
            <th className="py-2 px-3">Created</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr
              key={p.id}
              className="border-b border-navy-100 hover:bg-navy-50"
            >
              <td className="py-2 px-3 text-navy-900">{p.lastName}</td>
              <td className="py-2 px-3 text-navy-700">{p.firstName}</td>
              <td className="py-2 px-3 text-navy-700">
                {new Date(p.dateOfBirth).toLocaleDateString()}
              </td>
              <td className="py-2 px-3 text-navy-600">
                {new Date(p.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty state */}
      {!loading && patients.length === 0 && !error && (
        <p className="text-navy-500 text-sm mt-6 text-center">
          No patients found.
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
            disabled={patients.length < PAGE_SIZE}
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
