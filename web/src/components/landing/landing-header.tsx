'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';
import { LanguageToggle } from '@/components/ui/language-toggle';

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();

  const navLinks = [
    { label: t('landing.nav_concept'), href: '#for-who' },
    { label: t('landing.nav_how_it_works'), href: '#how-it-works' },
    { label: t('landing.nav_pricing'), href: '#pricing' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-kezak-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-lg">M</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">
            MoJiraX
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 hover:text-kezak-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageToggle />
          <Link
            href="/login"
            className="h-10 px-5 rounded-lg text-gray-600 font-medium text-sm flex items-center hover:bg-gray-50 transition-all duration-200"
          >
            {t('landing.nav_login')}
          </Link>
          <Link
            href="/login"
            className="h-10 px-5 rounded-lg bg-kezak-primary text-white font-semibold text-sm flex items-center hover:bg-kezak-dark transition-all duration-200"
          >
            {t('landing.nav_create_profile')}
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-gray-600"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-gray-600 py-2"
            >
              {link.label}
            </a>
          ))}
          <div className="flex items-center justify-center py-2">
            <LanguageToggle />
          </div>
          <div className="flex gap-3 pt-2">
            <Link
              href="/login"
              className="flex-1 h-10 rounded-lg border border-gray-200 text-gray-600 font-medium text-sm flex items-center justify-center"
            >
              {t('landing.nav_login')}
            </Link>
            <Link
              href="/login"
              className="flex-1 h-10 rounded-lg bg-kezak-primary text-white font-semibold text-sm flex items-center justify-center"
            >
              {t('landing.nav_create_profile')}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
