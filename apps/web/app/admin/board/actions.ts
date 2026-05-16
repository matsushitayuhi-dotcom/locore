'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
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
      ids: string[];
      events: NonNullable<RunAiResult['events']>;
      durationMs: number;
    }
  | { ok: false; error: string };

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
      ids: [],
      events: [],
      durationMs: Date.now() - start,
    };
  }

  try {
    const db = getDb();
    const inserted = await db
      .insert(schema.boardPosts)
      .values(
        events.map((e) => ({
          title: e.title,
          body: e.body,
          category: 'event' as const,
          audience: 'both' as const,
          eventDate: e.event_date,
          eventLocation: e.event_location,
          sourceUrls: e.source_urls,
          source: 'ai_event' as const,
          status: 'published' as const,
          autoCollected: true,
          authorId: null,
          publishedAt: new Date(),
        })),
      )
      .returning({ id: schema.boardPosts.id });

    // 掲示板を出している場所をすべて再生成
    revalidatePath('/board');
    revalidatePath('/expat');
    revalidatePath('/explore');
    revalidatePath('/admin/board');

    return {
      ok: true,
      inserted: inserted.length,
      ids: inserted.map((r) => r.id),
      events,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `DB 挿入に失敗: ${msg}` };
  }
}
