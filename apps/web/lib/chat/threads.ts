import 'server-only';
import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';

/**
 * チャットスレッドの低レベルヘルパ（Server Action ではない純サーバー関数）。
 *
 * startDirectThread（lib/chat/actions.ts）と予約フロー（lib/bookings/actions.ts）が
 * 共用する。1:1 スレッドは chat_threads.direct_pair_key =
 * sorted([a,b]).join(':') の UNIQUE で重複生成を防ぐ。
 */

function pairKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

/**
 * 2 ユーザーの 1:1 スレッドを返す（無ければ作成してメンバー 2 人を登録）。
 * 失敗時は throw（呼び出し側で文言に変換する）。
 */
export async function findOrCreateDirectThread(
  userA: string,
  userB: string,
): Promise<string> {
  if (userA === userB) {
    throw new Error('自分自身とのスレッドは作成できません');
  }
  const db = getDb();
  const key = pairKey(userA, userB);

  const existing = await db
    .select({ id: schema.chatThreads.id })
    .from(schema.chatThreads)
    .where(eq(schema.chatThreads.directPairKey, key))
    .limit(1);
  if (existing.length > 0) return existing[0]!.id;

  const inserted = await db
    .insert(schema.chatThreads)
    .values({ directPairKey: key })
    .returning({ id: schema.chatThreads.id });
  const threadId = inserted[0]!.id;

  await db
    .insert(schema.chatThreadMembers)
    .values([
      { threadId, userId: userA },
      { threadId, userId: userB },
    ])
    .onConflictDoNothing();

  return threadId;
}

/**
 * スレッドへ 1 通投稿して last_message_at を更新する。
 * 予約フローの自動メッセージ（リクエスト / 承諾 / 辞退 / 取り下げ）にも使う。
 */
export async function postThreadMessage(
  threadId: string,
  senderId: string,
  body: string,
  relatedServiceId?: string | null,
): Promise<void> {
  const db = getDb();
  await db.insert(schema.chatMessages).values({
    threadId,
    senderId,
    body,
    relatedServiceId: relatedServiceId ?? null,
  });
  await db
    .update(schema.chatThreads)
    .set({ lastMessageAt: new Date() })
    .where(eq(schema.chatThreads.id, threadId));
}
