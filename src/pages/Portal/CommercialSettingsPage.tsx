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
    href: '/portal/settings/users',
    title: 'Team',
    description: 'Invite teammates, set their access level, and deactivate accounts.',
    testid: 'setting-card-users',
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
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div>
        <h1 data-testid="page-title" className="text-2xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your organization settings and integrations.
        </p>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {SETTINGS_CARDS.map((card) => (
          <Link
            key={card.href}
            to={card.href}
            data-testid={card.testid}
            className="card-hover block rounded-xl border border-slate-200 bg-white p-6 text-inherit no-underline shadow-sm"
          >
            <div data-testid="setting-row" className="flex flex-col">
              <h3 className="mb-1 text-lg font-semibold text-navy-900">{card.title}</h3>
              <p className="text-sm text-slate-500">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
