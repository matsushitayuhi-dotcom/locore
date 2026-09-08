'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { getCurrentUser } from '@/lib/auth/current-user';
import {
  blockSchema,
  blocksToPlainText,
  blocksHaveContent,
  newBlockId,
  parseBlocks,
  type ArticleBlock,
  type LinkPreviewLite,
} from '@/lib/articles/blocks';
import { SHORT_MAX, TEXT_MAX, LIST_ITEMS_MAX, TABLE_ROWS_MAX, TABLE_COLS_MAX } from './blockOps';
import { classifyUrl } from '@/lib/articles/embeds';
import { fetchPreviewLite } from '@/lib/articles/editorial';
import { SPECIALTY_GROUPS } from '@/lib/experts/specialties';
import { getSiteUrl } from '@/lib/seo/siteUrl';

/**
 * ブロック形式の記事エディタ（/writer/articles/[id]/write）の Server Actions。0091 / 0092。
 * - saveArticleBlocks: 本文・見出し情報の保存（自動保存と手動保存で共用）。body にはプレーンテキストも入れる
 * - publishBlocksArticle / unpublishBlocksArticle: 公開・非公開
 * - resolveUrlBlock: 段落に貼られた URL を link_card / embed ブロックに変換（プレビューはサーバーで取得）
 *
 * 保存の約束ごと（2026-09 の書き直し）:
 *   1. 送られてこなかった項目は書き換えない。subtitle / lead / topic / カバーは
 *      「キーが無い = 触らない」「空文字 = 消す」。旧エディタで入れた値を空 payload で潰さない
 *   2. 上限（段落 4000 字・リスト 30 項目・表 40 行 8 列 …）は書き手に見せない。
 *      エラーにせず保存前に分割・繰り上げして必ず保存を通す（normalizeBlocksForSave）
 *   3. 失敗は「もう一度送れば直るか」を返す。retryable / retryAfterMs（指数バックオフ）を
 *      クライアントに返し、書き手の下書きが dirty のまま放置されないようにする。
 *      **例外は外に投げない**（投げるとクライアントが「保存中…」で固まって再送も止まる）
 *   4. 書いたものを黙って消さない。blockSchema を通らなかったブロックは段落に退避し、
 *      それでも救えなかった数だけ dropped で返す（400 超過分も dropped に数える）
 */

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * 保存の戻り値。失敗時は必ず retryable / retryAfterMs を持つ。
 * クライアントは ok:false かつ retryable なら retryAfterMs 待って attempt+1 で同じ payload を再送する。
 * 保存は「記事 id への上書き」なので何度送っても安全（冪等）。
 */
export type SaveResult =
  | { ok: true; data: { savedAt: string; dropped: number } }
  | { ok: false; error: string; retryable: boolean; retryAfterMs: number };

/** 通信・DB の一時的な失敗（もう一度送れば直る可能性があるもの）だけを拾う */
const TRANSIENT_RE =
  /(ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|EPIPE|socket hang up|Connection terminated|connection closed|connection error|fetch failed|network|timeout|timed out|too many (?:clients|connections)|57P01|53300|08006|08003)/i;

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return TRANSIENT_RE.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Next.js が内部で throw する制御用の例外（redirect / notFound）。
 * requireUser() は未ログインで redirect() を投げるので、これだけは握りつぶさず素通しする。
 */
function isFrameworkError(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND');
}

/** クライアントに返す待ち時間。1s → 2s → 4s …（上限 30s）＋ ばらつき。復帰時に全端末が一斉に再送しないように */
function backoffMs(attempt: number): number {
  const capped = Math.min(Math.max(attempt, 0), 6);
  return Math.min(1000 * 2 ** capped, 30_000) + Math.floor(Math.random() * 250);
}

/** サーバー内での小さなリトライ（DB の瞬断）。ここで直れば書き手は失敗を見ない */
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isTransient(err) || i === tries - 1) throw err;
      await sleep(150 * 2 ** i);
    }
  }
  throw last;
}

/**
 * 例外 → SaveResult。文言は「再送するかどうか」と必ず揃える。
 * retryable:false のときに『少し待ってからもう一度試します』と書くと嘘になる（クライアントは再送しない）。
 */
