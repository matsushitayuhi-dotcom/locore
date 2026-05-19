import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { RecentBoardEvent } from '@/lib/board/recent-events';

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
  /**
   * @deprecated 旧 API。新規には event_start_date / event_end_date を使う。
   * 互換のため Claude が event_date だけを返してきた場合は start=end として扱う。
   */
  event_date?: string | null;
  /**
   * @deprecated 旧 API (event_date_end)。新規には event_end_date を使う。
   */
  event_date_end?: string | null;
  /** YYYY-MM-DD。期間開始日。単日イベントは end と同値。 */
  event_start_date: string | null;
  /** YYYY-MM-DD。期間終了日。単日イベントは start と同値。 */
  event_end_date: string | null;
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
直近 1 週間 (今日から 7 日先まで) のものを丁寧に拾ってください。

# 取材の手順

1. web_search ツールで以下を調べる:
   - 今日から 7 日先までの間にパリで開催される公開イベント
   - パリ市公式・各区役所・主要美術館・新聞 (Le Parisien, Sortir à Paris) など
   - 「Paris events this week」「événements Paris cette semaine」両言語で
   - 旅行者の予定に影響しうる **交通障害・ストライキ** も別途調べる
     キーワード: "grève RATP", "grève SNCF", "manifestation Paris", "perturbation transport"
2. 検索結果のうち、以下の条件をすべて満たすものだけを採用:
   a. 開催日 (または影響日) が今日以降であること
   b. 観光客 or 駐在員が「事前に知っておきたい」内容であること
   c. ソース URL を実際に開いて、日付・場所・名称・規模を確認できること
   d. パリ市内 (または RER 30 分圏内・国際線フライト含む)
3. 拾えたものを 0〜8 件、後述の JSON 形式で出力

# 取り上げるもの (✅) と category タグ

扱うのは **event と transit の 2 カテゴリのみ** です。
各イベントには必ず category を 1 つ付けて返してください。

✅ event (祭り・展覧会・市場・コンサート 等)
- 期間限定のマルシェ、フリーマーケット
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
- これらは「日時 + 影響範囲 + 代替手段」を必ず本文に含めること

❌ 取り上げないもの
- 行政の手続き・締切 (admin) は今回扱いません
- 旬の食材・季節の話題 (food_season) も今回扱いません
- すでに終了したイベント
- 通年常設のもの ("エッフェル塔のライトアップ" など)
- 招待制 / 業界関係者向けレセプション
- 1 回 100 ユーロを超える高額イベント (※ストや空港運休はもちろん例外)
- 日付・規模が不確定な「噂レベル」のデモ予告
- テロ警報・犯罪警報 (別チャネル扱い)
- 政治的・宗教的に偏った集会のうち、観光に直結しないもの

# 文体 — 必ずですます調 (敬体)

本文 (body) は **必ずですます調** で書いてください。
常体 (である調・である) は使いません。語尾は「〜です」「〜ます」「〜ください」「〜になります」等で揃えます。

良い body 例 (○):
  「République 広場で 6/12 (木) から 6/15 (日) まで、フランス各地の小規模生産者が集まる
  クリエイターズマルシェが開催されます。チーズやハチミツ、手工芸品などが並びます。
  入場無料、9 時から 19 時まで。最寄りはメトロ République 駅 (5/3/8/9/11 番線)。
  日曜の昼前後は混雑するため、土曜の午前中の訪問がおすすめです。」

悪い body 例 (×):
  「République 広場でマルシェが開催される。チーズなどが並ぶ。」 (常体)
  「マルシェがあります！」 (内容ゼロ)
  「絶対に行くべき必見イベント！」 (煽り)

# トーン

Locore の編集トーンは「小さな旅行誌」。SNS まとめサイトの煽り口調や、
旅行代理店のセールス文体を絶対に避けてください。

