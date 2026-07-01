import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './de.json';
import en from './en.json';

export type AppLanguage = 'de' | 'en';

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['de', 'en'];

// Resolve device locale to one of our supported languages.
// Falls back to 'de' if the device locale is anything other than English.
export function resolveDeviceLanguage(): AppLanguage {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    return locale.startsWith('en') ? 'en' : 'de';
  } catch {
    return 'de';
  }
}

// Module-level store for pre-auth language choice (before user_profile is written).
// This survives navigation between screens but is reset on app restart — acceptable
// because the picker is only shown once before auth completes.
let pendingLanguage: AppLanguage | null = null;

export function setPendingLanguage(lang: AppLanguage | null) {
  pendingLanguage = lang;
}

export function getPendingLanguage(): AppLanguage | null {
  return pendingLanguage;
}

i18next.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: resolveDeviceLanguage(),
  fallbackLng: 'de',
  interpolation: {
    escapeValue: false,
  },
});

export default i18next;