function saveFailure(err: unknown, attempt: number): SaveResult {
  const msg = err instanceof Error ? err.message : String(err);
  if (/does not exist/i.test(msg)) {
    return { ok: false, error: 'DB が未更新です（0091）。運営に連絡してください', retryable: false, retryAfterMs: 0 };
  }
  if (isTransient(err)) {
    return { ok: false, error: '保存できませんでした。少し待ってからもう一度試します', retryable: true, retryAfterMs: backoffMs(attempt) };
  }
  console.error('[saveArticleBlocks]', err);
  return { ok: false, error: '保存できませんでした。ページを開き直してください', retryable: false, retryAfterMs: 0 };
}

async function ownArticle(id: string) {
  const user = await requireUser();
  const db = getDb();
  const rows = await withRetry(() =>
    db
      .select({ id: schema.articles.id, writerId: schema.articles.writerId, status: schema.articles.status })
      .from(schema.articles)
      .where(eq(schema.articles.id, id))
      .limit(1),
  );
  const a = rows[0];
  if (!a) return { ok: false as const, error: '記事が見つかりません' };
  if (a.writerId !== user.id && user.role !== 'editor') return { ok: false as const, error: '権限がありません' };
  return { ok: true as const, user, db, article: a };
}

const TOPIC_CODES = SPECIALTY_GROUPS.map((g) => g.code);

/** 文字数上限は「エラー」ではなく「切り詰め」。書き手に赤い文字を見せない */
const trimmed = (max: number) => z.preprocess((v) => (typeof v === 'string' ? v.trim().slice(0, max) : v), z.string().max(max));

/** URL として壊れていたら「カバー無し」に倒す（保存そのものは通す） */
const coverUrl = z.preprocess((v) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return '';
  try {
    new URL(s);
    return s.slice(0, 2048);
  } catch {
    return '';
  }
}, z.string().max(2048));

const saveSchema = z.object({
  id: z.string().uuid(),
  title: trimmed(120),
  // 0091 のカラム。EditorialArticle が既に描いているのに /write から保存できていなかった
  subtitle: trimmed(300).optional(),
  lead: trimmed(600).optional(),
  topic: trimmed(40).optional(),
  coverImageUrl: coverUrl.optional(),
  // ブロックは zod に通す前に正規化する（下の normalizeBlocksForSave）。ここでは弾かない
  blocks: z.unknown(),
  /** 何回目の再送か。0 始まり。retryAfterMs の計算だけに使う */
  attempt: z.number().int().min(0).max(20).optional(),
});

// ===== ブロックの正規化 =====
// blocks.ts の上限（blockSchema）に収まらない値を、内容を捨てずに複数ブロックへ割り振る。
// 保存形式そのものは無改修。ここは「書き手に上限を見せないための緩衝材」。

type Loose = Record<string, unknown>;

const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
/** 空なら undefined（省略可能な項目に '' を入れない） */
const optShort = (v: unknown): string | undefined => {
  const s = asStr(v).replace(/\s+/g, ' ').trim().slice(0, SHORT_MAX);
  return s || undefined;
};
const oneLine = (v: unknown): string => asStr(v).replace(/\r?\n/g, ' ').slice(0, SHORT_MAX);
/** preview の各項目は「文字列 or null」。空・長すぎは null に倒す（キーごと消すと blockSchema を通らない） */
const nullableStr = (v: unknown, max: number): string | null => {
  const s = asStr(v).trim();
  return s ? s.slice(0, max) : null;
};

/** 長すぎる本文を上限で割る。改行 → 句点 → そのままの順に切れ目を探す（文の途中で切りたくない） */
function splitText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const head = rest.slice(0, max);
    const half = Math.floor(max / 2);
    const nl = head.lastIndexOf('\n');
    const period = head.lastIndexOf('。');
    const dot = head.lastIndexOf('. ');
    let cut = max;
    if (nl >= half) cut = nl + 1;
    else if (period >= half) cut = period + 1;
    else if (dot >= half) cut = dot + 2;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) out.push(rest);
  return out;
}

