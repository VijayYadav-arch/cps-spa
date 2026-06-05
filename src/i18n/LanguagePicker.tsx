import { useTranslation } from 'react-i18next';

import { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type SupportedLocale } from './index';

export function LanguagePicker({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'en-US') as SupportedLocale;
  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as SupportedLocale;
    void i18n.changeLanguage(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable (private mode); i18next still updates in-memory.
    }
  };
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span>{t('languagePicker.label')}</span>
      <select
        value={current}
        onChange={onChange}
        className="rounded border border-gray-300 bg-white px-2 py-1"
        aria-label={t('languagePicker.label')}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {locale === 'en-US' ? t('languagePicker.english') : t('languagePicker.spanish')}
          </option>
        ))}
      </select>
    </label>
  );
}
