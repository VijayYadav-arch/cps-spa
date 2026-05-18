import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';

const navItems = [
  { to: '/', label: 'Dashboard', exact: true },
  { to: '/claims', label: 'Claims' },
  { to: '/patients', label: 'Patients' },
  { to: '/billing', label: 'Billing' },
  { to: '/clinical', label: 'Clinical' },
  { to: '/hospice/work-queue', label: 'Hospice' },
  { to: '/documents', label: 'Documents' },
  { to: '/platform', label: 'Platform' },
  { to: '/admin', label: 'Admin' },
];

export function Layout() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav
        aria-label="Main navigation"
        style={{
          width: 220,
          background: '#1e293b',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #334155' }}>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>CPS</span>
        </div>

        <ul style={{ listStyle: 'none', padding: '16px 0', margin: 0, flex: 1 }}>
          {navItems.map(({ to, label, exact }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={exact}
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '10px 20px',
                  color: isActive ? '#f8fafc' : '#94a3b8',
                  background: isActive ? '#2563eb' : 'transparent',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #334155' }}>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            {auth.user?.roles[0] ?? 'User'}
          </p>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px 0',
              background: 'transparent',
              border: '1px solid #475569',
              borderRadius: 4,
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, padding: 32, background: '#f8fafc', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
