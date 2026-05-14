'use server';

import 'server-only';
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
