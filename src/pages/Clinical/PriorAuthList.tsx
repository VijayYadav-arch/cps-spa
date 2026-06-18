import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createPriorAuth,
  getPriorAuths,
  updatePriorAuthStatus,
  type PriorAuth,
  type PaginationMeta,
} from '@/api/clinical';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const PAGE_SIZE = 25;
const NO_PERMISSION = 'You do not have permission to perform this action';

const SERVICE_TYPES = ['hospice', 'home-health', 'skilled-nursing', 'therapy'];

export function PriorAuthList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PriorAuth[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patientId: '', payer: '', serviceType: 'hospice' });

  const canManage = usePermission(PERMISSIONS.CLINICAL_PRIOR_AUTH);

  const load = useCallback(() => {
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

  useEffect(() => load(), [load]);

  async function decide(id: number, next: string) {
    setActing(id);
    setError(null);
    try {
      await updatePriorAuthStatus(id, next);
      load();
    } catch {
      setError('Could not update the prior authorization.');
    } finally {
      setActing(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createPriorAuth({
        patientId: Number(form.patientId),
        payer: form.payer,
        serviceType: form.serviceType,
        requestedDate: new Date().toISOString(),
      });
      setShowForm(false);
      setForm({ patientId: '', payer: '', serviceType: 'hospice' });
      load();
    } catch {
      setError('Could not create the prior authorization. Check the patient ID and payer.');
    } finally {
      setSaving(false);
    }
  }

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
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl">Prior Authorizations</h2>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={!canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + New prior auth
          </button>
        </div>
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
            <option value="expired">Expired</option>
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
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pa) => (
                <tr key={pa.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td
                    className="cursor-pointer px-4 py-3 font-medium text-slate-700"
                    onClick={() => navigate(`/patients/${pa.patientId}`)}
                  >
                    {pa.serviceType}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{pa.payer ?? pa.payerName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{pa.status}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {pa.requestedDate ? new Date(pa.requestedDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{pa.referenceId ?? '—'}</td>
                  <td className="px-4 py-3">
                    {pa.status === 'pending' ? (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => decide(pa.id, 'approved')}
                          disabled={!canManage || acting === pa.id}
                          title={!canManage ? NO_PERMISSION : undefined}
                          className="rounded border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(pa.id, 'denied')}
                          disabled={!canManage || acting === pa.id}
                          title={!canManage ? NO_PERMISSION : undefined}
                          className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Deny
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
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

      {showForm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="New prior authorization"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !saving && setShowForm(false)}
        >
          <form
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
            className="grid w-full max-w-md gap-3 rounded-xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-slate-800">New prior authorization</h3>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Patient ID *</span>
              <input
                required
                type="number"
                value={form.patientId}
                onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
                className="form-input"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Payer *</span>
              <input
                required
                value={form.payer}
                onChange={(e) => setForm((f) => ({ ...f, payer: e.target.value }))}
                className="form-input"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Service type</span>
              <select
                value={form.serviceType}
                onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}
                className="form-input"
              >
                {SERVICE_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
