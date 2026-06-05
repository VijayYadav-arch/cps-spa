import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enUS from './locales/en-US.json';
import esUS from './locales/es-US.json';

export const SUPPORTED_LOCALES = ['en-US', 'es-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_STORAGE_KEY = 'cps.locale';

const i18n = i18next.createInstance();

export const i18nReady = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': { translation: enUS },
      'es-US': { translation: esUS },
    },
    fallbackLng: 'en-US',
    supportedLngs: SUPPORTED_LOCALES,
    // NOTE: do not enable nonExplicitSupportedLngs here -- in i18next 23 it
    // interacts with our resource layout in a way that makes t() return the
    // key instead of the value. The detector already produces "en-US" /
    // "es-US" on every platform we care about.
    load: 'currentOnly',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

export default i18n;
