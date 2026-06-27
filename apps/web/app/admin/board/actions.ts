'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/require-user';
import { fetchAiParisEvents, type RunAiResult } from '@/lib/ai/parisEvents';

/**
 * 編集者用 — Claude を呼んでパリのイベント候補を取得するだけのテスト実行。
 *
 * - DB には書き込まない（dryRun 相当）
 * - editor ロールのみ
 * - Claude / Anthropic API キーが本番に正しく入っているかの動作確認に使う
 */

export type AiTestResult =
  | {
      ok: true;
      prompt?: { today: string; inEightDays: string; weekdayJa: string };
      rawParsedCount: number;
      validCount: number;
      events: NonNullable<RunAiResult['events']>;
      rawText: string;
      usage?: unknown;
      stopReason?: string | null;
      durationMs: number;
    }
  | { ok: false; error: string };

export async function testAiParisEvents(): Promise<AiTestResult> {
  const editor = await requireEditor();
  if (!editor) {
    return { ok: false, error: '編集者ロールのみ実行できます' };
  }

  const start = Date.now();
  const res = await fetchAiParisEvents();
  const durationMs = Date.now() - start;

  if (!res.ok) {
    return { ok: false, error: res.error ?? 'unknown error' };
  }

  return {
    ok: true,
    prompt: res.prompt,
    rawParsedCount: res.rawParsedCount ?? 0,
    validCount: res.validCount ?? 0,
    events: res.events ?? [],
    rawText: res.rawText ?? '',
    usage: res.usage,
    stopReason: res.stopReason,
    durationMs,
  };
}

// ============================================================================
// 本番実行: Claude で取得して board_posts に INSERT までする
// ============================================================================

export type AiRealRunResult =
  | {
      ok: true;
      inserted: number;
      skipped: number;
      ids: string[];
      events: NonNullable<RunAiResult['events']>;
      durationMs: number;
    }
  | { ok: false; error: string };

/**
 * 簡易重複判定キー: 日付 + タイトル先頭 40 字（雑だけど効くケースが多い）。
 */
function dedupKey(date: string | null, title: string): string {
  return `${date ?? 'null'}::${title.trim().slice(0, 40)}`;
}

/**
 * 編集者用 — Claude を呼んで board_posts に **実際に書き込む** 本番実行。
 *
 * - editor ロールのみ
 * - 当日重複ガードは適用しない (テスト的に複数回回せるように)
 * - 採用された events を source='ai_event' / auto_collected=true で挿入
 * - /board, /expat, /explore など掲示板表示ページを revalidate
 *
 * 普段は Vercel Cron が週 1 で叩くが、これをブラウザから明示的に叩いて
 * すぐ反映させたいときに使う。
 */
export async function runAiParisEventsNow(): Promise<AiRealRunResult> {
  const editor = await requireEditor();
  if (!editor) {
    return { ok: false, error: '編集者ロールのみ実行できます' };
  }

  const start = Date.now();
  const res = await fetchAiParisEvents();
  if (!res.ok) {
    return { ok: false, error: res.error ?? 'unknown error' };
  }

  const events = res.events ?? [];
  if (events.length === 0) {
    return {
      ok: true,
      inserted: 0,
      skipped: 0,
      ids: [],
      events: [],
      durationMs: Date.now() - start,
    };
  }

  try {
    const db = getDb();

    // --- 重複検出 -------------------------------------------------------
    // Claude 取得結果の日付範囲を求めて、その期間の既存 board_posts を取得。
    // 同じ event_start_date + title プレフィクスがあれば skip する。
    const dates = events
      .map((e) => e.event_start_date ?? e.event_date ?? null)
      .filter((d): d is string => !!d)
      .sort();
    const dedupExisting = new Set<string>();
    if (dates.length > 0) {
      const min = dates[0]!;
      const max = dates[dates.length - 1]!;
      const effectiveStart = sql<string>`COALESCE(${schema.boardPosts.eventStartDate}, ${schema.boardPosts.eventDate})`;
      const existing = await db
        .select({
          title: schema.boardPosts.title,
          eventDate: schema.boardPosts.eventDate,
          eventStartDate: schema.boardPosts.eventStartDate,
        })
        .from(schema.boardPosts)
        .where(
          and(
            eq(schema.boardPosts.source, 'ai_event'),
            // start_date を優先。旧データ用に event_date でも見る。
            sql`${effectiveStart} >= ${min}`,
            sql`${effectiveStart} <= ${max}`,
          ),
        );
      for (const row of existing) {
        const key = row.eventStartDate ?? row.eventDate ?? null;
        dedupExisting.add(dedupKey(key, row.title));
      }
    }

    const toInsert = events.filter(
      (e) =>
        !dedupExisting.has(
          dedupKey(e.event_start_date ?? e.event_date ?? null, e.title),
        ),
    );
    const skipped = events.length - toInsert.length;

    if (toInsert.length === 0) {
      return {
        ok: true,
        inserted: 0,
        skipped,
        ids: [],
        events,
        durationMs: Date.now() - start,
      };
    }

    const insertValues = toInsert
      .map((e) => {
        const start = e.event_start_date ?? e.event_date ?? null;
        const end = e.event_end_date ?? start;
        if (!start || !end) return null;
        return {
          title: e.title,
          body: e.body,
          // Claude が振り分けた category をそのまま採用 (event/transit/admin/食材等)
          category: e.category,
          audience: 'both' as const,
          // 後方互換のため event_date にも start を入れる
          eventDate: start,
          eventStartDate: start,
          eventEndDate: end,
          eventLocation: e.event_location,
          sourceUrls: e.source_urls,
          source: 'ai_event' as const,
          status: 'published' as const,
          autoCollected: true,
          authorId: null,
          publishedAt: new Date(),
        };
      })
      .filter(<T>(v: T | null): v is T => v !== null);

    if (insertValues.length === 0) {
      return {
        ok: true,
        inserted: 0,
        skipped: skipped + toInsert.length,
        ids: [],
        events,
        durationMs: Date.now() - start,
      };
    }

    const inserted = await db
      .insert(schema.boardPosts)
      .values(insertValues)
      .returning({ id: schema.boardPosts.id });

    // 掲示板を出している場所をすべて再生成
    revalidatePath('/board');
    revalidatePath('/community');
    revalidatePath('/france');
    revalidatePath('/calendar');
    revalidatePath('/admin/board');

    return {
      ok: true,
      inserted: inserted.length,
      skipped,
      ids: inserted.map((r) => r.id),
      events,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `DB 挿入に失敗: ${msg}` };
  }
}

