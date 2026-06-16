import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrganizations, getUsers, type Organization, type UserSummary } from '@/api/admin';

export function AdminDashboard() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getOrganizations({ pageSize: 5 }), getUsers({ pageSize: 5 })])
      .then(([o, u]) => {
        if (!cancelled) {
          setOrgs(o.data);
          setUsers(u.data);
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load admin data.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (isLoading) return <div role="status" className="text-slate-500">Loading admin dashboard…</div>;
  if (error) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Admin Dashboard</h2>
        <div className="section-line" />
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Organizations</h3>
            <Link to="/admin/organizations" className="font-medium text-teal-700 hover:underline">View all</Link>
          </div>
          {orgs.length === 0 ? <p className="text-slate-500">No organizations.</p> : (
            <ul className="m-0 list-none p-0">
              {orgs.map((o) => (
                <li key={o.id} className="border-b border-slate-100 py-2">
                  <span className="font-medium text-slate-700">{o.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{o.slug}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Users</h3>
            <Link to="/admin/users" className="font-medium text-teal-700 hover:underline">View all</Link>
          </div>
          {users.length === 0 ? <p className="text-slate-500">No users.</p> : (
            <ul className="m-0 list-none p-0">
              {users.map((u) => (
                <li key={u.id} className="border-b border-slate-100 py-2">
                  <span className="text-slate-700">{u.firstName} {u.lastName}</span>
                  <span className="ml-2 text-xs text-slate-500">{u.email}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
