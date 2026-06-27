import 'server-only';
import { eq, asc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getDbArticleBundle } from './published';
import type { ArticleVideoRow } from '@/components/article/v2/classify';

/**
 * Phase A プレビュー用の記事バンドル取得。
 *
 * 既存の `getDbArticleBundle`（本番 /articles/[id] と同じローダ）をそのまま再利用し、
 * 新レンダラ（essay）で使う外部動画 `article_videos` だけを追加で取得して足す。
 *
 * 既存ローダ・本番ファイルには一切手を加えない（非破壊）。プレビュー専用に
 * ここで薄くラップする。
 */
export async function getArticleBundleForPreview(id: string) {
  const bundle = await getDbArticleBundle(id);
  if (!bundle) return null;

  let videos: ArticleVideoRow[] = [];
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.articleVideos.id,
        platform: schema.articleVideos.platform,
        embedUrl: schema.articleVideos.embedUrl,
        position: schema.articleVideos.position,
      })
      .from(schema.articleVideos)
      .where(eq(schema.articleVideos.articleId, id))
      .orderBy(asc(schema.articleVideos.position));
    videos = rows.map((r) => ({
      id: r.id,
      platform: r.platform as ArticleVideoRow['platform'],
      embedUrl: r.embedUrl,
      position: r.position,
    }));
  } catch (err) {
    // article_videos 未取得でもプレビューは壊さない
    // eslint-disable-next-line no-console
    console.warn('[getArticleBundleForPreview] videos fetch failed:', err);
  }

  return { ...bundle, videos };
}
