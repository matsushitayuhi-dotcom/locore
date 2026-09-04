import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import {
  Noto_Sans_JP,
  Inter,
  JetBrains_Mono,
} from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import jaMessages from '../messages/ja.json';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { BottomNav } from '../components/BottomNav';
import { HeaderShell } from '../components/HeaderShell';
import { ViewerProvider } from '../components/viewer/ViewerProvider';
import { getSiteUrl } from '../lib/seo/siteUrl';

/**
 * 【2026-06 キャッシュ改修】
 * 以前はここで getLocale()/getMessages()/getViewerMode()/getMyUnreadChatSummary()
 * を呼んでおり、これらが request の cookie/header を読むためルートレイアウト
 * （＝全ページ）が動的レンダリング扱いになり、Vercel Edge Cache が 0% だった。
 * → /jobs 等の公開ページで revalidate を書いても無視され Origin Data Transfer 暴騰。
 *
 * 対策:
 *   - locale / messages は静的化（Phase 1 は ja 固定なので request 読み取り不要）
 *   - 認証 / 未読 / モードは ViewerProvider (client, /api/me) に委譲
 * これでレイアウトが完全に静的になり、配下の公開ページがキャッシュ可能になる。
 */
const LOCALE = 'ja';

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-jp',
  display: 'swap',
});

// 明朝系フォント (Noto_Serif_JP / Fraunces) は 2026-05 改修で完全撤去。
// ロゴ・本文・タイトル全て sans に統一。読み込みもしないことで初回フォント
// ペイロードを ~120KB 削減 + flash-of-serif を完全に防ぐ。

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

// OG画像・canonical 等の相対 URL 解決基準。未設定環境は本番ドメインに解決。
// NEXT_PUBLIC_SITE_URL がスキーム無し等の不正値でも new URL() で全ページを
// 落とさないよう、パースできないときは本番ドメインにフォールバックする。
function resolveMetadataBase(): URL {
  try {
    return new URL(getSiteUrl());
  } catch {
    return new URL('https://locore.app');
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: 'Locore — 現地に住む日本人に、30分だけ相談できる',
    template: '%s | Locore',
  },
  description:
    '移住、留学、駐在準備、こだわりの旅行。ガイドブックにも検索にも出てこない「実際のところ」を、居住認証済みの海外在住日本人にオンラインで直接相談できます。',
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
    title: 'Locore — 現地に住む日本人に、30分だけ相談できる',
    description:
      '居住認証済みの海外在住日本人に、移住・留学・駐在準備・旅行の「実際のところ」をオンラインで直接相談。30分 ¥3,000〜。',
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
    title: 'Locore — 現地に住む日本人に、30分だけ相談できる',
    description:
      '居住認証済みの海外在住日本人に、暮らしの「実際のところ」をオンラインで相談。',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 白基調化（2026-09）: 地色 #FFFFFF に合わせてアドレスバー色も白に
  themeColor: '#FFFFFF',
  colorScheme: 'light',
  // iOS の safe-area inset を有効化する (BottomNav / ヘッダがノッチ / ホームバー
  // と被らないように env(safe-area-inset-*) を実際に値あり化する)
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontVars = [
    notoSansJp.variable,
    inter.variable,
    jetbrains.variable,
  ].join(' ');

  return (
    <html lang={LOCALE} className={fontVars}>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <NextIntlClientProvider locale={LOCALE} messages={jaMessages}>
          {/* 認証 / 未読 / モードはここで一括取得し、ヘッダー・BottomNav に供給。
              cookie 読み取りはクライアント (/api/me) に閉じ込め、レイアウト自体は
              完全に静的に保つことで公開ページの Edge Cache を有効化する。 */}
          <ViewerProvider>
            {/* HeaderShell が sticky / scroll-collapse / safe-area-top を担当 */}
            <HeaderShell>
              <SiteHeader />
            </HeaderShell>
            {/* モバイルは BottomNav (h-14) + safe-area-inset-bottom 分の余白を確保。
                max-w-full + overflow-x-hidden で意図しない横スクロールを最終遮断。
                md+ は BottomNav が消えるので padding 不要 (.app-main-pad 内で分岐)。 */}
            <div className="app-main-pad min-h-[calc(100vh-180px)] max-w-full overflow-x-hidden">
              {children}
            </div>
            <SiteFooter />
            <BottomNav />
          </ViewerProvider>
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
