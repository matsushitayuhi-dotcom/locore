import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * middleware の責務は 2 つ:
 *
 * 1. 【ボット遮断】robots.txt を無視してスクレイピングする AI / SEO クローラを
 *    User-Agent で判定し、即 403 を返す。これらは Fast Data Transfer (エッジ→
 *    クライアント帯域) を食い潰す主因。403 は ~1KB なので、48KB のページを返す
 *    のに比べて転送量を ~98% 削減できる。NextResponse.next() で素通しする通常
 *    リクエストは Set-Cookie しないため ISR エッジキャッシュはそのまま効く。
 *
 * 2. 【認証】保護パス (/settings, /writer 等) のみ Supabase セッションを refresh
 *    し、未ログインなら /auth/login へリダイレクトする。公開ページは素通しして
 *    キャッシュを最大化する。
 */

// robots.txt を無視しがちで、かつ実トラフィック価値の無いクローラ群。
// 正規の検索エンジン (Googlebot / Bingbot / DuckDuckBot 等) は含めない。
const BLOCKED_UA = [
  /GPTBot/i,
  /ChatGPT-User/i,
  /OAI-SearchBot/i,
  /ClaudeBot/i,
  /Claude-Web/i,
  /anthropic-ai/i,
  /CCBot/i,
  /PerplexityBot/i,
  /Perplexity-User/i,
  /Bytespider/i,
  /Amazonbot/i,
  /Applebot-Extended/i,
  /Diffbot/i,
  /DataForSeoBot/i,
  /MJ12bot/i,
  /AhrefsBot/i,
  /SemrushBot/i,
  /DotBot/i,
  /Meta-ExternalAgent/i,
  /Meta-ExternalFetcher/i,
  /meta-webindexer/i, // ← 実測の主犯 (137K req / 7.49GB)。Meta AI 検索インデクサ
  /webindexer/i,
  /FacebookBot/i,
  /ImagesiftBot/i,
  /Omgili/i,
  /PetalBot/i,
  /Webzio/i,
  /YouBot/i,
  /SeekportBot/i,
  /SerpstatBot/i,
  /MegaIndex/i,
  /BLEXBot/i,
  /ZoominfoBot/i,
  /Scrapy/i,
  /python-requests/i,
  /Go-http-client/i,
  /node-fetch/i,
];

const PROTECTED_PREFIXES = [
  '/settings',
  '/writer',
  '/admin',
  '/library',
  '/become-writer',
  '/purchases',
  '/chat',
  '/auth',
];

export async function middleware(request: NextRequest) {
  // 1. ボット遮断（最優先・最安）
  const ua = request.headers.get('user-agent') ?? '';
  if (ua && BLOCKED_UA.some((re) => re.test(ua))) {
    return new NextResponse('Forbidden', {
      status: 403,
      headers: { 'cache-control': 'private, no-store' },
    });
  }

  // 2. 認証が要るパスだけ Supabase セッション処理。公開ページは素通し
  //    （Set-Cookie しないので ISR エッジキャッシュを保つ）。
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isProtected) {
    return updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 静的アセットを除く全パス。ボット遮断を全ページに効かせるため広めに取るが、
     * 通常リクエストは UA チェック + next() のみで Set-Cookie しないため、
     * 公開ページの ISR エッジキャッシュは維持される。
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff2?)$).*)',
  ],
};
