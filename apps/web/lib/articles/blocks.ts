import { z } from 'zod';

/**
 * ブログ記事の本文ブロック（0091・docs/blog-article-page-research.md §5〜6）。
 *
 * 執筆画面（/writer/articles/[id]/write）はこの配列を編集し、表示（components/articles/Prose）は
 * ブロックごとの部品で描く。旧記事（body のプレーンテキスト）は legacyBodyToBlocks で段落に分割する。
 *
 * 文中の装飾は最小限（**太字** と [文字](URL) だけ）。HTML は持たない。
 */

export const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'list',
  'quote',
  'aside',
  'table',
  'image',
  'images',
  'takeaways',
  'checklist',
  'faq',
  'terms',
  'timeline',
  'proscons',
  'stats',
  'footnotes',
  'divider',
  'link_card',
  'embed',
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const EMBED_PROVIDERS = ['youtube', 'gmap', 'x', 'instagram', 'tiktok', 'spotify', 'other'] as const;
export type EmbedProvider = (typeof EMBED_PROVIDERS)[number];

export type LinkPreviewLite = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

const id = z.string().min(1).max(40);
const text = z.string().max(4000);
const short = z.string().max(300);
const url = z.string().url().max(2048);
const preview = z
  .object({
    title: z.string().max(300).nullable(),
    description: z.string().max(600).nullable(),
    imageUrl: z.string().max(2048).nullable(),
    siteName: z.string().max(120).nullable(),
  })
  .optional();

export const blockSchema = z.discriminatedUnion('type', [
  z.object({ id, type: z.literal('paragraph'), text }),
  z.object({ id, type: z.literal('heading'), level: z.union([z.literal(2), z.literal(3)]), text: short, numbered: z.boolean().optional() }),
  z.object({ id, type: z.literal('list'), style: z.enum(['bullet', 'number']), items: z.array(short).max(30) }),
  z.object({ id, type: z.literal('quote'), text, cite: short.optional() }),
  z.object({ id, type: z.literal('aside'), kind: z.enum(['point', 'caution', 'memo']), label: short.optional(), text }),
  z.object({ id, type: z.literal('table'), header: z.boolean().optional(), rows: z.array(z.array(short).max(8)).max(40) }),
  z.object({ id, type: z.literal('image'), url, caption: short.optional(), alt: short.optional() }),
  z.object({ id, type: z.literal('images'), urls: z.array(url).min(1).max(4), caption: short.optional() }),
  z.object({ id, type: z.literal('takeaways'), items: z.array(short).max(8) }),
  z.object({ id, type: z.literal('checklist'), items: z.array(z.object({ text: short, done: z.boolean().optional() })).max(30) }),
  z.object({ id, type: z.literal('faq'), items: z.array(z.object({ q: short, a: text })).max(20) }),
  z.object({ id, type: z.literal('terms'), items: z.array(z.object({ term: short, def: text })).max(30) }),
  z.object({ id, type: z.literal('timeline'), items: z.array(z.object({ date: short, text: text })).max(30) }),
  z.object({ id, type: z.literal('proscons'), pros: z.array(short).max(10), cons: z.array(short).max(10) }),
  z.object({ id, type: z.literal('stats'), items: z.array(z.object({ value: short, label: short })).min(1).max(4) }),
  z.object({ id, type: z.literal('footnotes'), items: z.array(short).max(30) }),
  z.object({ id, type: z.literal('divider') }),
  z.object({
    id,
    type: z.literal('link_card'),
    url,
    kind: z.enum(['article', 'expert', 'external']),
    targetId: z.string().uuid().optional(),
    preview,
  }),
  z.object({
    id,
    type: z.literal('embed'),
    url,
    provider: z.enum(EMBED_PROVIDERS),
    videoId: z.string().max(64).optional(),
    preview,
  }),
]);

export type ArticleBlock = z.infer<typeof blockSchema>;
export const blocksSchema = z.array(blockSchema).max(400);

export function newBlockId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** 未知の値を安全にブロック配列へ（壊れた要素は捨てる） */
export function parseBlocks(raw: unknown): ArticleBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: ArticleBlock[] = [];
  for (const b of raw) {
    const r = blockSchema.safeParse(b);
    if (r.success) out.push(r.data);
  }
  return out;
}

