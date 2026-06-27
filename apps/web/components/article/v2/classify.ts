import type { Article, Spot } from '@/lib/mock';

/**
 * Phase A（表示の刷新・非破壊）— 新レンダラのタイプ自動判定。
 *
 * docs/editor-spec.md の「入口2択」に従う:
 *   - モデルコース  = article_type === 'itinerary'
 *   - ブログ        = それ以外（spot_guide / expat_info / photo_journal）
 *       - 場所あり（spots.length > 0）→ place-guide
 *       - 場所なし（spots.length === 0）→ essay
 *
 * 内部 type は将来 itinerary | standard の2分岐に寄せる想定だが、現行 DB の
 * article_type enum（4値）はそのままに、判定だけ2択へマッピングする。
 */
export type RenderKind = 'itinerary' | 'place-guide' | 'essay';

export function classifyArticle(article: Article, spots: Spot[]): RenderKind {
  if (article.articleType === 'itinerary') return 'itinerary';
  return spots.length > 0 ? 'place-guide' : 'essay';
}

/** 判定タイプの日本語ラベル（一覧バッジ用）。 */
export const RENDER_KIND_LABEL: Record<RenderKind, string> = {
  itinerary: 'モデルコース',
  'place-guide': 'ブログ・場所あり',
  essay: 'ブログ・場所なし',
};

/** 外部動画（article_videos）の 1 行。プレビュー用に最小フィールドだけ持つ。 */
export type ArticleVideoRow = {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'x' | 'other';
  embedUrl: string;
  position: number;
};

/**
 * article_videos.embed_url を <iframe src> として使える埋め込み URL に正規化する。
 *
 * - YouTube（watch?v= / youtu.be / shorts / embed）→ youtube-nocookie の /embed/<id>
 * - Vimeo（vimeo.com/<id>）→ player.vimeo.com/video/<id>
 * - それ以外（TikTok / IG / X 等）は確実な埋め込み URL を組めないため null を返し、
 *   呼び出し側で「元動画を開く」リンクにフォールバックする。
 *
 * モック essay と同様、16:9 中央のフレームに収める前提。
 */
export function toVideoEmbedSrc(embedUrl: string): string | null {
  const url = (embedUrl ?? '').trim();
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    // すでに埋め込み URL の場合はそのまま通す
    if (
      host === 'youtube-nocookie.com' ||
      (host === 'youtube.com' && u.pathname.startsWith('/embed/')) ||
      (host === 'player.vimeo.com' && u.pathname.startsWith('/video/'))
    ) {
      return url;
    }

    // YouTube
    if (host === 'youtube.com') {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
      const m = u.pathname.match(/\/(?:shorts|embed)\/([A-Za-z0-9_-]{6,})/);
      if (m?.[1]) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
    }
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }

    // Vimeo
    if (host === 'vimeo.com') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}
