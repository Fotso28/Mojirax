import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'pt', 'ar'] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number];
const LOCALE_COOKIE = 'mojirax-lang';

const METADATA_BY_LOCALE: Record<SupportedLocale, { title: string; description: string; ogLocale: string }> = {
  fr: {
    title: "MojiraX | Trouvez votre cofondateur idéal en Afrique",
    description: "Rejoignez la plateforme de référence pour connecter porteurs de projet et cofondateurs en Afrique francophone et dans la diaspora.",
    ogLocale: "fr_FR",
  },
  en: {
    title: "MojiraX | Find your ideal co-founder in Africa",
    description: "Join the leading platform connecting project leaders and co-founders across Africa and the diaspora.",
    ogLocale: "en_US",
  },
  es: {
    title: "MojiraX | Encuentra tu cofundador ideal en África",
    description: "Únete a la plataforma de referencia que conecta a emprendedores y cofundadores en África y la diáspora.",
    ogLocale: "es_ES",
  },
  pt: {
    title: "MojiraX | Encontre seu cofundador ideal na África",
    description: "Junte-se à plataforma de referência que conecta empreendedores e cofundadores em África e na diáspora.",
    ogLocale: "pt_BR",
  },
  ar: {
    title: "MojiraX | اعثر على شريكك المؤسس المثالي في أفريقيا",
    description: "انضم إلى المنصة الرائدة التي تربط قادة المشاريع بالشركاء المؤسسين في أفريقيا والمغتربين.",
    ogLocale: "ar",
  },
};

async function resolveLocale(): Promise<SupportedLocale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
    return raw as SupportedLocale;
  }
  return 'fr';
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const m = METADATA_BY_LOCALE[locale];
  return {
    title: m.title,
    description: m.description,
    openGraph: {
      title: m.title,
      description: m.description,
      siteName: "MojiraX",
      locale: m.ogLocale,
      type: "website",
    },
  };
}

import { AuthProvider } from "@/context/auth-context";
import { ToastProvider } from "@/context/toast-context";
import { I18nProvider } from "@/context/i18n-context";
import { UpsellProvider } from "@/context/upsell-context";
import { HtmlLangUpdater } from "@/components/layout/html-lang-updater";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await resolveLocale();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <I18nProvider>
          <HtmlLangUpdater />
          <AuthProvider>
            <ToastProvider>
              <UpsellProvider>
                {children}
              </UpsellProvider>
            </ToastProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
