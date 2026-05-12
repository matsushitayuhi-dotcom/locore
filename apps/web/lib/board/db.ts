import 'server-only';
import { eq, desc, and, gte } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';

/**
 * 掲示板（board_posts）のサーバ専用クエリ。
 */

export type BoardPostListItem = {
  id: string;
  title: string;
  source: 'manual' | 'ai_event' | 'ai_news' | string;
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

/**
 * 公開済み投稿を新しい順に取得。デフォルト 10 件。
 * ヘッダー / ホームの「掲示板10件」表示で使う。
 */
export async function listBoardPosts(limit = 10): Promise<BoardPostListItem[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.boardPosts.id,
        title: schema.boardPosts.title,
        source: schema.boardPosts.source,
        eventDate: schema.boardPosts.eventDate,
        eventLocation: schema.boardPosts.eventLocation,
        autoCollected: schema.boardPosts.autoCollected,
        publishedAt: schema.boardPosts.publishedAt,
        authorId: schema.boardPosts.authorId,
      })
      .from(schema.boardPosts)
      .where(eq(schema.boardPosts.status, 'published'))
      .orderBy(desc(schema.boardPosts.publishedAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      source: r.source,
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
 * 同じ日に AI 投稿が既にあるかチェック（cron の重複防止用）。
 * source が ai_event の publishedAt がその日に入っているなら true。
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
