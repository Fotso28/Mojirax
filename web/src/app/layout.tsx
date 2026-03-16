import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MojiraX | Trouvez votre cofondateur idéal en Afrique",
  description: "Rejoignez la plateforme de référence pour connecter porteurs de projet et cofondateurs en Afrique francophone et dans la diaspora.",
  openGraph: {
    title: "MojiraX | Trouvez votre cofondateur idéal en Afrique",
    description: "Rejoignez la plateforme de référence pour connecter porteurs de projet et cofondateurs en Afrique francophone et dans la diaspora.",
    siteName: "MojiraX",
    locale: "fr_FR",
    type: "website",
  },
};

import { AuthProvider } from "@/context/auth-context";
import { ToastProvider } from "@/context/toast-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
