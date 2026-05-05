import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

// 後で @locore/ui のグローバルプロバイダを使う場合のためのプレースホルダ:
// import { UIProvider } from '@locore/ui';

export const metadata: Metadata = {
  title: {
    default: 'Locore',
    template: '%s | Locore',
  },
  description: '在外邦人がつくる、もう一段深い旅。',
  applicationName: 'Locore',
  // OGP 等は実装スプリントで追加
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/* <UIProvider> */}
          {children}
          {/* </UIProvider> */}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
