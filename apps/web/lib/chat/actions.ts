'use server';

import 'server-only';
import { z } from 'zod';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';

/**
 * Locore のチャット Server Actions（最小実装）。
 *
 * 1:1 重複防止のため、`chat_threads.direct_pair_key` を sortedUUID.join(':') で持つ。
 * 「特定のユーザーと話を始める」 → findOrCreateDirectThread() で 1 行に絞れる。
 */

export type ChatActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function pairKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

/**
 * 相手ユーザー ID を渡すと、既存の 1:1 スレッドを返す or 新規作成して返す。
 * 自分自身は対象外。サービス問い合わせ用に `relatedServiceId` と初期メッセージも投げられる。
 */
const startSchema = z.object({
  withUserId: z.string().uuid(),
  initialMessage: z.string().trim().min(1).max(2000).optional(),
  relatedServiceId: z.string().uuid().optional(),
});

export async function startDirectThread(
  input: unknown,
): Promise<ChatActionResult<{ threadId: string }>> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const { withUserId, initialMessage, relatedServiceId } = parsed.data;

  const me = await requireUser();
  if (me.id === withUserId) {
    return { ok: false, error: '自分自身にメッセージを送ることはできません' };
  }
  const db = getDb();
  const key = pairKey(me.id, withUserId);

  // 既存？
  let threadId: string | null = null;
  const existing = await db
    .select({ id: schema.chatThreads.id })
    .from(schema.chatThreads)
    .where(eq(schema.chatThreads.directPairKey, key))
    .limit(1);
  if (existing.length > 0) {
    threadId = existing[0]!.id;
  } else {
    // 新規 thread + メンバー 2 人
    const inserted = await db
      .insert(schema.chatThreads)
      .values({ directPairKey: key })
      .returning({ id: schema.chatThreads.id });
    threadId = inserted[0]!.id;

    await db
      .insert(schema.chatThreadMembers)
      .values([
        { threadId, userId: me.id },
        { threadId, userId: withUserId },
      ])
      .onConflictDoNothing();
  }

  if (initialMessage) {
    await db.insert(schema.chatMessages).values({
      threadId,
      senderId: me.id,
      body: initialMessage,
      relatedServiceId: relatedServiceId ?? null,
    });
    await db
      .update(schema.chatThreads)
      .set({ lastMessageAt: new Date() })
      .where(eq(schema.chatThreads.id, threadId));
  }

  revalidatePath('/chat');
  revalidatePath(`/chat/${threadId}`);
  return { ok: true, data: { threadId } };
}

const sendSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export async function sendChatMessage(
  input: unknown,
): Promise<ChatActionResult<{ messageId: string }>> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const { threadId, body } = parsed.data;
  const me = await requireUser();
  const db = getDb();

  // メンバー確認
  const member = await db
    .select({ threadId: schema.chatThreadMembers.threadId })
    .from(schema.chatThreadMembers)
    .where(
      and(
        eq(schema.chatThreadMembers.threadId, threadId),
        eq(schema.chatThreadMembers.userId, me.id),
      ),
    )
    .limit(1);
  if (member.length === 0) {
    return { ok: false, error: 'このスレッドに参加していません' };
  }

  const inserted = await db
    .insert(schema.chatMessages)
    .values({ threadId, senderId: me.id, body })
    .returning({ id: schema.chatMessages.id });

  await db
    .update(schema.chatThreads)
    .set({ lastMessageAt: new Date() })
    .where(eq(schema.chatThreads.id, threadId));

  revalidatePath(`/chat/${threadId}`);
  revalidatePath('/chat');
  return { ok: true, data: { messageId: inserted[0]!.id } };
}

const markReadSchema = z.object({ threadId: z.string().uuid() });

export async function markThreadRead(
  input: unknown,
): Promise<ChatActionResult> {
  const parsed = markReadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  const db = getDb();

  await db
    .update(schema.chatThreadMembers)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(schema.chatThreadMembers.threadId, parsed.data.threadId),
        eq(schema.chatThreadMembers.userId, me.id),
      ),
    );
  revalidatePath('/chat');
  return { ok: true };
}

/**
 * クライアント側ポーリング用：thread のメッセージを from 以降だけ取得。
 * `since` は ISO 文字列（最終取得時刻）。
 */
const fetchSchema = z.object({
  threadId: z.string().uuid(),
  since: z.string().datetime().optional(),
});

