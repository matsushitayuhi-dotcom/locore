import 'server-only';
import { eq, and, gt, sql, isNull, or } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';

/**
 * 自分の全スレッドにわたる未読メッセージ件数 + 未読スレッド数を取得。
 *
 * SideMenu / BottomNav の「メッセージ」項目横にバッジ表示するための軽量クエリ。
 * - 未読 = chat_messages.created_at > thread_members.last_read_at
 * - 自分が送ったメッセージは除外
 *
 * 認証なしの場合は { count: 0, threadCount: 0 }
 */
export type UnreadChatSummary = {
  /** 未読メッセージの総数 */
  count: number;
  /** 未読を含むスレッド数（バッジ表示用） */
  threadCount: number;
};

export async function getMyUnreadChatSummary(): Promise<UnreadChatSummary> {
  const me = await getCurrentUser();
  if (!me) return { count: 0, threadCount: 0 };

  try {
    const db = getDb();
    // 自分が member であるスレッドの last_read_at を引いて
    // それより新しい messages を集計（送信者は自分以外）。
    const rows = await db
      .select({
        threadId: schema.chatMessages.threadId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(schema.chatMessages)
      .innerJoin(
        schema.chatThreadMembers,
        and(
          eq(schema.chatThreadMembers.threadId, schema.chatMessages.threadId),
          eq(schema.chatThreadMembers.userId, me.id),
        ),
      )
      .where(
        and(
          // 自分が送ったメッセージは未読対象外
          sql`${schema.chatMessages.senderId} <> ${me.id}`,
          // 削除済みは除外
          isNull(schema.chatMessages.deletedAt),
          // last_read_at が NULL（一度も開いてない）か、それ以降の発言
          or(
            isNull(schema.chatThreadMembers.lastReadAt),
            gt(
              schema.chatMessages.createdAt,
              schema.chatThreadMembers.lastReadAt,
            ),
          ),
        ),
      )
      .groupBy(schema.chatMessages.threadId);

    let total = 0;
    for (const r of rows) total += r.cnt;
    return { count: total, threadCount: rows.length };
  } catch (err) {
    console.warn('[getMyUnreadChatSummary] failed:', err);
    return { count: 0, threadCount: 0 };
  }
}
