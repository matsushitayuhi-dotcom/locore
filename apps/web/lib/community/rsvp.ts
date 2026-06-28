'use server';

import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';
import type { CommunityActionResult } from './actions';

/**
 * 集まり（community_posts.kind = 'group'）の参加表明（RSVP）。
 *
 * 設計上の注意:
 *   - 参加予定数・残り枠は、この実 RSVP の集計のみで算出（偽データを出さない）。
 *   - テーブル（manual/0060）が未適用の環境でも例外を握りつぶし、
 *     getEventRsvpSummary は全 0 / null、書き込み系は失敗を返して動作継続する
 *     （0058 / 0059 と同じフォールバック思想）。
 *   - 投稿者本人（主催者）も RSVP できるが、UI 側でメッセージは出さない。
 */

export type RsvpStatus = 'going' | 'interested';

export type EventRsvpSummary = {
  going: number;
  interested: number;
  viewerStatus: RsvpStatus | null;
  /** 参加予定（going）のアバター。最大 8 件。実データのみ */
  goingAvatars: { name: string | null; avatarUrl: string | null }[];
  /** RSVP テーブルが未適用 or 取得失敗で集計できなかったか */
  unavailable: boolean;
};

/** 未適用 / 集計不能時の安全な空サマリ */
function emptySummary(): EventRsvpSummary {
  return {
    going: 0,
    interested: 0,
    viewerStatus: null,
    goingAvatars: [],
    unavailable: true,
  };
}

function isMissingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /does not exist/i.test(msg) || /relation .* does not exist/i.test(msg);
}

/**
 * 参加表明サマリを取得。投稿者本人を含む全ユーザーの going / interested を集計し、
 * 参加予定（going）のアバターを最大 8 件返す。viewerId を渡すと自分の状態も返す。
 *
 * テーブル未適用 / 取得失敗時は全 0・null・unavailable:true で返す（例外は投げない）。
 */
