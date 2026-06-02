import { Link } from 'react-router-dom';

const SETTINGS_CARDS = [
  {
    href: '/portal/settings/branding',
    title: 'Branding',
    description: 'Customize your portal with your logo, colors, and custom domain.',
    testid: 'setting-card-branding',
  },
  {
    href: '/portal/settings/sso',
    title: 'Single Sign-On',
    description: 'Configure SAML 2.0 or OpenID Connect for your organization.',
    testid: 'setting-card-sso',
  },
  {
    href: '/portal/dashboard',
    title: 'Account',
    description: 'Manage your account details, password, and preferences.',
    testid: 'setting-card-account',
  },
];

export function CommercialSettingsPage() {
  return (
    <div style={{ padding: '1rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 data-testid="page-title" style={{ fontSize: 24, fontWeight: 600 }}>
          Settings
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Manage your organization settings and integrations.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {SETTINGS_CARDS.map((card) => (
          <Link
            key={card.href}
            to={card.href}
            data-testid={card.testid}
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <div
              data-testid="setting-row"
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <h3
                style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}
              >
                {card.title}
              </h3>
              <p style={{ fontSize: 14, color: '#64748b' }}>{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