/** 1 ブロック → 1 つ以上のブロック。溢れた分は同じ種類の次のブロックに送る */
function normalizeBlock(b: Loose): Loose[] {
  const type = asStr(b.type);
  switch (type) {
    case 'paragraph':
    case 'quote':
    case 'aside': {
      // 4000 字を超える段落は自動で分割（書き手は「長すぎます」を見ない）
      const parts = splitText(asStr(b.text), TEXT_MAX);
      return parts.map((t, i) =>
        i === 0
          ? {
              ...b,
              text: t,
              ...(type === 'quote' ? { cite: optShort(b.cite) } : {}),
              ...(type === 'aside' ? { label: optShort(b.label) } : {}),
            }
          : { ...b, id: newBlockId(), text: t, cite: undefined, label: undefined },
      );
    }
    case 'heading': {
      // 見出しは 300 字まで。溢れた分は捨てずに後ろの本文にする
      const t = asStr(b.text).replace(/\r?\n/g, ' ');
      const head: Loose = { ...b, text: t.slice(0, SHORT_MAX) };
      const rest = t.slice(SHORT_MAX).trim();
      if (!rest) return [head];
      return [head, ...splitText(rest, TEXT_MAX).map((x) => ({ id: newBlockId(), type: 'paragraph', text: x }))];
    }
    case 'list': {
      const items = asArr(b.items).flatMap((i) => splitText(asStr(i).replace(/\r?\n/g, ' '), SHORT_MAX));
      if (items.length === 0) return [{ ...b, items: [] }];
      const out: Loose[] = [];
      for (let i = 0; i < items.length; i += LIST_ITEMS_MAX) {
        // 30 項目を超えたら同じ種類のリストをもう 1 つ作る（読み手には続いて見える）
        out.push({ ...b, id: i === 0 ? b.id : newBlockId(), items: items.slice(i, i + LIST_ITEMS_MAX) });
      }
      return out;
    }
    case 'table': {
      const rows = asArr(b.rows).map((r) => {
        const cells = asArr(r).map((c) => oneLine(c));
        if (cells.length <= TABLE_COLS_MAX) return cells;
        // 8 列を超えた分は最後のセルにまとめる（列ごと落として内容を消さない）
        const kept = cells.slice(0, TABLE_COLS_MAX - 1);
        kept.push(cells.slice(TABLE_COLS_MAX - 1).join(' ').slice(0, SHORT_MAX));
        return kept;
      });
      if (rows.length === 0) return [{ ...b, rows: [] }];
      const out: Loose[] = [];
      for (let i = 0; i < rows.length; i += TABLE_ROWS_MAX) {
        out.push({
          ...b,
          id: i === 0 ? b.id : newBlockId(),
          header: i === 0 ? b.header === true : false,
          rows: rows.slice(i, i + TABLE_ROWS_MAX),
        });
      }
      return out;
    }
    case 'image':
      return [{ ...b, caption: optShort(b.caption), alt: optShort(b.alt) }];
    // ===== ここから下は表示専用の 9 種。編集 UI は無いが、既存記事の値が落ちないよう上限だけ守る =====
    case 'images':
      return [{ ...b, urls: asArr(b.urls).slice(0, 4), caption: optShort(b.caption) }];
    case 'takeaways':
      return [{ ...b, label: optShort(b.label), items: asArr(b.items).slice(0, 8).map(oneLine) }];
    case 'checklist':
      return [
        {
          ...b,
          items: asArr(b.items)
            .slice(0, 30)
            .map((i) => ({ text: oneLine((i as Loose | null)?.text), done: (i as Loose | null)?.done === true })),
        },
      ];
    case 'faq':
      return [
        {
          ...b,
          items: asArr(b.items)
            .slice(0, 20)
            .map((i) => ({ q: oneLine((i as Loose | null)?.q), a: asStr((i as Loose | null)?.a).slice(0, TEXT_MAX) })),
        },
      ];
    case 'terms':
      return [
        {
          ...b,
          items: asArr(b.items)
            .slice(0, 30)
            .map((i) => ({ term: oneLine((i as Loose | null)?.term), def: asStr((i as Loose | null)?.def).slice(0, TEXT_MAX) })),
        },
      ];
    case 'timeline':
      return [
        {
          ...b,
          items: asArr(b.items)
            .slice(0, 30)
            .map((i) => ({ date: oneLine((i as Loose | null)?.date), text: asStr((i as Loose | null)?.text).slice(0, TEXT_MAX) })),
        },
      ];
    case 'proscons':
      return [
        {
          ...b,
          prosLabel: optShort(b.prosLabel),
          consLabel: optShort(b.consLabel),
          pros: asArr(b.pros).slice(0, 10).map(oneLine),
          cons: asArr(b.cons).slice(0, 10).map(oneLine),
        },
      ];
    case 'stats':
      return [
        {
          ...b,
          items: asArr(b.items)
            .slice(0, 4)
            .map((i) => ({ value: oneLine((i as Loose | null)?.value), label: oneLine((i as Loose | null)?.label) })),
        },
      ];
    case 'footnotes':
      return [{ ...b, items: asArr(b.items).slice(0, 30).map(oneLine) }];
    case 'link_card':
    case 'embed': {
      const p = b.preview;
      if (!p || typeof p !== 'object' || Array.isArray(p)) return [{ ...b, preview: undefined }];
      const src = p as Loose;
      const img = asStr(src.imageUrl);
      return [
        {
          ...b,
          preview: {
            // linkPreview.ts が切り詰めるのは title/description/siteName だけで imageUrl は無制限。
            // OG 画像 URL が 2048 字を超えるサイトのリンクは blockSchema を通らず、
            // 「貼った直後の自動保存でカードごと消える」状態だった。画像だけ捨ててカードは残す
            title: nullableStr(src.title, 300),
            description: nullableStr(src.description, 600),
            imageUrl: img.length > 0 && img.length <= 2048 ? img : null,
            siteName: nullableStr(src.siteName, 120),
          },
        },
      ];
    }
    default:
      // divider はそのまま
      return [b];
  }
}

