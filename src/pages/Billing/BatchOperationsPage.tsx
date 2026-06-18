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

const NO_PERMISSION = 'You do not have permission to perform this action';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Paid', value: 'paid' },
  { label: 'Denied', value: 'denied' },
  { label: 'Voided', value: 'voided' },
] as const;

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
  voided: 'bg-slate-100 text-slate-500',
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface BatchResult {
  action: 'submit' | 'void';
  succeeded: number[];
  failed: number[];
  skipped: number;
}

export function BatchOperationsPage() {
  const [claims, setClaims] = useState<ClaimSummary[]>([]);
  const [activeStatus, setActiveStatus] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);

  // Both batch actions POST to BatchController (policy billing:batch).
  const canBatch = usePermission(PERMISSIONS.BILLING_BATCH);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    setBatchResult(null);
    getClaims({ status: activeStatus || undefined, page: 1, pageSize: 50 })
      .then((res) => {
        if (!cancelled) setClaims(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load claims');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeStatus]);

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === claims.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(claims.map((c) => c.id)));
  }

  async function runBatch(action: 'submit' | 'void') {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    setError(null);
    const ids = Array.from(selectedIds);
    try {
      if (action === 'submit') {
        const r = await batchSubmitClaims(ids);
        setBatchResult({ action, succeeded: r.succeeded, failed: r.failed, skipped: r.skipped?.length ?? 0 });
      } else {
        const r = await batchVoidClaims(ids);
        setBatchResult({ action, succeeded: r.voided, failed: r.notFound, skipped: r.skipped?.length ?? 0 });
      }
      setSelectedIds(new Set());
      const refreshed = await getClaims({
        status: activeStatus || undefined,
        page: 1,
        pageSize: 50,
      });
      setClaims(refreshed.data ?? []);
    } catch (e) {
      setError((e as Error).message || `${action} failed`);
    } finally {
      setSubmitting(false);
      setShowVoidConfirm(false);
    }
  }

  const allSelected = claims.length > 0 && selectedIds.size === claims.length;

  return (
    <section className="p-4 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <Link to="/billing" className="text-sm text-teal-600 hover:text-teal-700">
          &larr; Back to Billing
        </Link>
        <h1 className="text-2xl font-serif text-slate-900 mt-2">Batch Operations</h1>
        <p className="text-slate-500 text-sm mt-1">
          Submit or void multiple claims at once. Select claims below + pick an action.
        </p>
      </header>

      <div className="flex flex-wrap gap-1 mb-4" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={activeStatus === tab.value}
            onClick={() => setActiveStatus(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeStatus === tab.value
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {batchResult && (
        <div className="mb-4 p-4 rounded-md bg-green-50 border border-green-200 text-sm text-green-800">
          <strong>{batchResult.action === 'submit' ? 'Submit' : 'Void'} result:</strong>{' '}
          {batchResult.succeeded.length} succeeded
          {batchResult.failed.length > 0 && (
            <>, <span className="text-red-700">{batchResult.failed.length} failed</span></>
          )}
          {batchResult.skipped > 0 && (
            <>, <span className="text-amber-700">{batchResult.skipped} skipped (ineligible status)</span></>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-sm text-slate-600">{selectedIds.size} selected</span>
        <button
          type="button"
          disabled={selectedIds.size === 0 || submitting || !canBatch}
          title={!canBatch ? NO_PERMISSION : undefined}
          onClick={() => runBatch('submit')}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:opacity-50"
        >
          Submit selected
        </button>
        <button
          type="button"
          disabled={selectedIds.size === 0 || submitting || !canBatch}
          title={!canBatch ? NO_PERMISSION : undefined}
          onClick={() => setShowVoidConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          Void selected
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading claims...</div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No claims in this view.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-5 py-3">Claim #</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {claims.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select claim ${c.id}`}
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                    />
                  </td>
                  <td className="px-5 py-3 text-sm font-mono">#{c.id}</td>
                  <td className="px-5 py-3 text-sm">{c.patientName}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        STATUS_BADGE[c.status] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-right">{currency.format(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showVoidConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm void"
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Void {selectedIds.size} claim{selectedIds.size === 1 ? '' : 's'}?</h2>
            <p className="text-sm text-slate-600 mb-6">
              Voided claims cannot be resubmitted under the same claim number. This action is logged
              in the audit trail.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowVoidConfirm(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => runBatch('void')}
                disabled={submitting || !canBatch}
                title={!canBatch ? NO_PERMISSION : undefined}
                className="px-5 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Voiding...' : 'Confirm void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
