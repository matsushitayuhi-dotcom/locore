import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import {
  Noto_Sans_JP,
  Noto_Serif_JP,
  Inter,
  Fraunces,
  JetBrains_Mono,
} from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-jp',
  display: 'swap',
});

const notoSerifJp = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-serif-jp',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Locore — 在外邦人がつくる、もう一段深い旅',
    template: '%s | Locore',
  },
  description:
    'Locore は現地で生活するクリエイターが綴る、観光ガイドにはない深い街の物語。映え目当てではなく、その土地の本当の輪郭を持ち帰るための、有料・短尺の旅行誌。',
  applicationName: 'Locore',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0E0E10',
  colorScheme: 'dark',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  const fontVars = [
    notoSansJp.variable,
    notoSerifJp.variable,
    inter.variable,
    fraunces.variable,
    jetbrains.variable,
  ].join(' ');

  return (
    <html lang={locale} className={fontVars}>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteHeader />
          <div className="min-h-[calc(100vh-180px)]">{children}</div>
          <SiteFooter />
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                fontFamily: 'var(--font-sans-jp), var(--font-sans), sans-serif',
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