// ============================================================================
// 掲示板投稿: 公開 / 非公開 / 削除 (editor 操作)
// ============================================================================

/**
 * board_posts には deletedAt カラムが無いため、status (text) で論理状態を表現:
 *   - 公開 (publish):   status='published'
 *   - 非公開 (unpublish): status='archived'
 *   - 削除 (delete):    status='deleted'  (sentinel 値: lib/board/db.ts は
 *                       'published' しか拾わないので一覧から自動で消える)
 *
 * 物理削除はしない: AI 自動収集で再投入されたり、後から URL が共有されたり
 * するケースを潰すため。復活は Supabase Studio で status を戻す。
 */

const boardIdSchema = z.object({ id: z.string().uuid() });

export type BoardPostActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function revalidateBoardSurfaces() {
  revalidatePath('/admin/board');
  revalidatePath('/admin');
  revalidatePath('/board');
  revalidatePath('/community');
  revalidatePath('/france');
  revalidatePath('/calendar');
  // 個別詳細ページや region home は force-dynamic なので明示 revalidate は不要
}

async function loadBoardPost(id: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.boardPosts.id,
      status: schema.boardPosts.status,
      publishedAt: schema.boardPosts.publishedAt,
    })
    .from(schema.boardPosts)
    .where(eq(schema.boardPosts.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function publishBoardPost(
  input: unknown,
): Promise<BoardPostActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };

  const parsed = boardIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な投稿 ID です' };

  const post = await loadBoardPost(parsed.data.id);
  if (!post) return { ok: false, error: '投稿が見つかりません' };
  if (post.status === 'deleted') {
    return { ok: false, error: '削除済みの投稿は公開できません' };
  }
  if (post.status === 'published') {
    return { ok: true, message: 'すでに公開済みです' };
  }

  const db = getDb();
  const now = new Date();
  try {
    await db
      .update(schema.boardPosts)
      .set({
        status: 'published',
        publishedAt: post.publishedAt ?? now,
        updatedAt: now,
      })
      .where(eq(schema.boardPosts.id, parsed.data.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `公開失敗: ${msg}` };
  }

  revalidateBoardSurfaces();
  return { ok: true, message: '投稿を公開しました' };
}

export async function unpublishBoardPost(
  input: unknown,
): Promise<BoardPostActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };

  const parsed = boardIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な投稿 ID です' };

  const post = await loadBoardPost(parsed.data.id);
  if (!post) return { ok: false, error: '投稿が見つかりません' };
  if (post.status === 'deleted') {
    return { ok: false, error: '削除済みの投稿です' };
  }
  if (post.status === 'archived') {
    return { ok: true, message: 'すでに非公開です' };
  }

  const db = getDb();
  try {
    await db
      .update(schema.boardPosts)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(schema.boardPosts.id, parsed.data.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `非公開化失敗: ${msg}` };
  }

  revalidateBoardSurfaces();
  return { ok: true, message: '投稿を非公開にしました' };
}

export async function softDeleteBoardPost(
  input: unknown,
): Promise<BoardPostActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };

  const parsed = boardIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な投稿 ID です' };

  const post = await loadBoardPost(parsed.data.id);
  if (!post) return { ok: false, error: '投稿が見つかりません' };
  if (post.status === 'deleted') {
    return { ok: true, message: 'すでに削除済みです' };
  }

  const db = getDb();
  try {
    await db
      .update(schema.boardPosts)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(schema.boardPosts.id, parsed.data.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `削除失敗: ${msg}` };
  }

  revalidateBoardSurfaces();
  return { ok: true, message: '投稿を削除しました' };
}
