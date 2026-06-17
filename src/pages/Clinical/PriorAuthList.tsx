import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPriorAuths, type PriorAuth, type PaginationMeta } from '@/api/clinical';

const PAGE_SIZE = 25;

export function PriorAuthList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PriorAuth[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getPriorAuths({ page, pageSize: PAGE_SIZE, status: status || undefined })
      .then((r) => {
        if (!cancelled) {
          setItems(r.data);
          setPagination(r.pagination);
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load prior authorizations.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page, status]);

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <button
          onClick={() => navigate('/clinical')}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ← Clinical Overview
        </button>
        <h2 className="text-2xl">Prior Authorizations</h2>
        <div className="section-line" />
      </header>

      <div className="flex items-center gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Status</span>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="form-input w-48"
          >
            <option value="">All</option>
            <option value="Requested">Requested</option>
            <option value="Approved">Approved</option>
            <option value="Denied">Denied</option>
            <option value="Expired">Expired</option>
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {isLoading ? (
        <div role="status" className="text-slate-500">Loading prior authorizations…</div>
      ) : items.length === 0 ? (
        <p className="text-slate-500">No prior authorizations.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Service Type</th>
                <th className="px-4 py-3">Payer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Reference</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pa) => (
                <tr
                  key={pa.id}
                  onClick={() => navigate(`/patients/${pa.patientId}`)}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-700">{pa.serviceType}</td>
                  <td className="px-4 py-3 text-slate-500">{pa.payerName}</td>
                  <td className="px-4 py-3 text-slate-500">{pa.status}</td>
                  <td className="px-4 py-3 text-slate-500">{pa.requestedDate}</td>
                  <td className="px-4 py-3 text-slate-500">{pa.referenceNumber ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
