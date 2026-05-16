import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

/**
 * パリ・イベント自動収集の Claude 呼び出しを 1 ファイルに集約。
 *
 * - Vercel Cron (`/api/cron/ai-paris-events`) から呼ばれる本番経路
 * - 管理画面 (`/admin/board` の "AI テスト" ボタン) から呼ばれるテスト経路
 * の両方が `runAiParisEvents()` を共用する。
 *
 * 本番呼び出し時のみ DB に書き込む。dryRun: true なら parsed events と
 * 生レスポンスを返すだけで DB は触らない。
 */

/**
 * Claude が返す 1 つのイベント。
 *
 * category は board_posts.category と同じ enum 値に揃える:
 *   - 'event'           通常のイベント (祭り・展覧会・マルシェ等)
 *   - 'transit'         交通障害 (ストライキ・運休・大規模工事)
 *   - 'admin'           行政の締切・公的手続き関連
 *   - 'food_season'     旬の食材・季節限定
 *   - 'community'       邦人コミュニティ催し
 *   - 'family_edu'      子育て・教育関連
 *   - 'health_weather'  天候警報・健康注意 (基本は出さない)
 */
export type AiEventCategory =
  | 'event'
  | 'transit'
  | 'admin'
  | 'food_season'
  | 'community'
  | 'family_edu'
  | 'health_weather';

export type AiEvent = {
  title: string;
  body: string;
  /** YYYY-MM-DD。複数日にまたがるイベントは「開始日」を入れる */
  event_date: string | null;
  /** YYYY-MM-DD。複数日にまたがる場合の終了日 (1 日のみなら null) */
  event_date_end?: string | null;
  event_location: string | null;
  category: AiEventCategory;
  source_urls: Array<{ name: string; url: string }>;
};

export type RunAiResult = {
  ok: boolean;
  /** parse 成功した raw events 数（バリデーション前） */
  rawParsedCount?: number;
  /** バリデーションを通って実際に DB / レスポンスに乗る件数 */
  validCount?: number;
  events?: AiEvent[];
  /** Claude の text 連結出力（デバッグ表示用） */
  rawText?: string;
  /** プロンプト構築に使った日付情報 */
  prompt?: { today: string; inEightDays: string; weekdayJa: string };
  usage?: unknown;
  stopReason?: string | null;
  error?: string;
};

