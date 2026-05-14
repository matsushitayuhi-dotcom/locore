import 'server-only';
import { eq, desc, and, gte, inArray, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { BoardCategory, BoardAudience } from './constants';

/**
 * 掲示板（board_posts）のサーバ専用クエリ。
 */

export type BoardPostListItem = {
  id: string;
  title: string;
  source: 'manual' | 'ai_event' | 'ai_news' | string;
  category: BoardCategory | string;
  audience: BoardAudience | string;
  eventDate: string | null;
  eventLocation: string | null;
  autoCollected: boolean;
  publishedAt: string;
  authorId: string | null;
};

export type BoardPostDetail = BoardPostListItem & {
  body: string;
  sourceUrls: Array<{ name: string; url: string }> | null;
  cityId: string | null;
};

export type ListBoardPostsOpts = {
  /** 取得件数。デフォルト 10 */
  limit?: number;
  /** カテゴリ絞り込み（複数指定可）。未指定なら全カテゴリ */
  categories?: BoardCategory[];
  /** 対象絞り込み。'both' を含む条件で OR 検索したい場合はアプリ側で組む */
  audiences?: BoardAudience[];
};

/**
 * 公開済み投稿を新しい順に取得。
 *
 * - categories 指定: その中のカテゴリだけ返す
 * - audiences 指定: 'both' は両方の audience フィルタに常にマッチする扱い
 *   （例: audiences=['traveler'] → 'traveler' と 'both' を返す）
 */
export async function listBoardPosts(
  opts: ListBoardPostsOpts | number = {},
): Promise<BoardPostListItem[]> {
  // 旧シグネチャ互換: listBoardPosts(10) で呼ばれているケースを救う
  const options: ListBoardPostsOpts =
    typeof opts === 'number' ? { limit: opts } : opts;
  const limit = options.limit ?? 10;

  try {
    const db = getDb();

    const filters = [eq(schema.boardPosts.status, 'published')];
    if (options.categories && options.categories.length > 0) {
      filters.push(inArray(schema.boardPosts.category, options.categories));
    }
    if (options.audiences && options.audiences.length > 0) {
      // 'both' は常にマッチさせるため、audiences + 'both' を OR で含める
      const audSet = new Set<string>([...options.audiences, 'both']);
      filters.push(
        inArray(schema.boardPosts.audience, Array.from(audSet)),
      );
    }

    const rows = await db
      .select({
        id: schema.boardPosts.id,
        title: schema.boardPosts.title,
        source: schema.boardPosts.source,
        category: schema.boardPosts.category,
        audience: schema.boardPosts.audience,
        eventDate: schema.boardPosts.eventDate,
        eventLocation: schema.boardPosts.eventLocation,
        autoCollected: schema.boardPosts.autoCollected,
        publishedAt: schema.boardPosts.publishedAt,
        authorId: schema.boardPosts.authorId,
      })
      .from(schema.boardPosts)
      .where(and(...filters))
      .orderBy(desc(schema.boardPosts.publishedAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      source: r.source,
      category: r.category,
      audience: r.audience,
      eventDate: r.eventDate ?? null,
      eventLocation: r.eventLocation,
      autoCollected: r.autoCollected,
      publishedAt: (r.publishedAt ?? new Date()).toISOString(),
      authorId: r.authorId,
    }));
  } catch {
    return [];
  }
}

/**
 * 単一投稿の詳細（/board/[id] 用）。public read RLS が効いているので未公開は返らない。
 */
export async function getBoardPost(id: string): Promise<BoardPostDetail | null> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.boardPosts.id,
        title: schema.boardPosts.title,
        body: schema.boardPosts.body,
        source: schema.boardPosts.source,
        category: schema.boardPosts.category,
        audience: schema.boardPosts.audience,
        eventDate: schema.boardPosts.eventDate,
        eventLocation: schema.boardPosts.eventLocation,
        autoCollected: schema.boardPosts.autoCollected,
        publishedAt: schema.boardPosts.publishedAt,
        authorId: schema.boardPosts.authorId,
        cityId: schema.boardPosts.cityId,
        sourceUrls: schema.boardPosts.sourceUrls,
      })
      .from(schema.boardPosts)
      .where(
        and(
          eq(schema.boardPosts.id, id),
          eq(schema.boardPosts.status, 'published'),
        ),
      )
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      title: r.title,
      body: r.body,
      source: r.source,
      category: r.category,
      audience: r.audience,
      eventDate: r.eventDate ?? null,
      eventLocation: r.eventLocation,
      autoCollected: r.autoCollected,
      publishedAt: (r.publishedAt ?? new Date()).toISOString(),
      authorId: r.authorId,
      cityId: r.cityId,
      sourceUrls: r.sourceUrls ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * 同じ日に AI イベント投稿が既にあるかチェック（cron の重複防止用）。
 * source='ai_event' AND category='event' AND publishedAt が当日。
 */
export async function hasAiEventPostForToday(): Promise<boolean> {
  try {
    const db = getDb();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const rows = await db
      .select({ id: schema.boardPosts.id })
      .from(schema.boardPosts)
      .where(
        and(
          eq(schema.boardPosts.source, 'ai_event'),
          gte(schema.boardPosts.publishedAt, startOfDay),
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}