/**
 * blockSchema を通らなかったブロックの逃がし先。拾える文字だけ集めて段落 1 つにする。
 * 「保存したら消えていた」を作らないための最後の砦（形は崩れても文章は残す）。
 */
function salvageParagraph(b: Loose): ArticleBlock | null {
  const parts: string[] = [];
  const push = (v: unknown) => {
    const s = asStr(v).trim();
    if (s) parts.push(s);
  };
  push(b.text);
  push(b.caption);
  push(b.cite);
  push(b.label);
  push(b.url);
  for (const it of asArr(b.items)) {
    if (typeof it === 'string') push(it);
    else if (it && typeof it === 'object') {
      const o = it as Loose;
      push(o.text);
      push(o.q);
      push(o.a);
      push(o.term);
      push(o.def);
      push(o.date);
      push(o.value);
      push(o.label);
    }
  }
  for (const r of asArr(b.rows)) if (Array.isArray(r)) for (const c of r) push(c);
  for (const u of asArr(b.urls)) push(u);
  const text = parts.join('\n').slice(0, TEXT_MAX);
  if (!text) return null;
  const r = blockSchema.safeParse({ id: newBlockId(), type: 'paragraph', text });
  return r.success ? r.data : null;
}

const BLOCKS_MAX = 400;

/**
 * 保存前の正規化。返るのは必ず blockSchema を通ったブロックだけなので、
 * 「入力内容に誤りがあります（blocks.7.text）」を書き手に見せずに済む。
 * それでも直せなかったブロックの数だけ dropped で返す（クライアントが必要なら知らせる）。
 */
function normalizeBlocksForSave(raw: unknown): { blocks: ArticleBlock[]; dropped: number } {
  const src = Array.isArray(raw) ? raw : [];
  const out: ArticleBlock[] = [];
  let dropped = 0;
  for (let i = 0; i < src.length; i += 1) {
    const item = src[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      dropped += 1;
      continue;
    }
    const base: Loose = { ...(item as Loose) };
    const id = asStr(base.id).slice(0, 40);
    base.id = id || newBlockId();
    let overflow = 0;
    for (const cand of normalizeBlock(base)) {
      if (out.length >= BLOCKS_MAX) {
        // 400 を超えた分。以前は無言で捨てていたので dropped に数える
        overflow += 1;
        continue;
      }
      const r = blockSchema.safeParse(cand);
      if (r.success) {
        out.push(r.data);
        continue;
      }
      // 通らなかったブロックも文章だけは段落にして残す（黙って消さない）
      const salvaged = salvageParagraph(cand);
      if (salvaged) out.push(salvaged);
      else dropped += 1;
    }
    if (overflow > 0) {
      // これ以降はどう頑張っても入らない。残りの項目数も含めて数えて打ち切る
      dropped += overflow + (src.length - i - 1);
      break;
    }
  }
  return { blocks: out, dropped };
}

