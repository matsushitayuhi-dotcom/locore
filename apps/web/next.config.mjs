import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // ワークスペース内部パッケージをトランスパイル対象にする
  transpilePackages: ['@locore/shared', '@locore/api-contracts'],

  experimental: {
    // Server Actions / Server Components 周りは Next.js 14 のデフォルトで OK
    typedRoutes: false,
  },

  images: {
    // R2 / Cloudflare Images / Supabase ストレージ等を許可（Phase 1 のプレースホルダ）
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'imagedelivery.net' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // PWA 準備：next-pwa は M0 後半で正式導入。今はヘッダだけ。
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
