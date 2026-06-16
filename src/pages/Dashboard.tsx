import { useAuth } from '@/auth/useAuth';
import { Link } from 'react-router-dom';
import { useUserRoles } from '@/permissions/useUserRoles';
import { PERMISSIONS, type Permission } from '@/permissions';

interface QuickLink {
  to: string;
  label: string;
  description: string;
  perm?: Permission;
}

const quickLinks: QuickLink[] = [
  { to: '/claims', label: 'Claims', description: 'View and manage insurance claims', perm: PERMISSIONS.CLAIMS_VIEW },
  { to: '/patients', label: 'Patients', description: 'Patient records and details', perm: PERMISSIONS.PATIENTS_VIEW },
  { to: '/billing', label: 'Billing', description: 'Work queue and denial management', perm: PERMISSIONS.BILLING_QUEUE },
  { to: '/clinical', label: 'Clinical', description: 'Care plans and prior authorizations', perm: PERMISSIONS.CLINICAL_VISIT_NOTES },
  { to: '/documents', label: 'Documents', description: 'Upload and manage documents' },
  { to: '/platform', label: 'Platform', description: 'API keys and webhooks', perm: PERMISSIONS.PLATFORM_ADMIN },
];

export function Dashboard() {
  const { auth } = useAuth();
  const { data: roleData } = useUserRoles();

  // Show a card only if the user can reach the page. While /me loads (no
  // permissions yet) show everything to avoid a flash; route guards enforce.
  const visibleLinks = quickLinks.filter(({ perm }) => {
    if (!perm) return true;
    const granted = roleData?.permissions;
    return !granted || granted.includes(perm);
  });

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">
          Welcome back{auth.user ? `, ${auth.user.roles[0] ?? ''}` : ''}
        </h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Organization ID: {auth.user?.organizationId ?? 'N/A'}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleLinks.map(({ to, label, description }) => (
          <Link
            key={to}
            to={to}
            className="card-hover block rounded-xl border border-slate-200 bg-white p-5 text-inherit no-underline shadow-sm"
          >
            <h3 className="mb-1.5 text-lg font-semibold">{label}</h3>
            <p className="m-0 text-sm text-slate-500">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
