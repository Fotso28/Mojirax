'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';

export type Locale = 'fr' | 'en' | 'es' | 'pt' | 'ar';

const STORAGE_KEY = 'mojirax-lang';
const SUPPORTED_LOCALES: Locale[] = ['fr', 'en', 'es', 'pt', 'ar'];
const DEFAULT_LOCALE: Locale = 'fr';

type Translations = Record<string, Record<string, string>>;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key: string) => key,
});

// Namespace files to load
const NAMESPACES = ['common', 'auth', 'dashboard', 'admin', 'project', 'landing'];

function detectLocale(): Locale {
  // Server-side: return default
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
    return stored as Locale;
  }

  // Fall back to cookie (set by another device / server pre-render)
  const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${STORAGE_KEY}=([^;]+)`));
  const cookieLocale = cookieMatch?.[1];
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // Detect from navigator
  const browserLang = navigator.language?.slice(0, 2)?.toLowerCase();
  if (browserLang && SUPPORTED_LOCALES.includes(browserLang as Locale)) {
    return browserLang as Locale;
  }

  return DEFAULT_LOCALE;
}

async function loadTranslations(locale: Locale): Promise<Translations> {
  const translations: Translations = {};

  await Promise.all(
    NAMESPACES.map(async (ns) => {
      try {
        const mod = await import(`@/messages/${locale}/${ns}.json`);
        translations[ns] = mod.default || mod;
      } catch {
        translations[ns] = {};
      }
    })
  );

  return translations;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [translations, setTranslations] = useState<Translations>({});
  const [mounted, setMounted] = useState(false);

  // Initialize locale from localStorage/navigator on mount
  useEffect(() => {
    const detected = detectLocale();
    setLocaleState(detected);
    setMounted(true);
  }, []);

  // Load translations when locale changes
  useEffect(() => {
    if (!mounted) return;
    loadTranslations(locale).then(setTranslations);
  }, [locale, mounted]);

  const setLocale = useCallback((newLocale: Locale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
      // Cookie mirrors localStorage so the server-side RootLayout can
      // set <html lang/dir> and localized metadata on the first render.
      // 1 year expiry, path=/ so every route sees it.
      document.cookie = `${STORAGE_KEY}=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // key format: "namespace.dotted.path" — first segment is namespace
      const dotIndex = key.indexOf('.');
      if (dotIndex === -1) return key;

      const namespace = key.slice(0, dotIndex);
      const translationKey = key.slice(dotIndex + 1);

      const nsTranslations = translations[namespace];
      if (!nsTranslations) return key;

      // Support nested keys via dot notation in the JSON (flat keys like "sidebar.title")
      let value = nsTranslations[translationKey];

      // If not found with flat key, try nested object traversal
      if (value === undefined) {
        const parts = translationKey.split('.');
        let current: unknown = nsTranslations;
        for (const part of parts) {
          if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
            current = (current as Record<string, unknown>)[part];
          } else {
            return key; // Key not found
          }
        }
        if (typeof current === 'string') {
          value = current;
        } else {
          return key;
        }
      }

      // Interpolation: replace {{param}} with values
      if (params) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
          return params[paramKey] !== undefined ? String(params[paramKey]) : `{{${paramKey}}}`;
        });
      }

      return value;
    },
    [translations]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access translation function and locale
 */
export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}

/**
 * Hook to access just the current locale
 */
export function useLocale(): Locale {
  const { locale } = useContext(I18nContext);
  return locale;
}
