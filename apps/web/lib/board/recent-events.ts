import 'server-only';
import { and, gte, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';

/**
 * 直近に投稿された board_posts のうち、AI イベント自動投稿の
 * 「実質的に同じイベントの重複投稿」を防ぐために最低限必要な
 * メタ情報だけを抜き出した型。
 *
 * - eventDate は schema 上 `date('event_date')` で string ('YYYY-MM-DD') | null
 *   として返る。timestamp ではないことに注意。
 * - eventLocation は会場名 / 区名などの自由文字列（trim 済み・最大 140 字）。
 */
export type RecentBoardEvent = {
  title: string;
  /** 後方互換用。基本的には eventStartDate と同値。 */
  eventDate: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
  eventLocation: string | null;
  status: string;
};

/**
 * 過去 N 日に published で投稿された board_posts を、AI による重複判定
 * （プロンプトへの「既出リスト」差し込み）と、サーバ側の最終フィルタ用に
 * 取得する。
 *
 * - status='published' のみ。draft / archived は判定対象外。
 * - 件数は最大 80 件まで（プロンプト膨張を抑える）。
 * - 並び順は eventDate 降順（NULL は後ろ）。
 *
 * 失敗時は空配列を返す（cron 全体は止めない）。
 */
export async function getRecentBoardEvents(
  days = 30,
): Promise<RecentBoardEvent[]> {
  const db = getDb();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const rows = await db
      .select({
        title: schema.boardPosts.title,
        eventDate: schema.boardPosts.eventDate,
        eventStartDate: schema.boardPosts.eventStartDate,
        eventEndDate: schema.boardPosts.eventEndDate,
        eventLocation: schema.boardPosts.eventLocation,
        status: schema.boardPosts.status,
      })
      .from(schema.boardPosts)
      .where(
        and(
          gte(schema.boardPosts.createdAt, since),
          sql`${schema.boardPosts.status} = 'published'`,
        ),
      )
      .orderBy(
        sql`COALESCE(${schema.boardPosts.eventStartDate}, ${schema.boardPosts.eventDate}) DESC NULLS LAST`,
      )
      .limit(80);
    return rows.map((r) => {
      // event_date は旧データ用フォールバック。新規は eventStartDate を優先。
      const start = r.eventStartDate ?? r.eventDate ?? null;
      const end = r.eventEndDate ?? r.eventDate ?? null;
      return {
        title: r.title,
        eventDate: start,
        eventStartDate: start,
        eventEndDate: end,
        eventLocation: r.eventLocation ?? null,
        status: r.status,
      };
    });
  } catch (err) {
    console.warn('[getRecentBoardEvents] failed:', err);
    return [];
  }
}