/**
 * 保存の入口。**ここから外へ例外を投げない**（framework の redirect を除く）。
 * 例外で Promise が reject すると、クライアントの save() が「保存中…」のまま固まって
 * 自動保存の再送も止まる。想定外の失敗も必ず SaveResult に落として返す。
 */
export async function saveArticleBlocks(input: unknown): Promise<SaveResult> {
  const rawAttempt = (input as Loose | null)?.attempt;
  const attempt = typeof rawAttempt === 'number' ? rawAttempt : 0;
  try {
    return await saveArticleBlocksInner(input, attempt);
  } catch (err) {
    if (isFrameworkError(err)) throw err; // 未ログインの redirect はそのまま通す
    return saveFailure(err, attempt);
  }
}

async function saveArticleBlocksInner(input: unknown, attempt: number): Promise<SaveResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    // ここに来るのは id が不正なときくらい（文字数・ブロックは正規化で吸収する）。再送しても直らない
    return { ok: false, error: '保存できませんでした。ページを開き直してください', retryable: false, retryAfterMs: 0 };
  }
  const d = parsed.data;
  const ctx = await ownArticle(d.id);
  if (!ctx.ok) return { ok: false, error: ctx.error, retryable: false, retryAfterMs: 0 };

  // 送られてきた項目だけを書き換える。キーが無ければ既存の値を残す（空文字なら消す）
  const now = new Date();
  const patch: Partial<typeof schema.articles.$inferInsert> = { updatedAt: now };
  patch.title = d.title || '新しい記事';
  if (d.subtitle !== undefined) patch.subtitle = d.subtitle || null;
  if (d.lead !== undefined) patch.lead = d.lead || null;
  if (d.topic !== undefined) patch.topic = d.topic && TOPIC_CODES.includes(d.topic) ? d.topic : null;
  if (d.coverImageUrl !== undefined) patch.coverImageUrl = d.coverImageUrl || null;

  let dropped = 0;
  if (Array.isArray(d.blocks)) {
    const norm = normalizeBlocksForSave(d.blocks);
    dropped = norm.dropped;
    patch.blocks = norm.blocks;
    patch.body = blocksToPlainText(norm.blocks);
    patch.bodyStyle = 'blocks';
  }

  try {
    await withRetry(() => ctx.db.update(schema.articles).set(patch).where(eq(schema.articles.id, d.id)));
  } catch (err) {
    // 瞬断・タイムアウトはクライアントに待ち時間を返して再送させる（dirty のまま止めない）。
    // それ以外は再送しても直らないので retryable:false（文言も saveFailure が分けている）
    return saveFailure(err, attempt);
  }
  revalidatePath(`/articles/${d.id}`);
  return { ok: true, data: { savedAt: now.toISOString(), dropped } };
}

/** 公開・非公開の失敗も必ず Result に落とす。例外にすると「押したのに何も起きない」になる */
function actionFailure(err: unknown, where: string): { ok: false; error: string } {
  console.error(`[${where}]`, err);
  const msg = err instanceof Error ? err.message : String(err);
  if (/does not exist/i.test(msg)) return { ok: false, error: 'DB が未更新です（0091）。運営に連絡してください' };
  if (isTransient(err)) return { ok: false, error: '通信が不安定です。少し待ってからもう一度お試しください' };
  return { ok: false, error: 'うまくいきませんでした。時間をおいてもう一度お試しください' };
}

