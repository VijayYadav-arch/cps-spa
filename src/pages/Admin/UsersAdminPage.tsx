import { useEffect, useState } from 'react';
import {
  listUsers,
  listRoles,
  createUser,
  updateUser,
  assignUserRoles,
  type AdminUser,
  type AdminRole,
} from '@/api/userAdmin';

export function UsersAdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [newRoleIds, setNewRoleIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Per-user role editor
  const [editingRolesFor, setEditingRolesFor] = useState<number | null>(null);
  const [editRoleIds, setEditRoleIds] = useState<number[]>([]);

  function refresh() {
    setLoading(true);
    listUsers()
      .then((r) => setUsers(r.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    // Role catalog is gated admin:manage_roles; degrade gracefully if forbidden.
    listRoles()
      .then((r) => setRoles(r.data))
      .catch(() => undefined);
  }, []);

  const canEditRoles = roles.length > 0;

  function toggle(list: number[], id: number): number[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function handleCreate() {
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createUser({
        email: email.trim(),
        firstName: firstName || null,
        lastName: lastName || null,
        roleIds: newRoleIds,
      });
      setShowForm(false);
      setEmail(''); setFirstName(''); setLastName(''); setNewRoleIds([]);
      refresh();
    } catch (e) {
      setError(extractError(e, 'Could not create the user.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(u: AdminUser) {
    try {
      await updateUser(u.id, { active: !u.active });
      refresh();
    } catch (e) {
      setError(extractError(e, 'Could not update the user.'));
    }
  }

  function openRoleEditor(u: AdminUser) {
    setEditingRolesFor(u.id);
    setEditRoleIds(u.roles.map((r) => r.id));
  }

  async function saveRoles(userId: number) {
    setSubmitting(true);
    setError(null);
    try {
      await assignUserRoles(userId, editRoleIds);
      setEditingRolesFor(null);
      refresh();
    } catch (e) {
      // The backend rejects assigning roles broader than the assigner's own (R-017).
      setError(extractError(e, 'Could not update roles (you can only assign roles within your own permissions).'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif text-slate-900">Users</h1>
          <p className="text-slate-600 mt-1">Manage staff accounts and role assignments</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Add User
          </button>
        )}
      </header>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-800">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 grid gap-4">
          <h2 className="text-lg font-semibold">Add user</h2>
          <div className="flex flex-wrap gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="form-input w-64" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">First name</span>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="form-input w-40" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Last name</span>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="form-input w-40" />
            </label>
          </div>
          {canEditRoles && (
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium text-slate-600">Roles</legend>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={newRoleIds.includes(r.id)}
                      onChange={() => setNewRoleIds((l) => toggle(l, r.id))}
                    />
                    {r.displayName}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} disabled={submitting}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={submitting || !email.trim()} className="btn-primary disabled:opacity-60">
              {submitting ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No users.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Roles</th>
                <th className="px-5 py-3">Last login</th>
                <th className="px-5 py-3">Active</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 align-top">
                  <td className="px-5 py-4 font-medium">{u.email}</td>
                  <td className="px-5 py-4">{`${u.firstName} ${u.lastName}`.trim() || '—'}</td>
                  <td className="px-5 py-4">
                    {editingRolesFor === u.id ? (
                      <div className="grid gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {roles.map((r) => (
                            <label key={r.id} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-0.5 text-xs">
                              <input
                                type="checkbox"
                                checked={editRoleIds.includes(r.id)}
                                onChange={() => setEditRoleIds((l) => toggle(l, r.id))}
                              />
                              {r.displayName}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingRolesFor(null)} className="text-xs text-slate-500 hover:underline">Cancel</button>
                          <button onClick={() => saveRoles(u.id)} disabled={submitting} className="text-xs font-semibold text-teal-700 hover:underline disabled:opacity-60">Save roles</button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-600">
                        {u.roles.length ? u.roles.map((r) => r.displayName).join(', ') : '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'never'}
                  </td>
                  <td className="px-5 py-4">
                    {u.active ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">Active</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">Inactive</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex gap-2">
                      {canEditRoles && editingRolesFor !== u.id && (
                        <button onClick={() => openRoleEditor(u)}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          Edit roles
                        </button>
                      )}
                      <button onClick={() => toggleActive(u)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                        {u.active ? 'Deactivate' : 'Reactivate'}
                      </button>
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

function extractError(e: unknown, fallback: string): string {
  return (
    (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
  );
}
