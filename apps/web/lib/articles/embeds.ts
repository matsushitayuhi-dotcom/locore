import { youtubeVideoId } from '@/lib/media/display';
import type { EmbedProvider } from '@/lib/articles/blocks';

/**
 * URL から「リンクカード」か「埋め込み」かと、その種類を判定する（client / server 共用・純粋）。
 * 執筆画面で段落に URL を 1 本貼ったときの自動変換と、表示側の部品選択に使う。
 */

export type UrlKind =
  | { kind: 'article'; id: string }
  | { kind: 'expert'; id: string }
  | { kind: 'embed'; provider: EmbedProvider; videoId?: string }
  | { kind: 'external' };

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function classifyUrl(input: string, siteHost?: string | null): UrlKind | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');
  const path = u.pathname;

  // Locore 内部リンク（本番ドメインか localhost か、相対的に /articles /experts）
  const internal = !siteHost || host === siteHost || host === 'localhost' || host === '127.0.0.1' || host.endsWith('locore.app');
  if (internal) {
    const a = path.match(/^\/articles\/([0-9a-f-]{36})/i);
    if (a && UUID.test(a[1]!)) return { kind: 'article', id: a[1]! };
    const e = path.match(/^\/experts\/([0-9a-f-]{36})/i);
    if (e && UUID.test(e[1]!)) return { kind: 'expert', id: e[1]! };
  }

  const yt = youtubeVideoId(u.toString());
  if (yt) return { kind: 'embed', provider: 'youtube', videoId: yt };
  if (host === 'google.com' && path.startsWith('/maps')) return { kind: 'embed', provider: 'gmap' };
  if (host === 'maps.app.goo.gl' || host === 'goo.gl' && path.startsWith('/maps')) return { kind: 'embed', provider: 'gmap' };
  if (host.endsWith('google.com') && host.startsWith('maps.')) return { kind: 'embed', provider: 'gmap' };
  if ((host === 'x.com' || host === 'twitter.com') && /\/status\/\d+/.test(path)) return { kind: 'embed', provider: 'x' };
  if (host.endsWith('instagram.com') && /^\/(p|reel|reels|tv)\//.test(path)) return { kind: 'embed', provider: 'instagram' };
  if (host.endsWith('tiktok.com') && /\/video\/\d+/.test(path)) return { kind: 'embed', provider: 'tiktok' };
  if (host === 'open.spotify.com') return { kind: 'embed', provider: 'spotify' };
  return { kind: 'external' };
}

/** Google マップの埋め込み URL（クリック後に読む iframe 用）。検索クエリだけ拾って Embed API 不要の形にする */
export function gmapEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url);
    // https://www.google.com/maps/place/<name>/@lat,lng,zoom
    const place = u.pathname.match(/\/maps\/place\/([^/]+)/);
    const q = place ? decodeURIComponent(place[1]!.replace(/\+/g, ' ')) : u.searchParams.get('q') ?? u.searchParams.get('query');
    if (q) return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    const at = u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) return `https://www.google.com/maps?q=${at[1]},${at[2]}&output=embed`;
    return null;
  } catch {
    return null;
  }
}

/** Google マップの表示名（URL の place 部分） */
export function gmapPlaceName(url: string): string | null {
  try {
    const u = new URL(url);
    const place = u.pathname.match(/\/maps\/place\/([^/]+)/);
    if (place) return decodeURIComponent(place[1]!.replace(/\+/g, ' '));
    return u.searchParams.get('q');
  } catch {
    return null;
  }
}

export const EMBED_RATIO: Record<EmbedProvider, string> = {
  youtube: 'aspect-video',
  gmap: 'aspect-[16/10]',
  x: 'aspect-video',
  instagram: 'aspect-square',
  tiktok: 'aspect-[9/12]',
  spotify: 'aspect-[16/6]',
  other: 'aspect-video',
};

export const PROVIDER_LABEL: Record<EmbedProvider, string> = {
  youtube: 'YouTube',
  gmap: 'Google マップ',
  x: 'X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  spotify: 'Spotify',
  other: '埋め込み',
};