export type ChatMessageView = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export async function fetchThreadMessages(
  input: unknown,
): Promise<ChatActionResult<{ messages: ChatMessageView[] }>> {
  const parsed = fetchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  const db = getDb();

  const member = await db
    .select({ threadId: schema.chatThreadMembers.threadId })
    .from(schema.chatThreadMembers)
    .where(
      and(
        eq(schema.chatThreadMembers.threadId, parsed.data.threadId),
        eq(schema.chatThreadMembers.userId, me.id),
      ),
    )
    .limit(1);
  if (member.length === 0) {
    return { ok: false, error: 'スレッドが見つかりません' };
  }

  const sinceDate = parsed.data.since
    ? new Date(parsed.data.since)
    : new Date(0);

  const rows = await db
    .select({
      id: schema.chatMessages.id,
      threadId: schema.chatMessages.threadId,
      senderId: schema.chatMessages.senderId,
      body: schema.chatMessages.body,
      createdAt: schema.chatMessages.createdAt,
    })
    .from(schema.chatMessages)
    .where(
      and(
        eq(schema.chatMessages.threadId, parsed.data.threadId),
        sql`${schema.chatMessages.createdAt} > ${sinceDate}`,
      ),
    )
    .orderBy(asc(schema.chatMessages.createdAt))
    .limit(200);

  return {
    ok: true,
    data: {
      messages: rows.map((r) => ({
        id: r.id,
        threadId: r.threadId,
        senderId: r.senderId,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  };
}

/** スレッド一覧 + 相手プロフィール + 最終メッセージプレビュー + 未読数 */
export type ThreadSummary = {
  threadId: string;
  partner: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  lastMessageAt: string;
  preview: string;
  unread: number;
};

export async function listMyThreads(): Promise<ChatActionResult<{ threads: ThreadSummary[] }>> {
  const me = await requireUser();
  const db = getDb();

  // 自分が参加してる thread を取得（テーブル未作成のときは空で返してページを落とさない）
  let myMemberships: Array<{
    threadId: string;
    lastReadAt: Date | null;
  }> = [];
  try {
    myMemberships = await db
      .select({
        threadId: schema.chatThreadMembers.threadId,
        lastReadAt: schema.chatThreadMembers.lastReadAt,
      })
      .from(schema.chatThreadMembers)
      .where(eq(schema.chatThreadMembers.userId, me.id));
  } catch (err) {
    // chat_thread_members テーブルが未作成（migration 0017 未適用）等
    // eslint-disable-next-line no-console
    console.warn(
      '[listMyThreads] chat tables not ready, returning empty list:',
      err,
    );
    return { ok: true, data: { threads: [] } };
  }

  if (myMemberships.length === 0) {
    return { ok: true, data: { threads: [] } };
  }

  const threadIds = myMemberships.map((m) => m.threadId);

  let threadRows: Array<{ id: string; lastMessageAt: Date }> = [];
  try {
    threadRows = await db
      .select({
        id: schema.chatThreads.id,
        lastMessageAt: schema.chatThreads.lastMessageAt,
      })
      .from(schema.chatThreads)
      .where(inArray(schema.chatThreads.id, threadIds))
      .orderBy(desc(schema.chatThreads.lastMessageAt));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[listMyThreads] chat_threads query failed:', err);
    return { ok: true, data: { threads: [] } };
  }

  // 各 thread の相手 + 最新メッセージ + 未読
  const summaries: ThreadSummary[] = [];
  for (const t of threadRows) {
    try {
      const myMembership = myMemberships.find((m) => m.threadId === t.id);
      const lastReadAt = myMembership?.lastReadAt ?? new Date(0);

      const otherMembers = await db
        .select({
          userId: schema.chatThreadMembers.userId,
          displayName: schema.users.displayName,
          avatarUrl: schema.users.avatarUrl,
        })
        .from(schema.chatThreadMembers)
        .leftJoin(
          schema.users,
          eq(schema.users.id, schema.chatThreadMembers.userId),
        )
        .where(
          and(
            eq(schema.chatThreadMembers.threadId, t.id),
            sql`${schema.chatThreadMembers.userId} <> ${me.id}`,
          ),
        )
        .limit(1);

      const partner = otherMembers[0]
        ? {
            id: otherMembers[0].userId,
            displayName: otherMembers[0].displayName ?? '匿名',
            avatarUrl: otherMembers[0].avatarUrl ?? null,
          }
        : null;

      const lastMsgRows = await db
        .select({
          body: schema.chatMessages.body,
          createdAt: schema.chatMessages.createdAt,
        })
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.threadId, t.id))
        .orderBy(desc(schema.chatMessages.createdAt))
        .limit(1);

      const unreadResult = await db
        .select({
          cnt: sql<number>`count(*)::int`,
        })
        .from(schema.chatMessages)
        .where(
          and(
            eq(schema.chatMessages.threadId, t.id),
            sql`${schema.chatMessages.createdAt} > ${lastReadAt}`,
            sql`${schema.chatMessages.senderId} <> ${me.id}`,
          ),
        );

      summaries.push({
        threadId: t.id,
        partner,
        lastMessageAt: t.lastMessageAt.toISOString(),
        preview: lastMsgRows[0]?.body.slice(0, 80) ?? '',
        unread: unreadResult[0]?.cnt ?? 0,
      });
    } catch (err) {
      // 個別 thread の取得失敗はスキップして続ける（プレビュー表示優先）
      // eslint-disable-next-line no-console
      console.warn('[listMyThreads] thread summary failed:', t.id, err);
    }
  }

  return { ok: true, data: { threads: summaries } };
}
