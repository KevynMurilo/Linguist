import { createContext, useContext, useMemo, useEffect, type ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import en, { type TranslationKey } from './locales/en';
import ptBR from './locales/pt-BR';
import es from './locales/es'; // Importación del nuevo idioma

export type Locale = 'en' | 'pt-BR' | 'es';

export const SUPPORTED_LOCALES = [
  { code: 'en' as Locale, label: 'English', flag: '🇺🇸' },
  { code: 'pt-BR' as Locale, label: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'es' as Locale, label: 'Español', flag: '🇪🇸' },
] as const;

// Map app locale to BCP 47 for Intl APIs (date formatting, etc.)
export const LOCALE_BCP47: Record<Locale, string> = {
  'en': 'en-US',
  'pt-BR': 'pt-BR',
  'es': 'es-ES',
};

const translations: Record<Locale, Record<TranslationKey, string>> = {
  'en': en,
  'pt-BR': ptBR,
  'es': es,
};

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template
  );
}

interface I18nContextValue {
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  // Update <html lang> attribute
  useEffect(() => {
    document.documentElement.lang = LOCALE_BCP47[locale];
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    t: (key, params) => {
      // Intenta obtener la traducción, si no existe usa inglés, si no usa la clave
      const template = translations[locale]?.[key] ?? translations['en'][key] ?? key;
      return interpolate(template, params);
    },
    locale,
    setLocale,
  }), [locale, setLocale]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within TranslationProvider');
  return ctx;
}

export function detectLocale(): Locale {
  const browserLang = navigator.language;
  if (browserLang.startsWith('pt')) return 'pt-BR';
  if (browserLang.startsWith('es')) return 'es';
  return 'en';
}

export type { TranslationKey };