export async function publishBlocksArticle(input: unknown): Promise<Result> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  try {
    const ctx = await ownArticle(parsed.data.id);
    if (!ctx.ok) return { ok: false, error: ctx.error };
    const rows = await withRetry(() =>
      ctx.db
        .select({ title: schema.articles.title, blocks: schema.articles.blocks, publishedAt: schema.articles.publishedAt })
        .from(schema.articles)
        .where(eq(schema.articles.id, parsed.data.id))
        .limit(1),
    );
    const a = rows[0];
    // ownArticle 通過後に消えることもある。非 null 断定はしない
    if (!a) return { ok: false, error: '記事が見つかりません' };
    // 壊れたブロックが 1 つあるだけで公開できない、を避ける（parseBlocks は駄目な要素だけ捨てる）
    const blocks = parseBlocks(a.blocks ?? []);
    if (!a.title || a.title === '新しい記事') return { ok: false, error: 'タイトルを入れてください' };
    if (!blocksHaveContent(blocks)) return { ok: false, error: '本文が短すぎます（100 文字以上）' };
    await withRetry(() =>
      ctx.db
        .update(schema.articles)
        .set({ status: 'published', publishedAt: a.publishedAt ?? new Date(), updatedAt: new Date() })
        .where(eq(schema.articles.id, parsed.data.id)),
    );
    revalidatePath(`/articles/${parsed.data.id}`);
    revalidatePath('/articles');
    revalidatePath('/writer/articles');
    return { ok: true };
  } catch (err) {
    if (isFrameworkError(err)) throw err;
    return actionFailure(err, 'publishBlocksArticle');
  }
}

export async function unpublishBlocksArticle(input: unknown): Promise<Result> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  try {
    const ctx = await ownArticle(parsed.data.id);
    if (!ctx.ok) return { ok: false, error: ctx.error };
    await withRetry(() =>
      ctx.db
        .update(schema.articles)
        .set({ status: 'draft', updatedAt: new Date() })
        // 条件は id ひとつ。and(eq(...)) は引数 1 個で意味が無かったので戻した
        .where(eq(schema.articles.id, parsed.data.id)),
    );
    revalidatePath(`/articles/${parsed.data.id}`);
    revalidatePath('/articles');
    revalidatePath('/writer/articles');
    return { ok: true };
  } catch (err) {
    if (isFrameworkError(err)) throw err;
    return actionFailure(err, 'unpublishBlocksArticle');
  }
}

/**
 * 取得したプレビューを blockSchema の上限に収める。
 * ここで収めておかないと、エディタには描けるのに保存だけ落ちるブロックができる
 * （imageUrl は linkPreview.ts が切り詰めていないので特に長くなりやすい）。
 */
function clampPreview(p: LinkPreviewLite | null) {
  if (!p) return undefined;
  const img = p.imageUrl ?? '';
  return {
    title: p.title ? p.title.slice(0, 300) : null,
    description: p.description ? p.description.slice(0, 600) : null,
    imageUrl: img.length > 0 && img.length <= 2048 ? img : null,
    siteName: p.siteName ? p.siteName.slice(0, 120) : null,
  };
}

/** 段落に貼られた URL → link_card / embed ブロック。判定は classifyUrl、プレビューはサーバーで 1 回取得 */
export async function resolveUrlBlock(input: unknown): Promise<Result<ArticleBlock>> {
  const parsed = z.object({ url: z.string().url().max(2048) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'URL の形式が正しくありません' };
  // 未ログイン（/demo/editor）は種類の判定だけ行い、外部へのプレビュー取得はしない
  const viewer = await getCurrentUser();
  const canFetch = !!viewer;
  let siteHost: string | null = null;
  try {
    siteHost = new URL(getSiteUrl()).hostname;
  } catch {
    siteHost = null;
  }
  const url = parsed.data.url;
  const k = classifyUrl(url, siteHost);
  if (!k) return { ok: false, error: 'URL の形式が正しくありません' };
  const id = newBlockId();
  if (k.kind === 'article') return { ok: true, data: { id, type: 'link_card', url, kind: 'article', targetId: k.id } };
  if (k.kind === 'expert') return { ok: true, data: { id, type: 'link_card', url, kind: 'expert', targetId: k.id } };
  if (k.kind === 'embed') {
    // YouTube / 地図はプレビュー無しでも描ける。SNS 系は oEmbed / OG を試す
    const preview = k.provider === 'gmap' || !canFetch ? null : await fetchPreviewLite(url);
    return { ok: true, data: { id, type: 'embed', url, provider: k.provider, videoId: k.videoId, preview: clampPreview(preview) } };
  }
  const preview = canFetch ? await fetchPreviewLite(url) : null;
  return { ok: true, data: { id, type: 'link_card', url, kind: 'external', preview: clampPreview(preview) } };
}
