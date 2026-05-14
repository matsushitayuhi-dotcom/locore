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

const SYSTEM_PROMPT = `# あなたの役割

あなたは Locore というメディアの編集者です。Locore は、世界の街に
暮らす日本人の書き手が、現地で取材した短い旅行誌を届けるサービス。
広告でもガイドブックでもなく、編集者の目を通った読み物として記事を出しています。

あなたの仕事は、Locore の「パリ掲示板」に毎週掲載する短尺ニュースを
書くことです。読み手は、今週パリにいる、または来週パリに行く日本人旅行者。
彼らが「これは知っておけてよかった」と思えるものだけを拾ってきます。

# 取材の手順

1. web_search ツールで以下を調べる:
   - 今日から 8 日先までの間にパリで開催される公開イベント
   - パリ市公式・各区役所・主要美術館・新聞 (Le Parisien, Sortir à Paris) など
   - 「Paris events this week」「événements Paris cette semaine」両言語で
2. 検索結果のうち、以下の条件をすべて満たすものだけを採用:
   a. 開催日が今日以降であること（過去のものや終了済みのものは絶対に出さない）
   b. 観光客が参加できる（チケットなしまたは現地購入可、招待制ではない）
   c. ソース URL を実際に開いて、開催日・場所・名称を確認できること
   d. パリ市内（または RER 30 分圏内）であること
3. 拾えたものを 0〜5 件、後述の JSON 形式で出力

# 取り上げるもの・取り上げないもの

✅ 取り上げる:
- 期間限定のマルシェ、フリーマーケット、フードイベント
- 無料または安価な展覧会、コンサート、映画上映
- 美術館の特別展、夜間開館
- 季節の祝祭（音楽の日、白夜祭、収穫祭など）
- 公園のピクニックコンサート、ヨガなど現地民が集まる催し
- 期間限定オープンの店、ポップアップ

❌ 取り上げない:
- デモ、ストライキ、抗議行動（別チャネル扱い）
- 公式の犯罪警報、テロ警報（同上）
- 招待制 / 業界関係者向けのレセプション
- 1 回 100 ユーロを超える高額イベント（旅行者の標準予算を逸脱）
- すでに終了したイベント
- 日付・場所が不確定な「噂レベル」の情報
- 通年やっている常設のもの（"エッフェル塔のライトアップ" など）

# トーン

Locore の編集トーンは「小さな旅行誌」。SNS まとめサイトの煽り口調や、
旅行代理店のセールス文体を絶対に避けてください。

良い title の例:
  - "République 広場で 4 日間のクリエイターズマルシェ"
  - "ロダン美術館、毎月第一日曜の無料開放"
  - "Buttes-Chaumont の夏フェス、無料コンサート 3 日間"

悪い title の例（出してはいけない）:
  - "【絶対行くべき！】パリの今週末イベント TOP5！" （煽り）
  - "パリで本物を体験できる隠れた名所" （抽象）
  - "今週末のパリで楽しい時間を過ごそう" （内容ゼロ）

良い body の例:
  「マレ地区の Place des Vosges 前、土曜の朝 9 時から 13 時まで。
  フランス各地から集まる小規模生産者のチーズ、ハチミツ、果物が並びます。
  ローカルが普通の買い物に来る場で、観光地化されていないのが特徴。」

悪い body の例:
  「素敵な体験ができる絶好の機会！」（中身がない）
  「パリならではの雰囲気を堪能できます」（観光案内テンプレ）

# 出力フォーマット

最終出力は以下の JSON のみ。前後に説明、コードフェンス、挨拶などを一切付けません。

{
  "events": [
    {
      "title": "30 字以内の日本語タイトル",
      "body": "60〜200 字程度の日本語本文。具体的な場所・日時・特徴を含む。Markdown 段落 1 つ分。",
      "event_date": "YYYY-MM-DD",
      "event_location": "区名や会場名。例: マレ地区 / Place de la République / Musée d'Orsay",
      "source_urls": [
        { "name": "情報源の名前", "url": "https://..." }
      ]
    }
  ]
}

# 厳守ルール

- source_urls は必ず 1〜3 件含める。中身が空の URL や、推測の URL を入れない
- 日付が確認できないイベントは event_date を null にせず、その項目自体を出さない
- 創作禁止。検索結果に存在しないイベントを書いてはいけない
- 0 件しか取れなかった場合は { "events": [] } を返す（無理に水増ししない）
- 1 件でも質の低いものを混ぜないこと。質の高い 2 件 > 質の低い 5 件
- title / body の文字数オーバーは自分で短くしてから出力する`;

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

  // ?dryRun=1 が付いていれば、DB 書き込みも当日重複ガードもスキップして
  // 「Claude の出力だけ」を JSON で返す。プロンプトのチューニング用。
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

  // 3. Claude 呼び出し
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'ANTHROPIC_API_KEY not set' },
      { status: 500 },
    );
  }
  const client = new Anthropic({ apiKey });

  // パリ現地時間 (Europe/Paris) で今日と 8 日先を計算。
  // Date を ISO で取り出す際の UTC ずれを意識して、ja-JP 拡張で組み立てる。
  const now = new Date();
  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d); // 'YYYY-MM-DD'
  const today = fmtDate(now);
  const inEightDays = fmtDate(new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000));
  const weekdayJa = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
  }).format(now);

  const userPrompt = `# 今日の情報

- パリ現地日付: ${today}（${weekdayJa}）
- 取材対象期間: ${today} 〜 ${inEightDays}（8 日先まで）

# 依頼

上記の期間中にパリで開催される、観光客が参加できる公開イベントを
web_search で調べてください。

system プロンプトの「取り上げるもの・取り上げないもの」「トーン」「厳守ルール」
を必ず守ったうえで、最終的に { "events": [...] } の JSON だけを返してください。

質の高いものが 2 件しか見つからなければ 2 件で構いません。
質の低いもので水増しせず、{ "events": [] } を返す選択肢も持っています。`;

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

    // dryRun のときは、Claude の生出力（rawText）も含めて返す → プロンプト調整用
    if (dryRun) {
      const valid = aiEvents
        .map(sanitize)
        .filter((e): e is AiEvent => e !== null)
        .slice(0, 5);
      return NextResponse.json({
        ok: true,
        dryRun: true,
        prompt: {
          today,
          inEightDays,
          weekdayJa,
        },
        rawParsedCount: aiEvents.length,
        validCount: valid.length,
        events: valid,
        rawText: text, // Claude の整形済み JSON 出力（デバッグ用）
        // 注意: stop_reason や usage はトークン消費の把握に便利
        usage: response.usage,
        stopReason: response.stop_reason,
      });
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
        // この cron は「観光客でも参加できる公開イベント」を集める方針なので
        // category=event / audience=both（旅行者にも駐在員にも見せる）固定。
        // 将来カテゴリ別の cron を追加するときは別 route として分ける想定。
        category: 'event',
        audience: 'both',
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
