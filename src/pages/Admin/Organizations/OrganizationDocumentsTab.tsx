import '@/styles/clients.css';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orgsApi } from './orgsApi';
import type { DocumentSummary, OrganizationDetail as Org } from './orgsTypes';

const PAGE_SIZE = 50;

/**
 * Org-scoped documents tab — read-only listing of every document belonging to
 * an organization, surfaced via the cross-org-admin query-override on
 * /api/v2/documents shipped in cps-dotnet PR #195.
 *
 *  - No filter UI: the DocumentsController.GetAll endpoint only accepts
 *    (organizationId, page, pageSize) today. Category lives on the row but is
 *    not server-side filterable.
 *  - Response shape is the Document entity passthrough — see DocumentSummary
 *    in orgsTypes.ts.
 */
export function OrganizationDocumentsTab() {
  const { id } = useParams<{ id: string }>();
  const orgId = id ? parseInt(id, 10) : 0;

  const [org, setOrg] = useState<Org | null>(null);
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
      .getDocuments(orgId, { page, pageSize: PAGE_SIZE })
      .then((r) => {
        setDocs(r.data);
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
          {org.name} — Documents
        </h1>
      </header>

      {/* Mobile: card list */}
      <ul className="md:hidden flex flex-col gap-3">
        {docs.map((d) => (
          <li
            key={d.id}
            className="bg-white rounded-md border border-navy-100 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium text-navy-900 truncate">{d.fileName}</h2>
              <CategoryBadge category={d.category} />
            </div>
            <p className="text-sm text-navy-700">{formatBytes(d.fileSize)}</p>
            <p className="text-sm text-navy-500 mt-1">
              Uploaded {new Date(d.createdAt).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>

      {/* Tablet/Desktop: table */}
      <table className="hidden md:table w-full">
        <thead>
          <tr className="text-left text-sm text-navy-700 border-b border-navy-200">
            <th className="py-2 px-3">File name</th>
            <th className="py-2 px-3">Category</th>
            <th className="py-2 px-3 text-right">Size</th>
            <th className="py-2 px-3">Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr
              key={d.id}
              className="border-b border-navy-100 hover:bg-navy-50"
            >
              <td className="py-2 px-3 text-navy-900">{d.fileName}</td>
              <td className="py-2 px-3">
                <CategoryBadge category={d.category} />
              </td>
              <td className="py-2 px-3 text-right text-navy-700">
                {formatBytes(d.fileSize)}
              </td>
              <td className="py-2 px-3 text-navy-600">
                {new Date(d.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty state */}
      {!loading && docs.length === 0 && !error && (
        <p className="text-navy-500 text-sm mt-6 text-center">
          No documents found.
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
            disabled={docs.length < PAGE_SIZE}
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

function CategoryBadge({ category }: { category: string }) {
  const tone =
    category === 'contract'
      ? 'bg-teal-50 text-teal-700'
      : category === 'eob'
        ? 'bg-amber-50 text-amber-700'
        : category === 'supporting'
          ? 'bg-navy-50 text-navy-700'
          : 'bg-navy-50 text-navy-600';
  return (
    <span className={`px-2 py-1 rounded-md text-xs ${tone}`}>{category}</span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
