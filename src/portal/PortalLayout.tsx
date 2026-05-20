import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { usePortalAuth } from './PortalAuthContext';

const navStyle = ({ isActive }: { isActive: boolean }) => ({
  display: 'block',
  padding: '8px 12px',
  borderRadius: 6,
  color: isActive ? '#fff' : '#1e293b',
  background: isActive ? '#0ea5e9' : 'transparent',
  textDecoration: 'none' as const,
  fontWeight: 500,
});

export function PortalLayout({ children }: { children?: ReactNode }) {
  const { me, logout } = usePortalAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <aside
        style={{
          background: '#f1f5f9',
          borderRight: '1px solid #e2e8f0',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#0ea5e9',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/portal')}
        >
          Patient Portal
        </div>
        {me && (
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
            Signed in as {me.relationshipLabel}
          </div>
        )}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavLink to="/portal" end style={navStyle}>Overview</NavLink>
          <NavLink to="/portal/statements" style={navStyle}>Statements</NavLink>
          <NavLink to="/portal/payments" style={navStyle}>Payment History</NavLink>
          <NavLink to="/portal/documents" style={navStyle}>Documents</NavLink>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button
            type="button"
            onClick={logout}
            style={{
              background: 'transparent',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '6px 12px',
              cursor: 'pointer',
              color: '#475569',
              fontSize: 13,
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main style={{ padding: 24, background: '#fff' }}>
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
