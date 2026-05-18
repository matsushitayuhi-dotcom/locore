import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';

/**
 * リージョン (cities テーブル) のコンテンツ存在判定。
 *
 * 「その地域に関する投稿が 1 つでもある」= 公開済み記事 OR 有効な
 * コミュニティ投稿が紐付いている、という定義。掲示板 (board_posts) は
 * 現状 Paris 限定運用のため判定対象に含めない。
 *
 * 用途:
 *  - /region/[slug] でコンテンツ無しなら Coming Soon に切替
 *  - CommunityRegionPicker / PlaceMenu でロックされた地域を出さない
 *
 * パフォーマンス: cities × (articles EXISTS + community_posts EXISTS) の
 * 軽い SQL 一発。結果は Set<slug> で扱いやすい形に整形。
 *
 * 注意: is_sample=true のサンプルデータも判定対象に含める (UAT 中)。
 * 本番運用フェーズで除外したくなったら EXISTS 内側に is_sample=false を
 * 足す。
 */
export async function getRegionsWithContent(): Promise<Set<string>> {
  const db = getDb();
  try {
    const result = await db.execute(sql`
      SELECT DISTINCT c.slug
      FROM cities c
      WHERE EXISTS (
              SELECT 1 FROM articles a
              WHERE a.city_id = c.id
                AND a.status = 'published'
                AND a.deleted_at IS NULL
            )
         OR EXISTS (
              SELECT 1 FROM community_posts p
              WHERE p.city_id = c.id
                AND p.status = 'active'
            )
    `);

    // postgres-js / pg のどちらでもアクセスできるよう any 経由
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any = result;
    const list: Array<{ slug?: unknown }> = Array.isArray(rows)
      ? rows
      : rows?.rows ?? [];

    const slugs = new Set<string>();
    for (const r of list) {
      if (r && typeof r.slug === 'string') slugs.add(r.slug);
    }
    return slugs;
  } catch (err) {
    console.error('[getRegionsWithContent] failed:', err);
    // 失敗時は空集合を返す。呼び出し側で「念のため全部見せる」「全部隠す」
    // どちらを選ぶかは context 次第。
    return new Set();
  }
}

/**
 * 単一 slug に対する存在判定。`getRegionsWithContent` の結果を受け取って
 * チェックする以外に、単体 SQL で軽く判定したい場合用。
 */
export async function regionHasContent(slug: string): Promise<boolean> {
  const all = await getRegionsWithContent();
  return all.has(slug);
}
