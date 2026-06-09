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
     * 認証必須パス + 認証フロー + モード切替を含むユーザ操作系のみ。
     *
     * 公開一覧ページ (/jobs, /apartments, /services, /articles, /explore など) は
     * Vercel Edge Cache (ISR) をフル活用させるため middleware から除外する。
     * これらに middleware を通すと:
     *   1) auth.getUser() 経由で Supabase へ毎リクエスト問い合わせ
     *   2) locore_mode cookie の Set-Cookie で Edge Cache が完全バイパス
     * → revalidate=300 が機能せず、Origin Data Transfer が爆発する。
     *
     * モード同期は Server Component 側の cookies() / 各ページの Layout で
     * 処理する（Set-Cookie は ServerAction や ModeToggle クリック時にだけ発火）。
     */
    '/settings/:path*',
    '/writer/:path*',
    '/admin/:path*',
    '/library/:path*',
    '/become-writer/:path*',
    '/purchases/:path*',
    '/chat/:path*',
    '/auth/:path*',
    // 各 Server Component の requireUser() / createServerClient() で
    // 個別に認証チェックする方針。cron / webhook / 公開 API は
    // それぞれ独自のチェックを持つので middleware は不要。
  ],
};
