import { useEffect, useState } from 'react';
import {
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
  type Branch,
  type CreateBranchRequest,
} from '@/api/admin';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? fallback
  );
}

const EMPTY_FORM: CreateBranchRequest = {
  name: '',
  code: '',
  ccnNumber: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  zipCode: null,
  phone: null,
};

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<CreateBranchRequest>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  // Create / update / delete branches all require admin:manage_branches
  // (POST|PUT|DELETE /branches are gated by that policy). The list (GET) is
  // open to any authenticated user, so viewing isn't gated.
  const canManage = usePermission(PERMISSIONS.ADMIN_MANAGE_BRANCHES);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listBranches(false);
      setBranches(data);
    } catch {
      setError('Failed to load branches.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setActionMsg(null);
  }

  function startEdit(b: Branch) {
    setEditing(b);
    setForm({
      name: b.name,
      code: b.code,
      ccnNumber: b.ccnNumber,
      addressLine1: b.addressLine1,
      addressLine2: b.addressLine2,
      city: b.city,
      state: b.state,
      zipCode: b.zipCode,
      phone: b.phone,
    });
    setShowForm(true);
    setActionMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setActionMsg(null);
    try {
      if (editing) {
        await updateBranch(editing.id, {
          name: form.name,
          ccnNumber: form.ccnNumber,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          phone: form.phone,
          isActive: editing.isActive,
        });
        setActionMsg(`Updated branch ${form.name}.`);
      } else {
        await createBranch(form);
        setActionMsg(`Created branch ${form.name}.`);
      }
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Save failed.'));
    }
  }

  async function handleToggleActive(b: Branch) {
    setError(null);
    try {
      await updateBranch(b.id, {
        name: b.name,
        ccnNumber: b.ccnNumber,
        addressLine1: b.addressLine1,
        addressLine2: b.addressLine2,
        city: b.city,
        state: b.state,
        zipCode: b.zipCode,
        phone: b.phone,
        isActive: !b.isActive,
      });
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to toggle active state.'));
    }
  }

  async function handleDelete(b: Branch) {
    if (!window.confirm(`Delete branch "${b.name}"? This is soft-delete and can be reversed by re-creating.`)) {
      return;
    }
    setError(null);
    try {
      await deleteBranch(b.id);
      setActionMsg(`Deleted branch ${b.name}.`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to delete branch.'));
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="flex items-baseline justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl">Branches</h2>
          <div className="section-line" />
          <p className="max-w-3xl text-slate-500">
            Intra-organization sites or service lines. Patients and claims can be
            optionally assigned to a branch for operational reporting.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          disabled={!canManage}
          title={!canManage ? NO_PERMISSION : undefined}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          + New Branch
        </button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}
      {actionMsg && <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">{actionMsg}</div>}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 className="col-span-full text-lg font-semibold">
            {editing ? `Edit Branch #${editing.id}` : 'New Branch'}
          </h3>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Name *</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Code *</span>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              disabled={!!editing}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">CCN Number</span>
            <input
              value={form.ccnNumber ?? ''}
              onChange={(e) => setForm({ ...form, ccnNumber: e.target.value || null })}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Phone</span>
            <input
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
              className="form-input"
            />
          </label>
          <label className="col-span-full grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Address line 1</span>
            <input
              value={form.addressLine1 ?? ''}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value || null })}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">City</span>
            <input
              value={form.city ?? ''}
              onChange={(e) => setForm({ ...form, city: e.target.value || null })}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">State</span>
            <input
              value={form.state ?? ''}
              onChange={(e) => setForm({ ...form, state: e.target.value || null })}
              maxLength={2}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">ZIP</span>
            <input
              value={form.zipCode ?? ''}
              onChange={(e) => setForm({ ...form, zipCode: e.target.value || null })}
              className="form-input"
            />
          </label>
          <div className="col-span-full flex gap-2">
            <button
              type="submit"
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editing ? 'Save' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {!isLoading && branches.length === 0 && (
        <p className="text-slate-500">No branches yet — create one to get started.</p>
      )}
      {!isLoading && branches.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">CCN</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-700">{b.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{b.code}</td>
                  <td className="px-4 py-3 text-slate-500">{b.ccnNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {[b.city, b.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {b.isActive ? (
                      <span className="text-success">Active</span>
                    ) : (
                      <span className="text-slate-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEdit(b)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(b)}
                        disabled={!canManage}
                        title={!canManage ? NO_PERMISSION : undefined}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {b.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(b)}
                        disabled={!canManage}
                        title={!canManage ? NO_PERMISSION : undefined}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