/** 旧記事（プレーンテキスト / 簡易 Markdown）を段落ブロックに。空行で区切り、"## " は見出し */
export function legacyBodyToBlocks(body: string): ArticleBlock[] {
  const out: ArticleBlock[] = [];
  const chunks = body.replace(/\r\n/g, '\n').split(/\n{2,}/);
  for (const raw of chunks) {
    const t = raw.trim();
    if (!t) continue;
    if (/^#{2,3}\s+/.test(t)) {
      out.push({ id: newBlockId(), type: 'heading', level: t.startsWith('###') ? 3 : 2, text: t.replace(/^#{2,3}\s+/, '').slice(0, 300) });
      continue;
    }
    if (/^>\s?/.test(t)) {
      out.push({ id: newBlockId(), type: 'quote', text: t.replace(/^>\s?/gm, '') });
      continue;
    }
    const lines = t.split('\n');
    if (lines.length > 1 && lines.every((l) => /^[-*・]\s+/.test(l))) {
      out.push({ id: newBlockId(), type: 'list', style: 'bullet', items: lines.map((l) => l.replace(/^[-*・]\s+/, '').slice(0, 300)) });
      continue;
    }
    out.push({ id: newBlockId(), type: 'paragraph', text: t });
  }
  return out;
}

/** 検索・要約・読了時間用のプレーンテキスト */
export function blocksToPlainText(blocks: ArticleBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'paragraph':
      case 'quote':
      case 'aside':
      case 'heading':
        parts.push(b.text);
        break;
      case 'list':
      case 'takeaways':
      case 'footnotes':
        parts.push(b.items.join('\n'));
        break;
      case 'checklist':
        parts.push(b.items.map((i) => i.text).join('\n'));
        break;
      case 'faq':
        parts.push(b.items.map((i) => `${i.q}\n${i.a}`).join('\n'));
        break;
      case 'terms':
        parts.push(b.items.map((i) => `${i.term} ${i.def}`).join('\n'));
        break;
      case 'timeline':
        parts.push(b.items.map((i) => `${i.date} ${i.text}`).join('\n'));
        break;
      case 'proscons':
        parts.push([...b.pros, ...b.cons].join('\n'));
        break;
      case 'stats':
        parts.push(b.items.map((i) => `${i.value} ${i.label}`).join('\n'));
        break;
      case 'table':
        parts.push(b.rows.map((r) => r.join(' ')).join('\n'));
        break;
      case 'image':
      case 'images':
        if (b.caption) parts.push(b.caption);
        break;
      default:
        break;
    }
  }
  return parts.join('\n\n');
}

/** 日本語 500 字 / 分。最低 1 分 */
export function readingMinutes(plain: string): number {
  const n = plain.replace(/\s/g, '').length;
  return Math.max(1, Math.round(n / 500));
}

/** 目次（H2 のみ）。id はブロック id を使う */
export function headingsOf(blocks: ArticleBlock[]): Array<{ id: string; text: string; level: 2 | 3 }> {
  return blocks.filter((b): b is Extract<ArticleBlock, { type: 'heading' }> => b.type === 'heading').map((h) => ({ id: h.id, text: h.text, level: h.level }));
}

/** 最初の H2 の直後の位置（途中の相談導線をここに差し込む）。H2 が無ければ 3 段落目の後 */
export function midCtaIndex(blocks: ArticleBlock[]): number {
  const firstH2 = blocks.findIndex((b) => b.type === 'heading' && b.level === 2);
  if (firstH2 >= 0) {
    // 最初の H2 のセクションの終わり（次の H2 の手前）か、H2 から 4 ブロック後
    const nextH2 = blocks.findIndex((b, i) => i > firstH2 && b.type === 'heading' && b.level === 2);
    return nextH2 > 0 ? nextH2 : Math.min(blocks.length, firstH2 + 4);
  }
  return Math.min(blocks.length, 3);
}

/** 本文の見出し前の段落数など、公開できる最低限（タイトル以外）を満たすか */
export function blocksHaveContent(blocks: ArticleBlock[]): boolean {
  return blocksToPlainText(blocks).replace(/\s/g, '').length >= 100;
}
