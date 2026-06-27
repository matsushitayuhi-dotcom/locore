import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 【改修中の全サイトゲート 2026-06】
 * サイト全体をログイン必須にしている。ログイン前にアクセスできる公開パスは
 * 認証画面 (/auth/*) のみ。一般公開を再開するときは、ここを元の限定リスト
 * （/settings, /writer, /admin, /library, /become-writer）に戻し、下の
 * isProtected 判定も「そのリストに含まれるか」に戻すこと。
 */
const PUBLIC_PREFIXES = ['/auth'];

/**
 * Supabase セッションを refresh しつつ、認証必須パスへのアクセスを保護する。
 * `middleware.ts` から呼ばれる。
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 環境変数が未設定でもクラッシュさせず、保護を skip する（dev 用）。
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  // セッション refresh（auth.getUser() を呼ぶことで Cookie が refresh される）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 認証チェック（改修中は /auth 以外すべて要ログイン）
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isProtected = !isPublic;

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.searchParams.set('redirect_to', pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
