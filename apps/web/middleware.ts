import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * 全リクエストで Supabase セッションを refresh し、
 * 認証必須パス（/settings, /writer, /admin, /library, /become-writer）を保護する。
 * 静的アセット系は config.matcher で除外する。
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 以下を除く全パス:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico, robots.txt, sitemap.xml
     * - 画像系拡張子
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
};
