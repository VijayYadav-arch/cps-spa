import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listPortalUsers,
  invitePortalUser,
  setPortalUserActive,
  type PortalUser,
} from '@/api/portalUsers';

const ROLE_LABELS: Record<string, string> = {
  client_admin: 'Administrator',
  client_viewer: 'Viewer',
};

export function CommercialSettingsUsersPage() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleName, setRoleName] = useState('client_viewer');
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    setLoading(true);
    listPortalUsers()
      .then((r) => {
        setUsers(r.data);
        setAssignableRoles(r.assignableRoles);
        if (r.assignableRoles.length) setRoleName(r.assignableRoles[r.assignableRoles.length - 1]);
      })
      .catch(() => setError('Unable to load your team.'))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleInvite() {
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await invitePortalUser({
        email: email.trim(),
        firstName: firstName || null,
        lastName: lastName || null,
        roleName,
      });
      setShowInvite(false);
      setEmail(''); setFirstName(''); setLastName('');
      refresh();
    } catch (e) {
      setError(extractErr(e, 'Could not invite the user.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(u: PortalUser) {
    setError(null);
    try {
      await setPortalUserActive(u.id, !u.active);
      refresh();
    } catch (e) {
      setError(extractErr(e, 'Could not update the user.'));
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 data-testid="page-title" className="text-2xl">Team</h1>
          <p className="mt-1 text-sm text-slate-500">
            <Link to="/portal/settings" className="text-teal-700 hover:underline">Settings</Link>
            {' · '}Invite teammates and manage their access.
          </p>
        </div>
        {!showInvite && (
          <button onClick={() => setShowInvite(true)} className="btn-primary">Invite user</button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {showInvite && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Invite a teammate</h2>
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
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Access level</span>
              <select value={roleName} onChange={(e) => setRoleName(e.target.value)} className="form-input w-44">
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInvite(false)} disabled={submitting}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
            <button onClick={handleInvite} disabled={submitting || !email.trim()} className="btn-primary disabled:opacity-60">
              {submitting ? 'Inviting…' : 'Send invite'}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading team…</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No users yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3">{`${u.firstName} ${u.lastName}`.trim() || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.roles.map((r) => ROLE_LABELS[r.name] ?? r.displayName).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'never'}
                  </td>
                  <td className="px-4 py-3">
                    {u.active
                      ? <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 border border-green-200">Active</span>
                      : <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-500 border border-slate-200">Inactive</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(u)}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      {u.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function extractErr(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}
