import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePortalAuth } from '@/portal/PortalAuthContext';
import { LanguagePicker } from '@/i18n/LanguagePicker';

const NAV_ITEMS: { to: string; key: string }[] = [
  { to: '/family/dashboard', key: 'family.nav.dashboard' },
  { to: '/family/visits', key: 'family.nav.visits' },
  { to: '/family/medications', key: 'family.nav.medications' },
  { to: '/family/care-plan', key: 'family.nav.care' },
  { to: '/family/documents', key: 'family.nav.documents' },
  { to: '/family/billing', key: 'family.nav.billing' },
  { to: '/family/payments', key: 'family.nav.payments' },
  { to: '/family/chat', key: 'family.nav.chat' },
  { to: '/family/preferences', key: 'family.nav.preferences' },
];

/**
 * Shared shell for the authenticated family portal (H5): persistent nav + a
 * Sign-out control. Previously each family page rendered bare, leaving family
 * members with no way to move between sections or to log out.
 */
export function FamilyLayout() {
  const { t } = useTranslation();
  const { logout } = usePortalAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-teal-600 text-white' : 'text-slate-700 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label={t('family.nav.menu')}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-50 md:hidden"
            >
              ☰
            </button>
            <span className="text-lg font-semibold text-teal-700">Mira™</span>
            <span className="hidden text-sm text-slate-500 sm:inline">{t('family.nav.brand')}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguagePicker className="hidden sm:inline-flex" />
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('family.nav.logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1200px] gap-6 px-4 py-6">
        <nav
          aria-label={t('family.nav.menu')}
          className={`${menuOpen ? 'block' : 'hidden'} w-full shrink-0 md:block md:w-56`}
        >
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={linkClass} onClick={() => setMenuOpen(false)}>
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className={`min-w-0 flex-1 ${menuOpen ? 'hidden md:block' : 'block'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