良い title の例 (常体・体言止め OK):
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
      "title": "30 字以内の日本語タイトル (常体・体言止め可)",
      "body": "400 字程度の日本語本文 (350〜450 字目安)。必ずですます調。具体的な場所・日時・行き方・特徴・おすすめの訪問時間帯などを含む。transit の場合は影響範囲と代替手段にも触れる。Markdown 段落 1〜2 つ分。",
      "category": "event|transit",
      "event_start_date": "YYYY-MM-DD (期間開始日。単日イベントなら event_end_date と同じ値)",
      "event_end_date": "YYYY-MM-DD (期間終了日。単日イベントなら event_start_date と同じ値)",
      "event_location": "区名や会場名。例: マレ地区 / Place de la République / Musée d'Orsay",
      "source_urls": [
        { "name": "公式サイト名", "url": "https://..." }
      ]
    }
  ]
}

# 期間イベントの扱い

- マルシェの「5/22-5/26 (5 日間)」やメトロ運休の「6/12-6/14 (3 日間連続運休)」
  のように複数日にまたがる場合は、event_start_date と event_end_date の両方を
  異なる値で埋めること（例: start=2026-05-22, end=2026-05-26）
- 単日イベント (1 日だけ開催) の場合は event_start_date と event_end_date を
  必ず同じ値にすること（例: start=2026-05-22, end=2026-05-22）
- 両方とも YYYY-MM-DD 形式、必須項目。どちらか一方が確定できないイベントは
  出力に含めず、その項目自体を捨てる
- 期間が 30 日を超える長期イベントは原則出さない (常設扱いになる)

# 厳守ルール

- 日付 (event_start_date / event_end_date) が両方確認できないイベントは出さない
- 創作禁止。検索結果に存在しないイベントを書いてはいけない
- 0 件しか取れなかった場合は { "events": [] } を返す (無理に水増ししない)
- category は必ず event か transit のどちらか。それ以外は出力しない
- 本文は必ずですます調。常体が混ざっていたら自分で書き直してから出力する
- 1 件でも質の低いものを混ぜないこと。**質の高い 5 件 > 質の低い 8 件**
- title / body の文字数を逸脱したら、自分で調整してから出力する`;

/**
 * Claude にパリの当週イベントを問い合わせ、JSON で取り出す。
 * DB 書き込みは含まないので呼び出し側で挿入する。
 *
 * `recentEvents` を渡すと、プロンプトに「既出リスト」セクションを差し込み、
 * AI に semantic な重複（同じ催し物の別日付、同じメトロ停止の続報など）を
 * 自前で除外させる。空配列なら既出セクションは出力しない。
 */
export async function fetchAiParisEvents(
  recentEvents: RecentBoardEvent[] = [],
): Promise<RunAiResult> {
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
  const inSevenDays = fmtDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
  const weekdayJa = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
  }).format(now);

  // 既出イベントを Claude に見せて semantic な重複を弾かせる
  const recentSection = buildRecentSection(recentEvents);

  const userPrompt = `# 今日の情報

- パリ現地日付: ${today}（${weekdayJa}）
- 取材対象期間: ${today} 〜 ${inSevenDays}（7 日先まで）
${recentSection}
# 依頼

上記の期間中にパリで以下の 2 種類だけを調べてください:

1. **イベント (category=event)**:
   観光客 or 駐在員が知っておきたい催し (展覧会、マルシェ、コンサート等)
2. **交通障害 (category=transit)**:
   発表済みのストライキ、地下鉄運休、空港混乱、デモによる封鎖など、
   旅行者の予定に直結する情報

行政の締切 (admin) や旬の食材 (food_season) は今回扱わないので、
これらは見つけても出力に含めないでください。

system プロンプトの「取り上げるもの・取り上げないもの」「トーン」「厳守ルール」
を必ず守ったうえで、最終的に { "events": [...] } の JSON だけを返してください。

