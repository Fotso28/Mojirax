'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation, Locale } from '@/context/i18n-context';

const LANGUAGES: { code: Locale; flag: string; label: string }[] = [
  { code: 'fr', flag: '\u{1F1EB}\u{1F1F7}', label: 'FR' },
  { code: 'en', flag: '\u{1F1EC}\u{1F1E7}', label: 'EN' },
  { code: 'es', flag: '\u{1F1EA}\u{1F1F8}', label: 'ES' },
  { code: 'pt', flag: '\u{1F1E7}\u{1F1F7}', label: 'PT' },
  { code: 'ar', flag: '\u{1F1F8}\u{1F1E6}', label: 'AR' },
];

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 h-[36px] px-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        aria-label="Changer la langue"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLocale(lang.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                locale === lang.code
                  ? 'bg-kezak-light text-kezak-primary font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span>{
                lang.code === 'fr' ? 'Fran\u00e7ais' :
                lang.code === 'en' ? 'English' :
                lang.code === 'es' ? 'Espa\u00f1ol' :
                lang.code === 'pt' ? 'Portugu\u00eas' :
                '\u0627\u0644\u0639\u0631\u0628\u064A\u0629'
              }</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
