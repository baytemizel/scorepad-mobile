// Polyfill Intl.PluralRules for Hermes — must come before i18next import.
// Required by `compatibilityJSON: 'v4'` plural format used below, otherwise
// i18next falls back to v3 rules and warns at runtime.
import 'intl-pluralrules';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

import en from './locales/en.json';
import tr from './locales/tr.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import sr from './locales/sr.json';
import el from './locales/el.json';
import ru from './locales/ru.json';
import et from './locales/et.json';
import sv from './locales/sv.json';
import fi from './locales/fi.json';
import ar from './locales/ar.json';
import he from './locales/he.json';

export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'sr', label: 'Српски' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'ru', label: 'Русский' },
  { code: 'et', label: 'Eesti' },
  { code: 'sv', label: 'Svenska' },
  { code: 'fi', label: 'Suomi' },
  { code: 'ar', label: 'العربية' },
  { code: 'he', label: 'עברית' },
] as const;

export const rtlLanguages = new Set(['ar', 'he']);

const resources = {
  en: { translation: en },
  tr: { translation: tr },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  it: { translation: it },
  pt: { translation: pt },
  sr: { translation: sr },
  el: { translation: el },
  ru: { translation: ru },
  et: { translation: et },
  sv: { translation: sv },
  fi: { translation: fi },
  ar: { translation: ar },
  he: { translation: he },
};

const fallbackLng = 'en';

const detectInitialLanguage = (): string => {
  const locales = Localization.getLocales();
  const top = locales[0];
  if (!top?.languageCode) return fallbackLng;
  if (top.languageCode in resources) return top.languageCode;
  return fallbackLng;
};

void i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng,
    lng: detectInitialLanguage(),
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: 'v4',
  });

export function applyRtl(language: string): void {
  const shouldBeRtl = rtlLanguages.has(language);
  if (I18nManager.isRTL !== shouldBeRtl) {
    I18nManager.allowRTL(shouldBeRtl);
    I18nManager.forceRTL(shouldBeRtl);
    // Note: full effect requires app restart. We expose this via settings UX.
  }
}

export async function changeLanguage(lng: string): Promise<void> {
  await i18n.changeLanguage(lng);
  applyRtl(lng);
}

export default i18n;