最大 8 件まで。質の高いものが 5 件未満しか見つからなければ、見つかったぶんだけで構いません。
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
      prompt: { today, inEightDays: inSevenDays, weekdayJa },
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

/**
 * 今回のプロンプトで扱う category は event と transit のみ。
 * Claude が誤って admin / food_season などを返してきた場合、
 * その項目は出力対象から外す。
 */
const ACCEPTED_CATEGORIES = ['event', 'transit'] as const;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pickIsoDate(v: unknown): string | null {
  return typeof v === 'string' && ISO_DATE_RE.test(v) ? v : null;
}

function sanitize(e: AiEvent): AiEvent | null {
  if (!e || typeof e !== 'object') return null;
  const title = String(e.title ?? '').trim().slice(0, 140);
  const body = String(e.body ?? '').trim().slice(0, 4000);
  if (!title || !body) return null;

  // 新フィールドを優先しつつ、旧 event_date / event_date_end も受け付ける
  const newStart = pickIsoDate(e.event_start_date);
  const newEnd = pickIsoDate(e.event_end_date);
  const legacyStart = pickIsoDate(e.event_date);
  const legacyEnd = pickIsoDate(e.event_date_end);

  // start を確定: 新 > 旧 event_date
  const startDate = newStart ?? legacyStart;
  // end を確定: 新 > 旧 event_date_end > (start で fallback)
  let endDate = newEnd ?? legacyEnd ?? startDate;

  // start が無いイベントは捨てる
  if (!startDate) return null;
  if (!endDate) endDate = startDate;
  // end が start より前なら swap (Claude のミス保険)
  let finalStart = startDate;
  let finalEnd = endDate;
  if (finalEnd < finalStart) {
    finalStart = endDate;
    finalEnd = startDate;
  }

  // 後方互換のため event_date には start を入れておく
  const eventDate = finalStart;
  const eventDateEnd = finalEnd;
  const eventLocation =
    typeof e.event_location === 'string' && e.event_location.trim()
      ? e.event_location.trim().slice(0, 140)
      : null;
  // category: event/transit 以外を Claude が出してきたらドロップする。
  // 未指定 (空・未文字列) の場合だけ 'event' にフォールバック。
  let category: AiEventCategory;
  if (e.category === 'event' || e.category === 'transit') {
    category = e.category;
  } else if (typeof e.category !== 'string' || !e.category.trim()) {
    category = 'event';
  } else {
    // 'admin' / 'food_season' / その他 → この項目自体を捨てる
    return null;
  }
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
    event_start_date: finalStart,
    event_end_date: finalEnd,
    event_location: eventLocation,
    category,
    source_urls: sourceUrls,
  };
}

/**
 * 既出イベントリストをプロンプトに差し込むためのセクション文字列を組む。
 * recent が空のときは空文字を返す。
 */
function buildRecentSection(recent: RecentBoardEvent[]): string {
  if (!recent || recent.length === 0) return '';
  const lines = recent
    .slice(0, 80)
    .map((r) => {
      const start = r.eventStartDate ?? r.eventDate;
      const end = r.eventEndDate ?? r.eventDate;
      const date =
        start && end && start !== end
          ? `${start}〜${end}`
          : (start ?? end ?? '日付不明');
      const loc = r.eventLocation ?? '場所不明';
      // タイトルだけは原文を尊重しつつ、改行混入を除去
      const title = r.title.replace(/\s+/g, ' ').trim();
      return `- ${title} / ${date} / ${loc}`;
    })
    .join('\n');
  return `
# 既出（重複避け）

過去 30 日に既にこの掲示板に出している内容を下に列挙します。
**これらと実質的に同じイベントは、新しい候補から完全に除外してください**。
判定基準は「人間が見て『あ、これ前にも見たな』と感じるもの全て」です。
具体例:
- 同じ催し物の別日付（例: 同じ美術館の同じ無料開放キャンペーン）
- 同じ事案の続報（例: 同じメトロ路線・同じ期間の運休、ストの延長）
- 表現や切り口が違うだけの同じイベント

既出リスト（タイトル / 日付 / 場所）:
${lines}
`;
}

