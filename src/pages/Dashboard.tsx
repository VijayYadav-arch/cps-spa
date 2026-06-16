import { useAuth } from '@/auth/useAuth';
import { Link } from 'react-router-dom';

const quickLinks = [
  { to: '/claims', label: 'Claims', description: 'View and manage insurance claims' },
  { to: '/patients', label: 'Patients', description: 'Patient records and details' },
  { to: '/billing', label: 'Billing', description: 'Work queue and denial management' },
  { to: '/clinical', label: 'Clinical', description: 'Care plans and prior authorizations' },
  { to: '/documents', label: 'Documents', description: 'Upload and manage documents' },
  { to: '/platform', label: 'Platform', description: 'API keys and webhooks' },
];

export function Dashboard() {
  const { auth } = useAuth();

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
        {quickLinks.map(({ to, label, description }) => (
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
