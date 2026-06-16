import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { InboxBadge } from '@/components/InboxBadge';
import { NotificationToasts } from '@/components/NotificationToasts';
import { LanguagePicker } from '@/i18n/LanguagePicker';
import { MiraWordmark } from '@/components/MiraWordmark';
import { useUserRoles } from '@/permissions/useUserRoles';
import { PERMISSIONS, type Permission } from '@/permissions';

const COLLAPSE_KEY = 'mira_nav_collapsed';
const OPEN_GROUPS_KEY = 'mira_nav_open_groups';

/** A leaf is "active" for the current path on exact match or as a path prefix. */
function isLeafActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Label of the group whose items contain the active route, or null. */
function activeGroupLabel(pathname: string): string | null {
  for (const entry of navItems) {
    if (entry.kind === 'group' && entry.items.some((i) => isLeafActive(pathname, i.to))) {
      return entry.label;
    }
  }
  return null;
}

const toggleBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.16)',
  color: '#cbd5e1',
  borderRadius: 6,
  width: 30,
  height: 30,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  lineHeight: 1,
  flexShrink: 0,
  transition: 'background 0.15s ease',
};

interface NavLeaf {
  kind: 'leaf';
  to: string;
  label: string;
  exact?: boolean;
  /** Permission(s) required to see this entry. Omit for always-visible items. */
  perm?: Permission | Permission[];
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
  { kind: 'leaf', to: '/claims', label: 'Claims', perm: PERMISSIONS.CLAIMS_VIEW },
  {
    kind: 'group',
    label: 'Patients',
    items: [
      { kind: 'leaf', to: '/patients', label: 'All Patients', exact: true, perm: PERMISSIONS.PATIENTS_VIEW },
      { kind: 'leaf', to: '/patients/intake', label: 'New Patient', perm: PERMISSIONS.PATIENTS_INTAKE },
    ],
  },
  { kind: 'leaf', to: '/analytics', label: 'Analytics', perm: PERMISSIONS.REPORTS_VIEW },
  {
    kind: 'group',
    label: 'Billing',
    items: [
      { kind: 'leaf', to: '/billing', label: 'Dashboard', perm: PERMISSIONS.BILLING_QUEUE },
      { kind: 'leaf', to: '/billing/denials/queue', label: 'Denial Queue', perm: PERMISSIONS.BILLING_QUEUE },
      { kind: 'leaf', to: '/billing/ar', label: 'AR Follow-Up', perm: PERMISSIONS.BILLING_QUEUE },
      { kind: 'leaf', to: '/billing/secondary', label: 'Secondary Claims', perm: PERMISSIONS.BILLING_QUEUE },
      { kind: 'leaf', to: '/billing/statements', label: 'Patient Statements', perm: PERMISSIONS.BILLING_QUEUE },
      { kind: 'leaf', to: '/billing/eligibility', label: 'Eligibility', perm: PERMISSIONS.BILLING_QUEUE },
      { kind: 'leaf', to: '/billing/prior-auth', label: 'Prior Auth', perm: PERMISSIONS.BILLING_QUEUE },
      { kind: 'leaf', to: '/billing/charges', label: 'Charge Entry', perm: PERMISSIONS.BILLING_QUEUE },
    ],
  },
  { kind: 'leaf', to: '/clinical', label: 'Clinical', perm: PERMISSIONS.CLINICAL_VISIT_NOTES },
  {
    kind: 'group',
    label: 'Hospice',
    items: [
      { kind: 'leaf', to: '/hospice/work-queue', label: 'Work Queue', perm: PERMISSIONS.CLINICAL_QUALITY },
      { kind: 'leaf', to: '/hospice/bereavement', label: 'Bereavement', perm: PERMISSIONS.CLINICAL_QUALITY },
      { kind: 'leaf', to: '/hospice/volunteers', label: 'Volunteers', perm: PERMISSIONS.CLINICAL_QUALITY },
      { kind: 'leaf', to: '/hospice/hqrp', label: 'HQRP Timeliness', perm: PERMISSIONS.CLINICAL_QUALITY },
      { kind: 'leaf', to: '/hospice/medicare-cap', label: 'Medicare Cap', perm: PERMISSIONS.CLINICAL_QUALITY },
      { kind: 'leaf', to: '/hospice/cahps', label: 'CAHPS Survey', perm: PERMISSIONS.CLINICAL_QUALITY },
    ],
  },
  {
    kind: 'group',
    label: 'Time',
    items: [
      { kind: 'leaf', to: '/me/time', label: 'My Time' },
      { kind: 'leaf', to: '/time', label: 'Team (admin)', perm: PERMISSIONS.ADMIN_DASHBOARD },
    ],
  },
  { kind: 'leaf', to: '/documents', label: 'Documents' },
  {
    kind: 'group',
    label: 'Organization',
    items: [
      { kind: 'leaf', to: '/admin/organizations', label: 'Organizations', perm: PERMISSIONS.ADMIN_MANAGE_ORGS },
      { kind: 'leaf', to: '/admin/branches', label: 'Branches', perm: PERMISSIONS.ADMIN_MANAGE_BRANCHES },
      { kind: 'leaf', to: '/org/rollup', label: 'Parent-Org Rollup', perm: PERMISSIONS.ORG_ROLLUP_VIEW },
    ],
  },
  {
    kind: 'group',
    label: 'Quality',
    items: [
      { kind: 'leaf', to: '/quality/qapi', label: 'Dashboard', perm: PERMISSIONS.CLINICAL_QUALITY },
      { kind: 'leaf', to: '/quality/qapi/pips', label: 'PIPs', perm: PERMISSIONS.CLINICAL_QUALITY },
      { kind: 'leaf', to: '/quality/qapi/adverse-events', label: 'Adverse Events', perm: PERMISSIONS.CLINICAL_QUALITY },
      { kind: 'leaf', to: '/quality/qapi/reviews', label: 'Reviews', perm: PERMISSIONS.CLINICAL_QUALITY },
      { kind: 'leaf', to: '/quality/qapi/plan', label: 'Plan', perm: PERMISSIONS.CLINICAL_QUALITY },
      { kind: 'leaf', to: '/quality/qapi/audit-triggers', label: 'Audit Triggers', perm: PERMISSIONS.CLINICAL_QUALITY },
    ],
  },
  {
    kind: 'group',
    label: 'Compliance',
    items: [
      { kind: 'leaf', to: '/compliance/phi-access', label: 'PHI Access Review', perm: PERMISSIONS.COMPLIANCE_PHI_REVIEW },
      { kind: 'leaf', to: '/compliance/surveyor-bundle', label: 'Surveyor Bundle', perm: PERMISSIONS.COMPLIANCE_SURVEYOR_EXPORT },
      { kind: 'leaf', to: '/compliance/breaches', label: 'Breach Workflow', perm: PERMISSIONS.COMPLIANCE_BREACHES },
    ],
  },
  { kind: 'leaf', to: '/platform', label: 'Platform', perm: PERMISSIONS.PLATFORM_ADMIN },
  { kind: 'leaf', to: '/admin', label: 'Admin', perm: PERMISSIONS.ADMIN_DASHBOARD },
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
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const { data: roleData } = useUserRoles();

