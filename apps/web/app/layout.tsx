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
import { BottomNav } from '../components/BottomNav';
import { getMyUnreadChatSummary } from '@/lib/chat/unread';
import { getViewerMode, homePathFor } from '@/lib/mode/cookie';

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
  manifest: '/manifest.webmanifest',
  // ファビコン / アプリアイコン。public/ に同名ファイルがあれば自動配信される
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    siteName: 'Locore',
    title: 'Locore — 在外邦人がつくる、もう一段深い旅',
    description:
      '現地に住むクリエイターが書く、観光ガイドにはない街の物語。短尺の有料旅行誌。',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Locore',
      },
    ],
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Locore',
    description:
      '現地に住むクリエイターが書く、観光ガイドにはない街の物語。',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Editorial Light のクリーム背景。スマホでアドレスバー色が揃う
  themeColor: '#FAF5EB',
  colorScheme: 'light',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const unread = await getMyUnreadChatSummary();
  // モード別ホーム遷移先（駐在員 → /expat、旅行者・未選択 → /explore）
  const viewerMode = getViewerMode();
  const homeHref = homePathFor(viewerMode ?? 'traveler');

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
          {/* モバイルは BottomNav 分の余白を確保（pb-20）。md 以上では不要 */}
          <div className="min-h-[calc(100vh-180px)] pb-20 md:pb-0">
            {children}
          </div>
          <SiteFooter />
          <BottomNav unreadChatCount={unread.count} homeHref={homeHref} />
          <Toaster
            position="bottom-center"
            offset={80}
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
