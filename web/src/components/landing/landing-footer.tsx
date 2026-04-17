'use client';

import Link from 'next/link';
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';
import { Reveal } from './reveal';
import { useTranslation } from '@/context/i18n-context';

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal animation="fade-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-kezak-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-black">M</span>
                </div>
                <span className="font-bold text-xl tracking-tight">
                  MoJiraX
                </span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                {t('landing.footer_tagline')}
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h5 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">
                {t('landing.footer_nav_title')}
              </h5>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <Link
                    href="#for-who"
                    className="hover:text-white transition-colors"
                  >
                    {t('landing.footer_nav_concept')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#how-it-works"
                    className="hover:text-white transition-colors"
                  >
                    {t('landing.footer_nav_how_it_works')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="hover:text-white transition-colors"
                  >
                    {t('landing.footer_nav_pricing')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#faq"
                    className="hover:text-white transition-colors"
                  >
                    {t('landing.footer_nav_faq')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h5 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">
                {t('landing.footer_legal_title')}
              </h5>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <Link
                    href="#"
                    className="hover:text-white transition-colors"
                  >
                    {t('landing.footer_legal_mentions')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-white transition-colors"
                  >
                    {t('landing.footer_legal_privacy')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-white transition-colors"
                  >
                    {t('landing.footer_legal_terms')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h5 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">
                {t('landing.footer_social_title')}
              </h5>
              <div className="flex gap-3">
                {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:bg-kezak-primary hover:text-white transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            {t('landing.footer_copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
