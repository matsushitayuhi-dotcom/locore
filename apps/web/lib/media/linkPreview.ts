import 'server-only';
import { detectKind, youtubeVideoId, type LinkKind } from '@/lib/media/display';

/**
 * 外部リンクのプレビュー（タイトル・説明・画像・サイト名）をサーバー側で 1 回取得する。0088。
 *
 * 取得手段（docs/experts-media-display-research.md §2）:
 *   - YouTube 動画: youtube.com/oembed（無認証）でタイトル、サムネは i.ytimg.com/vi/{id}/hqdefault.jpg
 *   - X の投稿:    publish.twitter.com/oembed（無認証）
 *   - TikTok:      tiktok.com/oembed（無認証）
 *   - Spotify:     open.spotify.com/oembed（無認証）
 *   - それ以外:    HTML を取得して og:* / twitter:* を解析（自前・依存なし）
 *   Instagram / Threads / Facebook は Meta の App 審査が要るため OG 解析のみ試み、失敗は許容する。
 *
 * 安全策: http(s) 以外・localhost / プライベート IP は拒否。6 秒タイムアウト、本文 1MB まで。
 * 失敗しても保存は続行できる（title 手入力・display は button に落ちる）。
 */

export type LinkPreview = {
  kind: LinkKind;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  status: 'ok' | 'failed';
};

const UA =
  'Mozilla/5.0 (compatible; LocoreLinkPreview/1.0; +https://locore.app) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const TIMEOUT_MS = 6000;
const MAX_BYTES = 1_000_000;

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === '::1' || h === '0.0.0.0') return true;
  if (/^127\.|^10\.|^192\.168\.|^169\.254\.|^0\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(h) || /^fe80:/i.test(h)) return true;
  return false;
}

function safeUrl(input: string): URL | null {
  try {
    const u = new URL(input);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (isBlockedHost(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

async function fetchWithLimit(url: string, accept: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept, 'accept-language': 'ja,en;q=0.8' },
      redirect: 'follow',
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
        if (total >= MAX_BYTES) break;
      }
    }
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      buf.set(c.subarray(0, Math.min(c.byteLength, total - off)), off);
      off += c.byteLength;
      if (off >= total) break;
    }
    return new TextDecoder('utf-8').decode(buf);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .trim();
}

/** <meta property|name="key" content="..."> を順不同で拾う（自前・依存なし） */
function metaContent(html: string, keys: string[]): string | null {
  const head = html.slice(0, 300_000);
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`,
      'i',
    );
    const tag = head.match(re)?.[0];
    if (!tag) continue;
    const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
    if (content && content.trim()) return decodeEntities(content);
  }
  return null;
}

function titleTag(html: string): string | null {
  const m = html.slice(0, 300_000).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]!.replace(/\s+/g, ' ')) : null;
}

function absolutize(base: URL, maybe: string | null): string | null {
  if (!maybe) return null;
  try {
    const u = new URL(maybe, base);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

async function oembed(endpoint: string, url: string): Promise<Record<string, unknown> | null> {
  const text = await fetchWithLimit(
    `${endpoint}?format=json&url=${encodeURIComponent(url)}`,
    'application/json',
  );
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function failed(kind: LinkKind): LinkPreview {
  return { kind, title: null, description: null, imageUrl: null, siteName: null, status: 'failed' };
}

export async function fetchLinkPreview(platform: string, rawUrl: string): Promise<LinkPreview> {
  const kind = detectKind(platform, rawUrl);
  if (platform === 'email') return { ...failed(kind), status: 'ok' };
  const u = safeUrl(rawUrl);
  if (!u) return failed(kind);
  const host = u.hostname.replace(/^www\.|^m\./, '');

  // ---- YouTube 動画: oEmbed（タイトル）＋ 常に存在する hqdefault サムネ ----
  const ytId = youtubeVideoId(u.toString());
  if (ytId) {
    const o = await oembed('https://www.youtube.com/oembed', u.toString());
    return {
      kind: 'video',
      title: str(o?.title),
      description: str(o?.author_name) ? `${str(o?.author_name)} のチャンネル` : null,
      imageUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
      siteName: 'YouTube',
      status: o ? 'ok' : 'ok', // サムネは取れるので ok 扱い
    };
  }

  // ---- X の投稿 / TikTok / Spotify: oEmbed（無認証） ----
  if ((host === 'x.com' || host === 'twitter.com') && kind === 'post') {
    const o = await oembed('https://publish.twitter.com/oembed', u.toString());
    if (o) {
      const html = str(o.html) ?? '';
      const text = decodeEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).slice(0, 200);
      return { kind, title: text || str(o.author_name), description: null, imageUrl: null, siteName: 'X', status: 'ok' };
    }
  }
  if (host.endsWith('tiktok.com') && kind === 'video') {
    const o = await oembed('https://www.tiktok.com/oembed', u.toString());
    if (o) {
      return {
        kind,
        title: str(o.title) ?? str(o.author_name),
        description: str(o.author_name),
        imageUrl: str(o.thumbnail_url),
        siteName: 'TikTok',
        status: 'ok',
      };
    }
  }
  if (host === 'open.spotify.com') {
    const o = await oembed('https://open.spotify.com/oembed', u.toString());
    if (o) {
      return { kind: 'podcast', title: str(o.title), description: null, imageUrl: str(o.thumbnail_url), siteName: 'Spotify', status: 'ok' };
    }
  }

  // ---- 一般: OG / Twitter Card を解析 ----
  const html = await fetchWithLimit(u.toString(), 'text/html,application/xhtml+xml');
  if (!html) return failed(kind);
  const title = metaContent(html, ['og:title', 'twitter:title']) ?? titleTag(html);
  const description = metaContent(html, ['og:description', 'twitter:description', 'description']);
  const imageUrl = absolutize(u, metaContent(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']));
  const siteName = metaContent(html, ['og:site_name']) ?? host;
  if (!title && !imageUrl) return failed(kind);
  return {
    kind,
    title: title ? title.slice(0, 160) : null,
    description: description ? description.slice(0, 300) : null,
    imageUrl,
    siteName: siteName ? siteName.slice(0, 80) : null,
    status: 'ok',
  };
}