const SYSTEM_PROMPT = `# あなたの役割

あなたは Locore というメディアの編集者です。Locore は、世界の街に
暮らす日本人の書き手が、現地で取材した短い旅行誌を届けるサービス。
広告でもガイドブックでもなく、編集者の目を通った読み物として記事を出しています。

あなたの仕事は、Locore の「パリ・イベントカレンダー」に蓄積していく
短尺ニュースを書くことです。読み手は、今パリにいる・近々来る日本人旅行者と、
パリに住む駐在員。彼らが「これは知っておけてよかった」と思えるものだけを拾ってきます。

カレンダーは毎週この cron で積み上がるので、同じイベントは 2 度出さず、
未来 30 日分を網羅的に埋めていくイメージで取材してください。

# 取材の手順

1. web_search ツールで以下を調べる:
   - 今日から 30 日先までの間にパリで開催される公開イベント
   - パリ市公式・各区役所・主要美術館・新聞 (Le Parisien, Sortir à Paris) など
   - 「Paris events this month」「événements Paris ce mois」両言語で
   - 旅行者の予定に影響しうる **交通障害・ストライキ** も別途調べる
     キーワード: "grève RATP", "grève SNCF", "manifestation Paris", "perturbation transport"
2. 検索結果のうち、以下の条件をすべて満たすものだけを採用:
   a. 開催日 (または影響日) が今日以降であること
   b. 観光客 or 駐在員が「事前に知っておきたい」内容であること
   c. ソース URL を実際に開いて、日付・場所・名称・規模を確認できること
   d. パリ市内 (または RER 30 分圏内・国際線フライト含む)
3. 拾えたものを 0〜8 件、後述の JSON 形式で出力

# 取り上げるもの (✅) と category タグ

各イベントには必ず category を 1 つ付けて返してください。

✅ event (祭り・展覧会・市場)
- 期間限定のマルシェ、フリーマーケット、フードイベント
- 無料または安価な展覧会、コンサート、映画上映
- 美術館の特別展、夜間開館
- 季節の祝祭 (音楽の日、白夜祭、収穫祭など)
- 公園のピクニックコンサート、ヨガなど現地民が集まる催し
- 期間限定オープンの店、ポップアップ

✅ transit (交通障害・ストライキ — 旅行者の予定に直結)
- RATP / SNCF / Air France のストライキ予定
- 地下鉄路線の大規模工事・運休
- CDG / Orly 空港の混乱情報 (大規模ストや警報レベル)
- 大規模デモによる道路封鎖 (シャンゼリゼ、共和国広場周辺など)
- これらは「日時 + 影響範囲 + 代替手段」を必ず本文に書く

✅ admin (行政の締切 — 駐在員向け、頻度は少なめ)
- 滞在許可申請の受付開始日、税金申告期限など
- 駐在員が見落としやすい締切のみ

✅ food_season (旬の食材・季節限定 — 軽い話題)
- イチゴ・桃・トリュフ・牡蠣の解禁、季節終了など

❌ 取り上げないもの
- すでに終了したイベント
- 通年常設のもの ("エッフェル塔のライトアップ" など)
- 招待制 / 業界関係者向けレセプション
- 1 回 100 ユーロを超える高額イベント (※ストや空港運休はもちろん例外)
- 日付・規模が不確定な「噂レベル」のデモ予告
- テロ警報・犯罪警報 (別チャネル扱い)
- 政治的・宗教的に偏った集会のうち、観光に直結しないもの

# トーン

Locore の編集トーンは「小さな旅行誌」。SNS まとめサイトの煽り口調や、
旅行代理店のセールス文体を絶対に避けてください。

良い title の例:
  - "République 広場で 4 日間のクリエイターズマルシェ"
  - "ロダン美術館、毎月第一日曜の無料開放"
  - "RATP メトロ 6 号線、6/12 (木) 全線運休"
  - "Air France 客室乗務員ストライキ、6/15-16"

悪い title の例 (出してはいけない):
  - "【絶対行くべき！】パリの今週末イベント TOP5！" (煽り)
  - "パリで本物を体験できる隠れた名所" (抽象)
  - "今週末のパリで楽しい時間を過ごそう" (内容ゼロ)

# 出力フォーマット

最終出力は以下の JSON のみ。前後に説明、コードフェンス、挨拶などを一切付けません。

{
  "events": [
    {
      "title": "30 字以内の日本語タイトル",
      "body": "60〜200 字程度の日本語本文。具体的な場所・日時・特徴を含む。Markdown 段落 1 つ分。transit の場合は代替手段にも触れる。",
      "category": "event|transit|admin|food_season",
      "event_date": "YYYY-MM-DD",
      "event_date_end": "YYYY-MM-DD or null",
      "event_location": "区名や会場名。例: マレ地区 / Place de la République / Musée d'Orsay",
      "source_urls": [
        { "name": "公式サイト名", "url": "https://..." }
      ]
    }
  ]
}

# 厳守ルール

- 日付が確認できないイベントは event_date を null にせず、その項目自体を出さない
- 創作禁止。検索結果に存在しないイベントを書いてはいけない
- 0 件しか取れなかった場合は { "events": [] } を返す (無理に水増ししない)
- category は必ず正確に。transit を event と書いたりしないこと
- 1 件でも質の低いものを混ぜないこと。質の高い 2 件 > 質の低い 8 件
- title / body の文字数オーバーは自分で短くしてから出力する`;

/**
 * Claude にパリの当週イベントを問い合わせ、JSON で取り出す。
 * DB 書き込みは含まないので呼び出し側で挿入する。
 */
