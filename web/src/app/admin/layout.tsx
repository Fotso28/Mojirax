'use client';

import { useAuth } from '@/context/auth-context';
import { useTranslation } from '@/context/i18n-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Shield,
  CreditCard,
  ScrollText,
  Megaphone,
  Briefcase,
  Brain,
  Tags,
  HelpCircle,
  Quote,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';

const adminNavKeys = [
  { href: '/admin', labelKey: 'admin.nav_dashboard', icon: LayoutDashboard },
  { href: '/admin/projects', labelKey: 'admin.nav_projects', icon: Briefcase },
  { href: '/admin/users', labelKey: 'admin.nav_users', icon: Users },
  { href: '/admin/moderation', labelKey: 'admin.nav_moderation', icon: Shield },
  { href: '/admin/tarifs', labelKey: 'admin.nav_tarifs', icon: Tags },
  { href: '/admin/faq', labelKey: 'admin.nav_faq', icon: HelpCircle },
  { href: '/admin/temoignages', labelKey: 'admin.nav_testimonials', icon: Quote },
  { href: '/admin/ads', labelKey: 'admin.nav_ads', icon: Megaphone },
  { href: '/admin/ai', labelKey: 'admin.nav_ai', icon: Brain },
  { href: '/admin/transactions', labelKey: 'admin.nav_transactions', icon: CreditCard },
  { href: '/admin/logs', labelKey: 'admin.nav_logs', icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { dbUser, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && dbUser?.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [dbUser, loading, router]);

  // Fermer le drawer quand on navigue
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Fermer avec Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setDrawerOpen(false);
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [drawerOpen, handleKeyDown]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-kezak-primary/30 border-t-kezak-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (dbUser?.role !== 'ADMIN') {
    return null;
  }

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-kezak-dark truncate">{t('admin.admin_title')}</h1>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{dbUser?.name || dbUser?.email}</p>
        </div>
        {/* Bouton fermer visible uniquement sur mobile */}
        <button
          onClick={() => setDrawerOpen(false)}
          className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {adminNavKeys.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-kezak-primary/10 text-kezak-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5 flex-shrink-0" />
          <span className="truncate">{t('admin.back_to_site')}</span>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-100 flex items-center h-14 px-4">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="ms-3 text-sm font-bold text-kezak-dark truncate">{t('admin.admin_title')}</h1>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-40 w-[280px] bg-white border-r border-gray-100 flex flex-col transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col fixed inset-y-0 left-0 z-10">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="md:ml-64 pt-14 md:pt-0 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