  // Permission-aware nav: hide entries the user can't access. While /me is
  // still loading (no permissions array yet) we show everything to avoid a
  // flash — the route guards remain the real enforcement.
  const can = (perm?: Permission | Permission[]): boolean => {
    if (!perm) return true;
    const granted = roleData?.permissions;
    if (!granted) return true;
    const required = Array.isArray(perm) ? perm : [perm];
    return required.every((p) => granted.includes(p));
  };
  const visibleNav: NavEntry[] = navItems
    .map((entry): NavEntry | null => {
      if (entry.kind === 'leaf') return can(entry.perm) ? entry : null;
      const items = entry.items.filter((i) => can(i.perm));
      return items.length > 0 ? { ...entry, items } : null;
    })
    .filter((e): e is NavEntry => e !== null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(OPEN_GROUPS_KEY);
      if (stored) return JSON.parse(stored) as Record<string, boolean>;
    } catch {
      /* ignore */
    }
    // Default: only the group containing the current route starts open.
    const active = activeGroupLabel(window.location.pathname);
    return active ? { [active]: true } : {};
  });

  // Reset the content scroll to the top whenever the route changes, so clicking
  // a nav item near the bottom of the (independently scrolling) sidebar never
  // leaves the new page scrolled partway down.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  // Auto-open the group that owns the active route (without collapsing others
  // the user has opened), so navigating into a group always reveals it.
  useEffect(() => {
    const active = activeGroupLabel(location.pathname);
    if (!active) return;
    setOpenGroups((prev) => (prev[active] ? prev : { ...prev, [active]: true }));
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
      } catch {
        /* ignore persistence failures */
      }
      return next;
    });
  };

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore persistence failures (private mode, etc.) */
      }
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar — collapsed to a slim rail or the full nav. */}
      {collapsed ? (
        <nav
          aria-label="Main navigation"
          style={{
            width: 48,
            background: 'linear-gradient(180deg, #0B1D3A 0%, #0f2f44 100%)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 24,
          }}
        >
          <button
            type="button"
            aria-label="Expand navigation"
            aria-expanded={false}
            title="Expand navigation"
            onClick={toggleCollapsed}
            style={toggleBtnStyle}
          >
            »
          </button>
        </nav>
      ) : (
      <nav
        aria-label="Main navigation"
        style={{
          width: 220,
          background: 'linear-gradient(180deg, #0B1D3A 0%, #0f2f44 100%)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 24,
          flexShrink: 0,
          height: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '0 16px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <MiraWordmark style={{ height: 30, width: 'auto' }} />
          <button
            type="button"
            aria-label="Collapse navigation"
            aria-expanded={true}
            title="Collapse navigation"
            onClick={toggleCollapsed}
            style={toggleBtnStyle}
          >
            «
          </button>
        </div>

        <ul style={{ listStyle: 'none', padding: '16px 0', margin: 0, flex: 1, overflowY: 'auto' }}>
          {visibleNav.map((entry) =>
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
              (() => {
                const isOpen = !!openGroups[entry.label];
                const hasActiveChild = entry.items.some((i) =>
                  isLeafActive(location.pathname, i.to),
                );
                return (
                  <li key={entry.label}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(entry.label)}
                      aria-expanded={isOpen}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '10px 20px 4px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: hasActiveChild && !isOpen ? '#5eead4' : '#cbd5e1',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span>{entry.label}</span>
                      <span
                        aria-hidden="true"
                        style={{
                          fontSize: 9,
                          transition: 'transform 0.15s ease',
                          transform: isOpen ? 'rotate(90deg)' : 'none',
                          opacity: 0.7,
                        }}
                      >
                        ▶
                      </span>
                    </button>
                    {isOpen && (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {entry.items.map((sub) => (
                          <li key={sub.to}>
                            <NavLink to={sub.to} end={sub.exact} style={(s) => leafStyle(s, true)}>
                              {sub.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })()
            ),
          )}
        </ul>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
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
      )}

      {/* Main content — its own scroll region, reset to top on navigation. */}
      <main ref={mainRef} style={{ flex: 1, padding: 32, background: '#FAFAF5', overflowY: 'auto', height: '100%' }}>
        <Outlet />
      </main>

      {/* Inbox notification toasts — mounted once at the layout level so
          they survive route changes; component handles its own polling. */}
      <NotificationToasts />
    </div>
  );
}
