import { NextResponse } from 'next/server';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { hasAiEventPostForToday } from '@/lib/board/db';
import { getRecentBoardEvents } from '@/lib/board/recent-events';
import { dedupAgainstRecent, fetchAiParisEvents } from '@/lib/ai/parisEvents';

/**
 * AI による「パリで今日／今週開催のイベント」自動収集 cron。
 *
 * 動作:
 *   1. CRON_SECRET でリクエストを検証
 *   2. 当日既に AI 投稿があれば skip（多重実行ガード）
 *   3. lib/ai/parisEvents.ts の fetchAiParisEvents() で Claude + web_search 実行
 *   4. board_posts に source='ai_event', auto_collected=true で挿入
 *
 * Claude を呼ぶロジックは管理画面のテストボタンと共用するため、
 * lib/ai/parisEvents.ts に切り出した。
 *
 * 起動経路: Vercel Cron（vercel.json で schedule "0 5 * * 1"）
 * 手動実行: curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *           https://locore.app/api/cron/ai-paris-events
 * dryRun:   上記 URL に ?dryRun=1 を付けると DB 書き込み無しで JSON 返却
 */

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return runCron(req);
}

export async function GET(req: Request) {
  return runCron(req);
}

async function runCron(req: Request) {
  // 1. 認証
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dryRun') === '1';

  // 2. 当日重複ガード（dryRun はバイパス）
  const already = !dryRun && (await hasAiEventPostForToday());
  if (already) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'already-posted-today',
    });
  }

  // 3. 既出イベントを取得 → Claude に「重複避け」セクションとして渡す
  const recent = await getRecentBoardEvents(30);

  // 4. Claude 呼び出し（共有ロジック）
  const result = await fetchAiParisEvents(recent);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'anthropic-call-failed' },
      { status: 502 },
    );
  }

  // 5. サーバ側の最終フィルタ。AI の semantic 判定をすり抜けた重複を弾く。
  const aiEvents = result.events ?? [];
  const { kept, dropped } = dedupAgainstRecent(aiEvents, recent);
  if (dropped.length > 0) {
    console.info(
      `[ai-paris-events] 重複で ${dropped.length} 件 skip しました:`,
      dropped.map((d) => ({ title: d.candidate.title, reason: d.reason })),
    );
  }

  // dryRun は DB を触らずに Claude の生出力 + parsed を返す（チューニング用）
  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      prompt: result.prompt,
      rawParsedCount: result.rawParsedCount,
      validCount: result.validCount,
      events: result.events,
      dedup: {
        kept: kept.length,
        dropped: dropped.length,
        droppedDetails: dropped.map((d) => ({
          title: d.candidate.title,
          reason: d.reason,
        })),
      },
      rawText: result.rawText,
      usage: result.usage,
      stopReason: result.stopReason,
    });
  }

  // 6. DB 挿入
  if (kept.length === 0) {
    return NextResponse.json({
      ok: true,
      inserted: 0,
      duplicatesSkipped: dropped.length,
      reason: aiEvents.length === 0 ? 'no-events-parsed' : 'all-duplicates',
    });
  }

  const db = getDb();
  const inserted = await db
    .insert(schema.boardPosts)
    .values(
      kept.map((e) => ({
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

  return NextResponse.json({
    ok: true,
    inserted: inserted.length,
    duplicatesSkipped: dropped.length,
    ids: inserted.map((r) => r.id),
  });
}
