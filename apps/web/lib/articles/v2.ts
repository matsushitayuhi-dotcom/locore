import 'server-only';
import { eq, asc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getDbArticleBundle } from './published';
import type { ArticleVideoRow } from '@/components/article/v2/classify';

/**
 * essay（ブログ・場所なし）で使う外部動画 `article_videos` を取得する。
 *
 * 本番 /articles/[id] でも v2 レンダラ（essay）が動画を出すため、ライブページ・
 * プレビューページの双方から呼べる単体ヘルパとして切り出す。失敗しても [] を返し
 * 表示は壊さない（DB 未接続 / 列なし 等）。
 */
export async function getArticleVideos(id: string): Promise<ArticleVideoRow[]> {
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
    return rows.map((r) => ({
      id: r.id,
      platform: r.platform as ArticleVideoRow['platform'],
      embedUrl: r.embedUrl,
      position: r.position,
    }));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[getArticleVideos] failed, returning []:', err);
    return [];
  }
}

/**
 * Phase A/B プレビュー用の記事バンドル取得。
 *
 * 既存の `getDbArticleBundle`（本番 /articles/[id] と同じローダ）をそのまま再利用し、
 * 新レンダラ（essay）で使う外部動画 `article_videos` だけを追加で取得して足す。
 *
 * 既存ローダ・本番ファイルには一切手を加えない（非破壊）。
 */
export async function getArticleBundleForPreview(id: string) {
  const bundle = await getDbArticleBundle(id);
  if (!bundle) return null;
  const videos = await getArticleVideos(id);
  return { ...bundle, videos };
}