/**
 * タイトル正規化:
 *  - NFKC で全角→半角・互換正規化
 *  - 小文字化
 *  - 主な句読点・記号類を空白へ
 *  - 連続空白を 1 つに圧縮し trim
 *
 * Editorial Light トーンを崩さないため、原文タイトル自体には触らず
 * 重複判定の比較キーとしてだけ使う。
 */
export function normalizeTitle(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[、。,.!?！？「」『』【】\[\](){}〜~・:：;；/／\\|｜＿_\-–—"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * AI が返してきた候補を、既出イベントと突き合わせて重複だけ落とす。
 *
 * 3 段階のチェック:
 *  1. 正規化タイトル完全一致
 *  2. タイトル先頭 18 文字一致（末尾の枝葉を許容。10 字未満は対象外）
 *  3. 同じ event_date ± 24h かつ event_location が同一
 *
 * AI 側のセマンティック判定をすり抜けたものを念のため拾う「二重防御」レイヤ。
 *
 * 将来課題:
 *   - 重複と判定された候補で、既存レコードの body / event_date_end /
 *     source_urls だけを UPDATE する運用（停止区間拡大・期間延長などの続報）。
 *   - 別イベントとして残すべきか上書きかの判定が難しいので MVP では skip のみ。
 */
export function dedupAgainstRecent(
  candidates: AiEvent[],
  recent: RecentBoardEvent[],
): {
  kept: AiEvent[];
  dropped: Array<{ candidate: AiEvent; reason: string }>;
} {
  const kept: AiEvent[] = [];
  const dropped: Array<{ candidate: AiEvent; reason: string }> = [];

  const recentTitleSet = new Set(recent.map((r) => normalizeTitle(r.title)));
  const recentTitlePrefixes = new Set(
    recent
      .map((r) => normalizeTitle(r.title).slice(0, 18))
      .filter((s) => s.length >= 10),
  );

  const DAY_MS = 24 * 60 * 60 * 1000;

  for (const c of candidates) {
    const ct = normalizeTitle(c.title);

    // 1. 正規化タイトル完全一致
    if (ct && recentTitleSet.has(ct)) {
      dropped.push({ candidate: c, reason: 'title-exact' });
      continue;
    }

    // 2. タイトル先頭 18 文字一致
    const prefix = ct.slice(0, 18);
    if (prefix.length >= 10 && recentTitlePrefixes.has(prefix)) {
      dropped.push({ candidate: c, reason: 'title-prefix' });
      continue;
    }

    // 3. 同じ開始日 ± 24h + 同じ場所
    //    期間イベントも start_date で比較する。期間延長などの続報は
    //    別レコードとして残し、UPDATE 運用は将来課題に置く。
    const cStart = c.event_start_date ?? c.event_date ?? null;
    const cDateMs = cStart ? Date.parse(cStart) : NaN;
    const cLoc = normalizeTitle(c.event_location ?? '');
    const sameDayAndPlace =
      !Number.isNaN(cDateMs) &&
      cLoc.length > 0 &&
      recent.some((r) => {
        const rStart = r.eventStartDate ?? r.eventDate ?? null;
        if (!rStart || !r.eventLocation) return false;
        const rDateMs = Date.parse(rStart);
        if (Number.isNaN(rDateMs)) return false;
        if (Math.abs(cDateMs - rDateMs) > DAY_MS) return false;
        const rLoc = normalizeTitle(r.eventLocation);
        return rLoc.length > 0 && rLoc === cLoc;
      });
    if (sameDayAndPlace) {
      dropped.push({ candidate: c, reason: 'same-date-location' });
      continue;
    }

    kept.push(c);
  }

  return { kept, dropped };
}
