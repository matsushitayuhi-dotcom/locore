import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getMyUnreadChatSummary } from '@/lib/chat/unread';

/**
 * GET /api/me — 現在のログイン状態サマリ（クライアント側ヘッダー用）。
 *
 * 【目的】ルートレイアウト / ヘッダーから cookie 読み取りを完全に排除し、
 * 公開ページ (/jobs, /services, /articles ...) を Vercel Edge Cache (ISR)
 * でキャッシュ可能にするため。個人化された部分はブラウザがこのエンドポイントを
 * 叩いて後追いでハイドレートする。
 *
 * - クローラは JS を実行しないのでこのルートを叩かない → Origin 課金に効かない
 * - 認証必須なので no-store。CDN には絶対キャッシュさせない
 * - auth.getUser() がセッション cookie を refresh するので、middleware を
 *   公開ページから外しても、ログインユーザーのセッション更新はここで担保される
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { user: null, unreadChatCount: 0, isWriter: false },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  }

  const unread = await getMyUnreadChatSummary();
  const isWriter = user.role === 'resident_writer' || user.role === 'editor';

  return NextResponse.json(
    {
      user: {
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      unreadChatCount: unread.count,
      isWriter,
    },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
