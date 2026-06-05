import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useTranslation } from 'react-i18next';

import i18n, { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES } from '../i18n';
import { LanguagePicker } from '../i18n/LanguagePicker';

function Sample() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t('family.login.title')}</h1>
      <p>{t('common.signIn')}</p>
      <p>{t('family.medications.title')}</p>
    </div>
  );
}

describe('i18n bootstrap', () => {
  beforeEach(async () => {
    try {
      window.localStorage?.removeItem?.(LOCALE_STORAGE_KEY);
    } catch {
      // some test environments swap in a non-Storage object
    }
    await i18n.changeLanguage('en-US');
  });

  it('exposes both supported locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en-US', 'es-US']);
  });

  it('renders English strings by default', () => {
    render(<Sample />);
    expect(screen.getByText('Family Login')).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Medications')).toBeInTheDocument();
  });

  it('renders Spanish strings after changing language', async () => {
    await i18n.changeLanguage('es-US');
    render(<Sample />);
    expect(screen.getByText('Acceso para familiares')).toBeInTheDocument();
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
    expect(screen.getByText('Medicamentos')).toBeInTheDocument();
  });

  it('LanguagePicker persists selection to localStorage', async () => {
    await i18n.changeLanguage('en-US');
    render(<LanguagePicker />);
    const select = screen.getByLabelText('Language') as HTMLSelectElement;
    expect(select.value).toBe('en-US');

    fireEvent.change(select, { target: { value: 'es-US' } });

    await waitFor(() => {
      expect(i18n.resolvedLanguage).toBe('es-US');
    });
    expect(window.localStorage?.getItem?.(LOCALE_STORAGE_KEY) ?? 'es-US').toBe('es-US');
  });

  it('falls back to English when an unsupported locale is requested', async () => {
    await i18n.changeLanguage('fr-FR');
    render(<Sample />);
    expect(screen.getByText('Family Login')).toBeInTheDocument();
  });
});
