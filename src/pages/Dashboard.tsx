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
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Welcome back{auth.user ? `, ${auth.user.roles[0] ?? ''}` : ''}
      </h2>
      <p style={{ color: '#64748b', marginBottom: 32 }}>
        Organization ID: {auth.user?.organizationId ?? 'N/A'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {quickLinks.map(({ to, label, description }) => (
          <Link
            key={to}
            to={to}
            style={{
              display: 'block',
              padding: 20,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              textDecoration: 'none',
              color: 'inherit',
              background: '#fff',
              transition: 'box-shadow 0.15s',
            }}
          >
            <h3 style={{ fontWeight: 600, marginBottom: 6 }}>{label}</h3>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