export async function fetchAiParisEvents(): Promise<RunAiResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'ANTHROPIC_API_KEY not set' };
  }
  const client = new Anthropic({ apiKey });

  // パリ現地時間の日付を組み立てる
  const now = new Date();
  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  const today = fmtDate(now);
  const in30Days = fmtDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
  const weekdayJa = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
  }).format(now);

  const userPrompt = `# 今日の情報

- パリ現地日付: ${today}（${weekdayJa}）
- 取材対象期間: ${today} 〜 ${in30Days}（30 日先まで）

# 依頼

上記の期間中にパリで以下を調べてください:

1. **イベント (category=event)**:
   観光客 or 駐在員が知っておきたい催し (展覧会、マルシェ、コンサート等)
2. **交通障害 (category=transit)**:
   発表済みのストライキ、地下鉄運休、空港混乱、デモによる封鎖など、
   旅行者の予定に直結する情報
3. **行政の重要締切 (category=admin)**:
   駐在員が見落としやすい公的手続きの締切 (出ない週はゼロで OK)
4. **季節の食材 (category=food_season)**:
   旬の食材の解禁・終了など軽い話題 (季節の変わり目だけ)

system プロンプトの「取り上げるもの・取り上げないもの」「トーン」「厳守ルール」
を必ず守ったうえで、最終的に { "events": [...] } の JSON だけを返してください。

最大 8 件まで。質の高いものが 2 件しか見つからなければ 2 件で構いません。
質の低いもので水増しせず、{ "events": [] } を返す選択肢も持っています。`;

  try {
    // web_search_20250305 は新型ツール。SDK の型 (`Tool`) 未反映なのでキャスト
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

    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    const json = extractJson(text);
    const rawEvents: AiEvent[] =
      json && Array.isArray(json.events) ? (json.events as AiEvent[]) : [];

    const valid = rawEvents
      .map(sanitize)
      .filter((e): e is AiEvent => e !== null)
      .slice(0, 8);

    return {
      ok: true,
      rawParsedCount: rawEvents.length,
      validCount: valid.length,
      events: valid,
      rawText: text,
      prompt: { today, inEightDays: in30Days, weekdayJa },
      usage: response.usage,
      stopReason: response.stop_reason,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[fetchAiParisEvents] anthropic error', err);
    return { ok: false, error: msg };
  }
}

/**
 * 出力から最初の JSON オブジェクトだけを抽出する。
 * ```json ... ``` のコードフェンス、説明文の前置きも捨てる。
 */
function extractJson(text: string): { events?: AiEvent[] } | null {
  const fence = text.match(/```json\s*([\s\S]*?)```/i);
  const cand = fence ? fence[1]! : text;
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

const VALID_CATEGORIES: AiEventCategory[] = [
  'event',
  'transit',
  'admin',
  'food_season',
  'community',
  'family_edu',
  'health_weather',
];

function sanitize(e: AiEvent): AiEvent | null {
  if (!e || typeof e !== 'object') return null;
  const title = String(e.title ?? '').trim().slice(0, 140);
  const body = String(e.body ?? '').trim().slice(0, 4000);
  if (!title || !body) return null;

  const eventDate =
    typeof e.event_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.event_date)
      ? e.event_date
      : null;
  // event_date_end は任意
  const eventDateEnd =
    typeof e.event_date_end === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.event_date_end)
      ? e.event_date_end
      : null;
  const eventLocation =
    typeof e.event_location === 'string' && e.event_location.trim()
      ? e.event_location.trim().slice(0, 140)
      : null;
  // category。未指定や不正値は 'event' にフォールバック
  const category: AiEventCategory =
    typeof e.category === 'string' &&
    (VALID_CATEGORIES as string[]).includes(e.category)
      ? (e.category as AiEventCategory)
      : 'event';
  const sourceUrls = Array.isArray(e.source_urls)
    ? e.source_urls
        .map((s) => ({
          name: String(s?.name ?? '').trim().slice(0, 80),
          url: String(s?.url ?? '').trim(),
        }))
        .filter((s) => s.name && /^https?:\/\/[^\s]+$/.test(s.url))
        .slice(0, 5)
    : [];

  return {
    title,
    body,
    event_date: eventDate,
    event_date_end: eventDateEnd,
    event_location: eventLocation,
    category,
    source_urls: sourceUrls,
  };
}
