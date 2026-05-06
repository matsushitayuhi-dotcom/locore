import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * OAuth / Magic Link / メール確認 コールバックハンドラ。
 *
 * - `?code=...` を受け取り、`exchangeCodeForSession` でセッション化
 * - `redirect_to` クエリで指定された相対パスにリダイレクト（無ければトップ）
 * - エラー時は `/auth/login?error=oauth` へ
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const redirectToRaw = searchParams.get('redirect_to') ?? '/';
  const safeRedirect =
    redirectToRaw.startsWith('/') && !redirectToRaw.startsWith('//')
      ? redirectToRaw
      : '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth`);
  }

  return NextResponse.redirect(`${origin}${safeRedirect}`);
}
