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

  if (isLoading) return <div role="status">Loading admin dashboard…</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Admin Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontWeight: 600 }}>Organizations</h3>
            <Link to="/admin/organizations" style={{ color: '#2563eb', fontSize: 14 }}>View all</Link>
          </div>
          {orgs.length === 0 ? <p style={{ color: '#64748b' }}>No organizations.</p> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {orgs.map((o) => (
                <li key={o.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: 500 }}>{o.name}</span>
                  <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{o.slug}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontWeight: 600 }}>Recent Users</h3>
            <Link to="/admin/users" style={{ color: '#2563eb', fontSize: 14 }}>View all</Link>
          </div>
          {users.length === 0 ? <p style={{ color: '#64748b' }}>No users.</p> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {users.map((u) => (
                <li key={u.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span>{u.firstName} {u.lastName}</span>
                  <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{u.email}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
