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
 * URL から「このページがどちらのモードに属するか」を推定。
 * ヘッダの ModeToggle と画面の不整合 (旅行者ボタン active なのに /expat 画面)
 * を防ぐため、middleware で cookie を自動同期する。
 *
 * - resident 系: /expat, /jobs, /apartments, /marketplace, /groups,
 *                /lessons, /help, /board
 * - traveler 系: /explore, /region, /world, /articles, /map, /trips, /search
 * - 中立: /, /settings, /admin, /writer, /chat, /auth, /legal, /residents,
 *         /writers, /purchases, /library, /calendar, /founders, /about,
 *         /contact, /become-writer, /preview, /report, /country
 *   → cookie の現在値を尊重 (上書きしない)
 */
const RESIDENT_PREFIXES = [
  '/expat',
  '/jobs',
  '/apartments',
  '/marketplace',
  '/groups',
  '/lessons',
  '/help',
  '/board',
];
const TRAVELER_PREFIXES = [
  '/explore',
  '/region',
  '/world',
  '/articles',
  '/map',
  '/trips',
];

function inferModeFromPath(pathname: string): 'traveler' | 'resident' | null {
  if (
    RESIDENT_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    return 'resident';
  }
  if (
    TRAVELER_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    return 'traveler';
  }
  return null;
}

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

  // URL に応じてモード cookie を自動同期。
  // /expat 系を開いたら resident、/explore 系を開いたら traveler に揃える。
  // これでヘッダの ModeToggle と画面が常に一致する。
  const inferredMode = inferModeFromPath(pathname);
  if (inferredMode) {
    const currentMode = request.cookies.get('locore_mode')?.value;
    if (currentMode !== inferredMode) {
      response.cookies.set('locore_mode', inferredMode, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: false, // SideMenu の Client から読みたい
        sameSite: 'lax',
        path: '/',
      });
    }
  }

  return response;
}
