/**
 * JSON-LD（schema.org）構造化データの純関数群。
 *
 * v2 ブログ再位置付け: 記事は SEO 集客装置なので、記事ページに Article、
 * 著者（エキスパート）に Person を出して検索エンジンに正しく伝える。
 * ここは server / client どちらからも使える依存なしの純関数のみ。
 * 使う側は <script type="application/ld+json"> に jsonLdScriptText() で埋め込む。
 */

/**
 * JSON-LD を <script> に安全に埋め込むための文字列化。
 *
 * displayName / bio / 記事タイトル等はユーザー入力なので、素の JSON.stringify を
 * dangerouslySetInnerHTML に渡すと `</script><script>...` で stored XSS になる。
 * HTML 上意味を持つ < > & を JSON の \uXXXX エスケープに置換する（JSON としては
 * 等価なので構造化データの解釈には影響しない）。
 */
export function jsonLdScriptText(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
}

export type ArticleJsonLdInput = {
  /** 記事の絶対 URL または相対パス（metadataBase 前提なら相対で可） */
  url: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  /** ISO 8601 */
  publishedAt?: string | null;
  authorName?: string | null;
  /** 著者ページ（/experts/[id] or /users/[id]）の URL */
  authorUrl?: string | null;
};

export function articleJsonLd(input: ArticleJsonLdInput): Record<string, unknown> {
  const author = input.authorName
    ? {
        '@type': 'Person',
        name: input.authorName,
        ...(input.authorUrl ? { url: input.authorUrl } : {}),
      }
    : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    headline: input.title,
    ...(input.description ? { description: input.description } : {}),
    ...(input.coverImageUrl ? { image: [input.coverImageUrl] } : {}),
    ...(input.publishedAt ? { datePublished: input.publishedAt } : {}),
    ...(author ? { author } : {}),
    publisher: { '@type': 'Organization', name: 'Locore' },
    inLanguage: 'ja',
  };
}

export type PersonJsonLdInput = {
  /** 人物ページの URL（/experts/[id] 等） */
  url: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  /** 例: '輸入雑貨会社 経営' */
  jobTitle?: string | null;
  /** 在住地（例: 'パリ'） */
  homeLocation?: string | null;
};

export function personJsonLd(input: PersonJsonLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.imageUrl ? { image: input.imageUrl } : {}),
    ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
    ...(input.homeLocation
      ? { homeLocation: { '@type': 'Place', name: input.homeLocation } }
      : {}),
  };
}

/**
 * 記事本文（markdown / HTML 混在）から meta description 用の冒頭抜粋を作る。
 * タグ・markdown 記法・連続空白を落として maxLen 文字に丸める。
 *
 * md 記号は行頭のマーカー（見出し・引用・リスト・罫線）だけ落とす。
 * 語中の -_~| まで消すと「Wi-Fi」「2026-09-04」「snake_case」等が壊れるため。
 */
export function extractDescription(
  body: string | null | undefined,
  maxLen = 120,
): string {
  if (!body) return '';
  const text = body
    .replace(/<[^>]+>/g, ' ') // HTML タグ
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // md 画像
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // md リンク → テキスト
    .replace(/^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/gm, ' ') // 水平線
    .replace(/^[ \t]*(?:#{1,6}|>+|[-*+]|\d+\.)[ \t]+/gm, '') // 行頭マーカー
    .replace(/[*`]+/g, '') // 強調・コード記号（語中でも安全に消せるもののみ）
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&') // 二重デコードを避けるため最後
    .replace(/\s+/g, ' ')
    .trim();
  // サロゲートペア（絵文字等）を分断しないようコードポイント単位で丸める
  const chars = Array.from(text);
  if (chars.length <= maxLen) return text;
  return `${chars.slice(0, maxLen).join('')}…`;
}
