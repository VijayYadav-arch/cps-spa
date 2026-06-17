import { useEffect, useState } from 'react';
import {
  listRolesDetailed,
  getRole,
  getPermissionCatalog,
  createRole,
  updateRole,
  deleteRole,
  type RoleSummary,
  type PermissionCategory,
} from '@/api/roleAdmin';

export function RolesAdminPage() {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [catalog, setCatalog] = useState<PermissionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Editor state: editing an existing role's permissions, or creating a new role.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Set<number>>(new Set());

  function refresh() {
    setLoading(true);
    listRolesDetailed()
      .then((r) => setRoles(r.data))
      .catch(() => setError('Failed to load roles.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    getPermissionCatalog().then((r) => setCatalog(r.data)).catch(() => undefined);
  }, []);

  function resetForm() {
    setEditingId(null); setCreating(false);
    setName(''); setDisplayName(''); setDescription(''); setSelectedPerms(new Set());
  }

  function openCreate() {
    resetForm();
    setCreating(true);
  }

  async function openEdit(roleId: number) {
    resetForm();
    setError(null);
    try {
      const { data } = await getRole(roleId);
      setEditingId(roleId);
      setDisplayName(data.displayName);
      setDescription(data.description ?? '');
      setSelectedPerms(new Set(data.permissions.map((p) => p.id)));
    } catch {
      setError('Could not load that role.');
    }
  }

  function togglePerm(id: number) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      const permissionIds = [...selectedPerms];
      if (creating) {
        if (!name.trim()) { setError('Role name is required.'); return; }
        await createRole({ name: name.trim(), displayName: displayName || name, description: description || null, permissionIds });
      } else if (editingId != null) {
        await updateRole(editingId, { displayName: displayName || null, description: description || null, permissionIds });
      }
      resetForm();
      refresh();
    } catch (e) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not save the role.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(role: RoleSummary) {
    if (!window.confirm(`Delete role "${role.displayName}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteRole(role.id);
      refresh();
    } catch (e) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not delete the role.');
    }
  }

  const editorOpen = creating || editingId != null;

  return (
    <section className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif text-slate-900">Roles &amp; Permissions</h1>
          <p className="text-slate-600 mt-1">Define roles and the permissions they grant</p>
        </div>
        {!editorOpen && (
          <button onClick={openCreate} className="btn-primary">New Role</button>
        )}
      </header>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-800">{error}</div>
      )}

      {editorOpen && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 grid gap-4">
          <h2 className="text-lg font-semibold">{creating ? 'New role' : 'Edit role'}</h2>
          <div className="flex flex-wrap gap-4">
            {creating && (
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-600">Name (code)</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. intake_lead" className="form-input w-48" />
              </label>
            )}
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Display name</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="form-input w-56" />
            </label>
            <label className="grid gap-1.5 flex-1 min-w-[240px]">
              <span className="text-sm font-medium text-slate-600">Description</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="form-input" />
            </label>
          </div>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium text-slate-600">Permissions ({selectedPerms.size} selected)</legend>
            <div className="grid gap-3 max-h-[420px] overflow-y-auto rounded-lg border border-slate-100 p-3">
              {catalog.map((cat) => (
                <div key={cat.category}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{cat.category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.permissions.map((p) => (
                      <label key={p.id} title={p.description ?? p.code}
                        className="flex items-center gap-1 rounded border border-slate-200 px-2 py-0.5 text-xs">
                        <input type="checkbox" checked={selectedPerms.has(p.id)} onChange={() => togglePerm(p.id)} />
                        {p.displayName}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="flex gap-2">
            <button onClick={resetForm} disabled={busy}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
            <button onClick={handleSave} disabled={busy || (creating && !name.trim())} className="btn-primary disabled:opacity-60">
              {busy ? 'Saving…' : creating ? 'Create role' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading roles…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Permissions</th>
                <th className="px-5 py-3">Users</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <span className="font-medium">{r.displayName}</span>
                    <span className="block text-xs text-slate-400">{r.name}</span>
                  </td>
                  <td className="px-5 py-4">
                    {r.isSystem
                      ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">System</span>
                      : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">Custom</span>}
                  </td>
                  <td className="px-5 py-4 text-slate-500">{r.permissionCount}</td>
                  <td className="px-5 py-4 text-slate-500">{r.userCount}</td>
                  <td className="px-5 py-4">
                    <span className="flex gap-2">
                      <button onClick={() => openEdit(r.id)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {r.isSystem ? 'View / edit' : 'Edit'}
                      </button>
                      {!r.isSystem && (
                        <button onClick={() => handleDelete(r)}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                          Delete
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
