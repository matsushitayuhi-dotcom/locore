/**
 * JSON-LD（schema.org）構造化データの純関数群。
 *
 * v2 ブログ再位置付け: 記事は SEO 集客装置なので、記事ページに Article、
 * 著者（エキスパート）に Person を出して検索エンジンに正しく伝える。
 * ここは server / client どちらからも使える依存なしの純関数のみ。
 * 使う側は <script type="application/ld+json"> に JSON.stringify して埋め込む。
 */

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
    .replace(/[#>*`_~\-|]+/g, ' ') // md 記号
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}
