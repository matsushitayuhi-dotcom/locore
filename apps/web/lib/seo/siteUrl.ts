/**
 * サイトの正規オリジン（canonical / OG / sitemap / JSON-LD の絶対 URL 基準）。
 *
 * NEXT_PUBLIC_SITE_URL の末尾スラッシュを落とし、未設定なら本番ドメインに解決する。
 * server / client どちらからも使える純関数（NEXT_PUBLIC_ なのでビルド時に inline される）。
 */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://locore.app'
  );
}
