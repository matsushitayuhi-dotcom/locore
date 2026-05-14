import type { MetadataRoute } from 'next';

/**
 * PWA マニフェスト。
 *
 * 配信先: GET /manifest.webmanifest
 *
 * これにより:
 *   - iOS Safari の「ホーム画面に追加」で apple-touch-icon が使われる
 *   - Android Chrome の「アプリをインストール」プロンプトで icon-512 が使われる
 *   - ホームから起動したときは standalone（アドレスバー無し）で開く
 *
 * 画像ファイルは public/ に置いてください（README-logo.md 参照）。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Locore — 在外邦人がつくる、もう一段深い旅',
    short_name: 'Locore',
    description:
      '現地に住むクリエイターが書く、観光ガイドにはない街の物語。短尺の有料旅行誌。',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF5EB',
    theme_color: '#FAF5EB',
    lang: 'ja',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        // PWA インストール時の「マスク可能」アイコン（角丸でクリップされる用）
        purpose: 'maskable',
      },
    ],
  };
}
