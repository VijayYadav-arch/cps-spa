import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  batchSubmitClaims,
  batchVoidClaims,
  getClaims,
  type ClaimSummary,
} from '@/api/claims';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const BATCH_LIMIT = 50;

const NO_PERMISSION = 'You do not have permission to perform this action';

type BatchAction = 'submit' | 'void';

export function ClaimsList() {
  const [claims, setClaims] = useState<ClaimSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pendingAction, setPendingAction] = useState<BatchAction | null>(null);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Batch submit/void both hit POST /billing/batch/* — gated by billing:batch.
  const canBatch = usePermission(PERMISSIONS.BILLING_BATCH);

  const loadClaims = () => {
    setIsLoading(true);
    setError(null);
    setSelected(new Set());
    return getClaims({ page, pageSize: 20, status: statusFilter || undefined })
      .then((res) => {
        setClaims(res.data);
        setTotalPages(res.pagination.totalPages);
      })
      .catch(() => setError('Failed to load claims. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    loadClaims().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const toggleRow = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === claims.length) setSelected(new Set());
    else setSelected(new Set(claims.map((c) => c.id)));
  };

  const runBatch = async () => {
    if (!pendingAction) return;
    setSubmittingBatch(true);
    setBatchSummary(null);
    setError(null);
    try {
      const ids = [...selected];
      if (pendingAction === 'submit') {
        const res = await batchSubmitClaims(ids);
        setBatchSummary(
          `Batch submit · ${res.succeeded.length}/${ids.length} succeeded` +
          (res.failed.length > 0 ? ` (${res.failed.length} failed)` : ''),
        );
      } else {
        const res = await batchVoidClaims(ids);
        setBatchSummary(
          `Batch void · ${res.voided.length}/${ids.length} voided` +
          (res.notFound.length > 0 ? ` (${res.notFound.length} not found)` : ''),
        );
      }
      setPendingAction(null);
      await loadClaims();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Batch action failed';
      setError(message);
    } finally {
      setSubmittingBatch(false);
    }
  };

  if (isLoading) return <div role="status" className="p-6 text-slate-500">Loading claims…</div>;
  if (error && claims.length === 0) return <div role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;

  const tooMany = selected.size > BATCH_LIMIT;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Claims</h2>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Filter by status"
          className="form-input w-auto"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="paid">Paid</option>
          <option value="denied">Denied</option>
        </select>
      </div>

      {/* Batch toolbar — visible only when something is selected */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <span className="font-semibold text-slate-700">{selected.size} selected</span>
          {tooMany && (
            <span className="text-sm text-accent-600">
              Max {BATCH_LIMIT} per batch
            </span>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setPendingAction('submit')}
            disabled={tooMany}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Submit {selected.size}
          </button>
          <button
            type="button"
            onClick={() => setPendingAction('void')}
            disabled={tooMany}
            className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Void {selected.size}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      )}

      {batchSummary && (
        <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">{batchSummary}</div>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}

      {claims.length === 0 ? (
        <p className="text-slate-500">No claims found.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="w-9 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={selected.size > 0 && selected.size === claims.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select claim ${c.id}`}
                      checked={selected.has(c.id)}
                      onChange={() => toggleRow(c.id)}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.id}</td>
                  <td className="px-4 py-3 text-slate-700">{c.patientName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : c.status === 'denied'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">${c.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/claims/${c.id}`} className="font-medium text-teal-700 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      {pendingAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Confirm batch ${pendingAction}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/50"
        >
          <div className="min-w-[400px] rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">
              Confirm {pendingAction === 'submit' ? 'batch submit' : 'batch void'}
            </h3>
            <p className="mt-2 text-slate-700">
              {pendingAction === 'submit'
                ? `Submit ${selected.size} claim${selected.size === 1 ? '' : 's'} to the clearinghouse?`
                : `Void ${selected.size} claim${selected.size === 1 ? '' : 's'}? This is a soft-delete and can be reversed by an admin, but they will disappear from active queues immediately.`}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={submittingBatch}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void runBatch(); }}
                disabled={submittingBatch || !canBatch}
                aria-busy={submittingBatch}
                title={!canBatch ? NO_PERMISSION : undefined}
                className={
                  pendingAction === 'void'
                    ? 'rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed'
                    : 'rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed'
                }
              >
                {submittingBatch ? 'Working…' : pendingAction === 'submit' ? 'Submit' : 'Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