export async function getEventRsvpSummary(
  postId: string,
  viewerId?: string | null,
): Promise<EventRsvpSummary> {
  try {
    const db = getDb();

    // 件数（status ごと）
    const counts = (await db
      .select({
        status: schema.communityEventRsvps.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.communityEventRsvps)
      .where(eq(schema.communityEventRsvps.postId, postId))
      .groupBy(schema.communityEventRsvps.status)) as {
      status: string;
      count: number;
    }[];

    let going = 0;
    let interested = 0;
    for (const row of counts) {
      if (row.status === 'going') going = row.count;
      else if (row.status === 'interested') interested = row.count;
    }

    // 参加予定（going）のアバター（最大 8）
    const avatarRows = (await db
      .select({
        name: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        createdAt: schema.communityEventRsvps.createdAt,
      })
      .from(schema.communityEventRsvps)
      .leftJoin(
        schema.users,
        eq(schema.users.id, schema.communityEventRsvps.userId),
      )
      .where(
        and(
          eq(schema.communityEventRsvps.postId, postId),
          eq(schema.communityEventRsvps.status, 'going'),
        ),
      )
      .orderBy(schema.communityEventRsvps.createdAt)
      .limit(8)) as {
      name: string | null;
      avatarUrl: string | null;
      createdAt: Date | null;
    }[];

    let viewerStatus: RsvpStatus | null = null;
    if (viewerId) {
      const mine = (await db
        .select({ status: schema.communityEventRsvps.status })
        .from(schema.communityEventRsvps)
        .where(
          and(
            eq(schema.communityEventRsvps.postId, postId),
            eq(schema.communityEventRsvps.userId, viewerId),
          ),
        )
        .limit(1)) as { status: string }[];
      const s = mine[0]?.status;
      if (s === 'going' || s === 'interested') viewerStatus = s;
    }

    return {
      going,
      interested,
      viewerStatus,
      goingAvatars: avatarRows.map((r) => ({
        name: r.name,
        avatarUrl: r.avatarUrl,
      })),
      unavailable: false,
    };
  } catch (err) {
    if (isMissingTable(err)) {
      console.warn(
        '[getEventRsvpSummary] community_event_rsvps テーブルが未適用です。' +
          'manual/0060_community_event_rsvps.sql を Supabase で適用してください。',
      );
    } else {
      console.error('[getEventRsvpSummary] failed:', err);
    }
    return emptySummary();
  }
}

/**
 * 参加表明する（upsert）。要ログイン。
 *
 * - status='going' で capacity を超える場合は going にできないため、
 *   interested に切り替えて「満員」を返す（呼び出し側でメッセージ表示）。
 * - 既存行があれば status を更新（unique(post_id,user_id)）。
 */
export async function rsvpToEvent(
  postId: string,
  status: RsvpStatus,
): Promise<CommunityActionResult<{ status: RsvpStatus; full: boolean }>> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: 'ログインが必要です', reason: 'unauthenticated' };
  }

  try {
    const db = getDb();

    // 投稿の存在・kind・capacity を確認
    const posts = (await db
      .select({
        kind: schema.communityPosts.kind,
        status: schema.communityPosts.status,
        metadata: schema.communityPosts.metadata,
      })
      .from(schema.communityPosts)
      .where(eq(schema.communityPosts.id, postId))
      .limit(1)) as {
      kind: string;
      status: string;
      metadata: unknown;
    }[];
    const post = posts[0];
    if (!post || post.kind !== 'group') {
      return { ok: false, error: '対象の集まりが見つかりません' };
    }
    if (post.status !== 'active') {
      return { ok: false, error: 'この集まりは現在受付していません' };
    }

    const capacity = (post.metadata as { capacity?: number } | null)?.capacity;

    let effectiveStatus: RsvpStatus = status;
    let full = false;

    // going 希望かつ capacity 設定済みなら満員判定（自分が既に going の場合は対象外）
    if (status === 'going' && typeof capacity === 'number' && capacity > 0) {
      const goingRows = (await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.communityEventRsvps)
        .where(
          and(
            eq(schema.communityEventRsvps.postId, postId),
            eq(schema.communityEventRsvps.status, 'going'),
          ),
        )) as { count: number }[];
      const goingCount = goingRows[0]?.count ?? 0;

      const mine = (await db
        .select({ status: schema.communityEventRsvps.status })
        .from(schema.communityEventRsvps)
        .where(
          and(
            eq(schema.communityEventRsvps.postId, postId),
            eq(schema.communityEventRsvps.userId, me.id),
          ),
        )
        .limit(1)) as { status: string }[];
      const alreadyGoing = mine[0]?.status === 'going';

      if (!alreadyGoing && goingCount >= capacity) {
        // 満員 → going 不可。interested として記録する
        effectiveStatus = 'interested';
        full = true;
      }
    }

    await db
      .insert(schema.communityEventRsvps)
      .values({ postId, userId: me.id, status: effectiveStatus })
      .onConflictDoUpdate({
        target: [
          schema.communityEventRsvps.postId,
          schema.communityEventRsvps.userId,
        ],
        set: { status: effectiveStatus, updatedAt: new Date() },
      });

    revalidatePath(`/groups/${postId}`);
    return { ok: true, data: { status: effectiveStatus, full } };
  } catch (err) {
    if (isMissingTable(err)) {
      return {
        ok: false,
        error: '参加機能は現在ご利用いただけません（管理者へお問い合わせください）',
        reason: 'rsvp_table_missing',
      };
    }
    console.error('[rsvpToEvent] failed:', err);
    return { ok: false, error: '参加表明に失敗しました。時間をおいて再度お試しください' };
  }
}

/** 自分の参加表明を取り消す（行を削除）。要ログイン。 */
export async function cancelRsvp(
  postId: string,
): Promise<CommunityActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: 'ログインが必要です', reason: 'unauthenticated' };
  }
  try {
    const db = getDb();
    await db
      .delete(schema.communityEventRsvps)
      .where(
        and(
          eq(schema.communityEventRsvps.postId, postId),
          eq(schema.communityEventRsvps.userId, me.id),
        ),
      );
    revalidatePath(`/groups/${postId}`);
    return { ok: true };
  } catch (err) {
    if (isMissingTable(err)) {
      return {
        ok: false,
        error: '参加機能は現在ご利用いただけません',
        reason: 'rsvp_table_missing',
      };
    }
    console.error('[cancelRsvp] failed:', err);
    return { ok: false, error: '取り消しに失敗しました' };
  }
}
