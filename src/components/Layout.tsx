import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { InboxBadge } from '@/components/InboxBadge';
import { NotificationToasts } from '@/components/NotificationToasts';
import { LanguagePicker } from '@/i18n/LanguagePicker';

interface NavLeaf {
  kind: 'leaf';
  to: string;
  label: string;
  exact?: boolean;
}

interface NavGroup {
  kind: 'group';
  label: string;
  items: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

const navItems: NavEntry[] = [
  { kind: 'leaf', to: '/', label: 'Dashboard', exact: true },
  { kind: 'leaf', to: '/inbox', label: 'Inbox' },
  { kind: 'leaf', to: '/claims', label: 'Claims' },
  { kind: 'leaf', to: '/patients', label: 'Patients' },
  { kind: 'leaf', to: '/analytics', label: 'Analytics' },
  {
    kind: 'group',
    label: 'Billing',
    items: [
      { kind: 'leaf', to: '/billing', label: 'Dashboard' },
      { kind: 'leaf', to: '/billing/denials/queue', label: 'Denial Queue' },
      { kind: 'leaf', to: '/billing/ar', label: 'AR Follow-Up' },
      { kind: 'leaf', to: '/billing/secondary', label: 'Secondary Claims' },
      { kind: 'leaf', to: '/billing/statements', label: 'Patient Statements' },
      { kind: 'leaf', to: '/billing/eligibility', label: 'Eligibility' },
      { kind: 'leaf', to: '/billing/prior-auth', label: 'Prior Auth' },
      { kind: 'leaf', to: '/billing/charges', label: 'Charge Entry' },
    ],
  },
  { kind: 'leaf', to: '/clinical', label: 'Clinical' },
  {
    kind: 'group',
    label: 'Hospice',
    items: [
      { kind: 'leaf', to: '/hospice/work-queue', label: 'Work Queue' },
      { kind: 'leaf', to: '/hospice/bereavement', label: 'Bereavement' },
      { kind: 'leaf', to: '/hospice/volunteers', label: 'Volunteers' },
      { kind: 'leaf', to: '/hospice/hqrp', label: 'HQRP Timeliness' },
      { kind: 'leaf', to: '/hospice/medicare-cap', label: 'Medicare Cap' },
      { kind: 'leaf', to: '/hospice/cahps', label: 'CAHPS Survey' },
    ],
  },
  {
    kind: 'group',
    label: 'Time',
    items: [
      { kind: 'leaf', to: '/me/time', label: 'My Time' },
      { kind: 'leaf', to: '/time', label: 'Team (admin)' },
    ],
  },
  { kind: 'leaf', to: '/documents', label: 'Documents' },
  { kind: 'leaf', to: '/org/rollup', label: 'Parent-Org Rollup' },
  { kind: 'leaf', to: '/admin/branches', label: 'Branches' },
  {
    kind: 'group',
    label: 'Quality',
    items: [
      { kind: 'leaf', to: '/quality/qapi', label: 'Dashboard' },
      { kind: 'leaf', to: '/quality/qapi/pips', label: 'PIPs' },
      { kind: 'leaf', to: '/quality/qapi/adverse-events', label: 'Adverse Events' },
      { kind: 'leaf', to: '/quality/qapi/reviews', label: 'Reviews' },
      { kind: 'leaf', to: '/quality/qapi/plan', label: 'Plan' },
      { kind: 'leaf', to: '/quality/qapi/audit-triggers', label: 'Audit Triggers' },
    ],
  },
  {
    kind: 'group',
    label: 'Compliance',
    items: [
      { kind: 'leaf', to: '/compliance/phi-access', label: 'PHI Access Review' },
      { kind: 'leaf', to: '/compliance/surveyor-bundle', label: 'Surveyor Bundle' },
      { kind: 'leaf', to: '/compliance/breaches', label: 'Breach Workflow' },
    ],
  },
  { kind: 'leaf', to: '/platform', label: 'Platform' },
  { kind: 'leaf', to: '/admin', label: 'Admin' },
];

function leafStyle({ isActive }: { isActive: boolean }, indented = false): React.CSSProperties {
  return {
    display: 'block',
    padding: indented ? '8px 20px 8px 33px' : '10px 17px',
    borderLeft: isActive ? '3px solid #2dd4bf' : '3px solid transparent',
    color: isActive ? '#5eead4' : '#cbd5e1',
    background: isActive ? 'rgba(13, 148, 136, 0.18)' : 'transparent',
    textDecoration: 'none',
    fontSize: indented ? 13 : 14,
    fontWeight: isActive ? 600 : 400,
    transition: 'color 0.15s ease, background 0.15s ease',
  };
}

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
          background: 'linear-gradient(180deg, #0B1D3A 0%, #0f2f44 100%)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <img src="/brand/mira-wordmark.svg" alt="Mira" style={{ height: 30, width: 'auto' }} />
        </div>

        <ul style={{ listStyle: 'none', padding: '16px 0', margin: 0, flex: 1 }}>
          {navItems.map((entry) =>
            entry.kind === 'leaf' ? (
              <li key={entry.to}>
                <NavLink
                  to={entry.to}
                  end={entry.exact}
                  style={(s) => leafStyle(s)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {entry.label}
                    {entry.to === '/inbox' && <InboxBadge />}
                  </span>
                </NavLink>
              </li>
            ) : (
              <li key={entry.label}>
                <div
                  style={{
                    padding: '10px 20px 4px',
                    color: '#cbd5e1',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {entry.label}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {entry.items.map((sub) => (
                    <li key={sub.to}>
                      <NavLink
                        to={sub.to}
                        style={(s) => leafStyle(s, true)}
                      >
                        {sub.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            ),
          )}
        </ul>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ marginBottom: 12, color: '#94a3b8' }}>
            <LanguagePicker />
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            {auth.user?.roles[0] ?? 'User'}
          </p>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px 0',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: '#cbd5e1',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, padding: 32, background: '#FAFAF5', overflow: 'auto' }}>
        <Outlet />
      </main>

      {/* Inbox notification toasts — mounted once at the layout level so
          they survive route changes; component handles its own polling. */}
      <NotificationToasts />
    </div>
  );
}
