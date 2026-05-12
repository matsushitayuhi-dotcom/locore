import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * OAuth / Magic Link / メール確認 コールバックハンドラ。
 *
 * - `?code=...` を受け取り、`exchangeCodeForSession` でセッション化
 * - `redirect_to` クエリで指定された相対パスにリダイレクト（無ければトップ）
 * - エラー時は `/auth/login?error=oauth` へ
 *
 * Supabase のメールテンプレートが古い形式で `?token_hash=...&type=signup` を送ってくる
 * ケースに備え、その場合は `verifyOtp` を使って交換する。
 *
 * 404 ハマり対策: コード無し / トークン無しでこのハンドラに着地したら、
 * ログインへ戻すのではなく確認待ち画面へ流す（メールを再送する導線）。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type'); // 'signup' | 'recovery' | 'magiclink' | 'email_change' | ...
  const redirectToRaw = searchParams.get('redirect_to') ?? '/';
  const safeRedirect =
    redirectToRaw.startsWith('/') && !redirectToRaw.startsWith('//')
      ? redirectToRaw
      : '/';

  const supabase = createSupabaseServerClient();

  // 1. PKCE フロー（新型）: ?code=... を session に交換
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=oauth_${encodeURIComponent(error.message)}`,
      );
    }
    return NextResponse.redirect(`${origin}${safeRedirect}`);
  }

  // 2. メールテンプレート旧形式: ?token_hash=...&type=signup
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: type as any,
    });
    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=verify_${encodeURIComponent(error.message)}`,
      );
    }
    return NextResponse.redirect(`${origin}${safeRedirect}`);
  }

  // 3. パラメータなしで着地 → 確認待ち画面に出す（404 を避ける）
  return NextResponse.redirect(`${origin}/auth/verify`);
}
