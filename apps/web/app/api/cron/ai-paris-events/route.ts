import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { hasAiEventPostForToday } from '@/lib/board/db';

/**
 * AI による「パリで今日／今週開催のイベント」自動収集 cron。
 *
 * 動作:
 *   1. CRON_SECRET でリクエストを検証
 *   2. 当日既に AI 投稿があれば skip（多重実行ガード、再実行で重複させない）
 *   3. Claude に web_search を渡してパリの当日イベントを 3〜5 件 JSON で返させる
 *   4. board_posts に source='ai_event', auto_collected=true で挿入
 *
 * 起動経路: Vercel Cron（vercel.json で schedule "0 5 * * 1" = 毎週月曜 UTC 5:00、
 *           Vercel Hobby 無料プランは週 1 回までなのでこの頻度に。
 *           日次更新が欲しくなったら cron-job.org など外部から GET で叩く想定）
 *
 * 必要環境変数:
 *   - CRON_SECRET           : Vercel Cron 検証用ランダム文字列
 *   - ANTHROPIC_API_KEY     : claude-sonnet-4 / claude-3-5-sonnet 用
 *
 * 手動実行（デバッグ用）:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://locore.app/api/cron/ai-paris-events
 */

export const runtime = 'nodejs';
// 最大 60s（AI + web_search の往復に余裕を持たせる）
export const maxDuration = 60;
// キャッシュさせない
export const dynamic = 'force-dynamic';

type AiEvent = {
  title: string;
  body: string;
  event_date: string | null; // YYYY-MM-DD
  event_location: string | null;
  source_urls: Array<{ name: string; url: string }>;
};

const SYSTEM_PROMPT = `あなたはパリ在住の日本人編集者です。
日本人旅行者がパリ滞在を充実させるための「掲示板向け短尺イベント情報」を、
ウェブ検索結果をもとに作成します。

ルール:
- 当日 (今日) 〜 今週末までにパリで開催される、観光客でも参加できる
  公開イベント（マルシェ、展覧会、無料コンサート、フェスティバル、
  地元の祝祭など）を 3〜5 件選ぶ
- デモ・ストライキ・テロ警報など危機情報は別チャネル扱いなのでここでは含めない
- 各イベントは以下のフィールドを持つ JSON オブジェクト:
  - title: 30 字以内、日本語、要点だけ。「" や煽り絵文字を使わない
  - body: Markdown 60〜180 字、何が起きるか + 旅行者にとっての価値（1 段落でよい）
  - event_date: YYYY-MM-DD（不明なら null）
  - event_location: パリの地区／会場名（"マレ地区" "Place de la République" など）
  - source_urls: 参照した公式ページ・公開記事 URL を 1〜3 件 [{name, url}]
- 創作・推測・誇張は禁止。情報源が確認できないものは含めない
- 最終出力は { "events": [...] } の JSON のみ。前後に説明文を付けない`;

export async function POST(req: Request) {
  return runCron(req);
}

// Vercel Cron は GET を投げてくる
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

  // 2. 当日重複ガード
  const already = await hasAiEventPostForToday();
  if (already) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'already-posted-today',
    });
  }

  // 3. Claude 呼び出し
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'ANTHROPIC_API_KEY not set' },
      { status: 500 },
    );
  }
  const client = new Anthropic({ apiKey });

  const today = new Date().toISOString().slice(0, 10);
  const userPrompt = `本日は ${today}（パリ現地時間）です。
今日から今週末までにパリで開催されるイベントを web 検索で調べ、
ルールに従って JSON だけを返してください。`;

  let aiEvents: AiEvent[] = [];
  try {
    // web_search_20250305 は新型ビルトインツールで、SDK の型 (`Tool`) に未反映なため
    // 型キャストで通す。SDK が古くてサーバ側で reject されるケースは catch される。
    const webSearchTool = {
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 5,
    } as unknown as Anthropic.Tool;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [webSearchTool],
    });

    // text ブロックを連結
    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    // JSON を抽出（前後にコードブロックや説明文が混じるケースを救済）
    const json = extractJson(text);
    if (json && Array.isArray(json.events)) {
      aiEvents = json.events as AiEvent[];
    }
  } catch (err) {
    console.error('[ai-paris-events] anthropic error', err);
    return NextResponse.json(
      { ok: false, error: 'anthropic-call-failed' },
      { status: 502 },
    );
  }

  // 4. バリデーション + DB 挿入
  const valid = aiEvents
    .map(sanitize)
    .filter((e): e is AiEvent => e !== null)
    .slice(0, 5);

  if (valid.length === 0) {
    return NextResponse.json({
      ok: true,
      inserted: 0,
      reason: 'no-events-parsed',
    });
  }

  const db = getDb();
  const inserted = await db
    .insert(schema.boardPosts)
    .values(
      valid.map((e) => ({
        title: e.title,
        body: e.body,
        eventDate: e.event_date,
        eventLocation: e.event_location,
        sourceUrls: e.source_urls,
        source: 'ai_event',
        status: 'published',
        autoCollected: true,
        authorId: null,
        publishedAt: new Date(),
      })),
    )
    .returning({ id: schema.boardPosts.id });

  return NextResponse.json({
    ok: true,
    inserted: inserted.length,
    ids: inserted.map((r) => r.id),
  });
}

/**
 * 出力から最初の JSON オブジェクトだけを抽出する。
 * ```json ... ``` のコードフェンス、説明文の前置きも捨てる。
 */
function extractJson(text: string): { events?: AiEvent[] } | null {
  // コードフェンス除去
  const fence = text.match(/```json\s*([\s\S]*?)```/i);
  const cand = fence ? fence[1]! : text;
  // 最初の { から最後の } までを取り出す
  const first = cand.indexOf('{');
  const last = cand.lastIndexOf('}');
  if (first < 0 || last < 0 || last <= first) return null;
  const sliced = cand.slice(first, last + 1);
  try {
    return JSON.parse(sliced);
  } catch {
    return null;
  }
}

function sanitize(e: AiEvent): AiEvent | null {
  if (!e || typeof e !== 'object') return null;
  const title = String(e.title ?? '').trim().slice(0, 140);
  const body = String(e.body ?? '').trim().slice(0, 4000);
  if (!title || !body) return null;

  const eventDate =
    typeof e.event_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.event_date)
      ? e.event_date
      : null;
  const eventLocation =
    typeof e.event_location === 'string' && e.event_location.trim()
      ? e.event_location.trim().slice(0, 140)
      : null;
  const sourceUrls = Array.isArray(e.source_urls)
    ? e.source_urls
        .map((s) => ({
          name: String(s?.name ?? '').trim().slice(0, 80),
          url: String(s?.url ?? '').trim(),
        }))
        .filter(
          (s) =>
            s.name && /^https?:\/\/[^\s]+$/.test(s.url),
        )
        .slice(0, 5)
    : [];

  return { title, body, event_date: eventDate, event_location: eventLocation, source_urls: sourceUrls };
}
