import { newBlockId, type ArticleBlock } from '@/lib/articles/blocks';
import { type EditorKind } from './BLOCK_KINDS';

/**
 * ブロック配列に対する純粋関数（0091 / エディタ作り直しの土台）。
 *
 * ここは React に依存しない。すべて「新しい配列」と「操作後にキャレットを置く場所」を返すだけで、
 * 状態の更新とフォーカスの復元は呼び出し側（BlockEditor / useBlockKeymap）の仕事。
 *
 * 大原則:
 *  - 保存形式（lib/articles/blocks.ts）は無改修。ここでは blockSchema に通る形しか作らない
 *  - 種類を変えても**本文テキストは必ず持ち回す**（旧エディタは make() で空ブロックに差し替えて消していた）
 *  - ブロックの id は可能な限り維持する。id が変わると textarea が再マウントされてキャレットが飛ぶ
 */

/** blockSchema の上限（short: 見出し・リスト項目・セル / text: 段落・引用・メモ） */
export const SHORT_MAX = 300;
export const TEXT_MAX = 4000;
export const LIST_ITEMS_MAX = 30;
export const TABLE_ROWS_MAX = 40;
export const TABLE_COLS_MAX = 8;

/**
 * 操作後にキャレットを置く場所。
 * row / col は複数の入力欄を持つブロック（リストの項目、表のセル）でだけ使う。
 */
export type Caret = { blockId: string; row?: number; col?: number; offset: number };

/** すべての操作の返り値。caret が null なら「キャレットは動かさない（動かせない）」 */
export type OpResult = { blocks: ArticleBlock[]; caret: Caret | null };

type Heading = Extract<ArticleBlock, { type: 'heading' }>;
type ListBlock = Extract<ArticleBlock, { type: 'list' }>;
type TableBlock = Extract<ArticleBlock, { type: 'table' }>;
type AsideBlock = Extract<ArticleBlock, { type: 'aside' }>;
type QuoteBlock = Extract<ArticleBlock, { type: 'quote' }>;

/* ------------------------------------------------------------------ *
 * 小さな道具
 * ------------------------------------------------------------------ */

function chunk(s: string, n: number): string[] {
  if (s.length <= n) return [s];
  const out: string[] = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out;
}

/** 文章 → リスト項目。1 行 1 項目。長すぎる行は上限で分ける（捨てない） */
function toItems(text: string): string[] {
  const items = text.split('\n').flatMap((l) => chunk(l, SHORT_MAX));
  return items.length > 0 ? items : [''];
}

export function indexOfBlock(blocks: ArticleBlock[], id: string): number {
  return blocks.findIndex((b) => b.id === id);
}

export function findBlock(blocks: ArticleBlock[], id: string): ArticleBlock | undefined {
  return blocks.find((b) => b.id === id);
}

function withId(block: ArticleBlock): ArticleBlock {
  return { ...block, id: newBlockId() } as ArticleBlock;
}

/** JSON で深いコピー（ブロックは JSON 相当の値しか持たない） */
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/* ------------------------------------------------------------------ *
 * 種類の判定と生成
 * ------------------------------------------------------------------ */

/** 保存形式のブロック → 書き手に見せる種類。表示専用の 9 種は null */
export function kindOf(block: ArticleBlock): EditorKind | null {
  switch (block.type) {
    case 'paragraph':
      return 'paragraph';
    case 'heading':
      return block.level === 3 ? 'heading3' : 'heading2';
    case 'list':
      return block.style === 'number' ? 'number' : 'bullet';
    case 'quote':
      return 'quote';
    case 'aside':
      return 'aside';
    case 'image':
      return 'image';
    case 'table':
      return 'table';
    case 'divider':
      return 'divider';
    case 'link_card':
    case 'embed':
      // 書き手にとってはどちらも「リンク」。link_card / embed の 2 択は見せない
      return 'link';
    default:
      return null;
  }
}

/**
 * 空のブロックを作る。
 * 'link' は「URL を 1 本入れてもらってから resolveUrlBlock で確定する」ので、
 * 受け皿として空の段落を返す（url が空の link_card は blockSchema に通らないため作らない）。
 */
export function createBlock(kind: EditorKind, text = ''): ArticleBlock {
  const id = newBlockId();
  switch (kind) {
    case 'heading2':
      return { id, type: 'heading', level: 2, text: text.slice(0, SHORT_MAX) };
    case 'heading3':
      return { id, type: 'heading', level: 3, text: text.slice(0, SHORT_MAX) };
    case 'bullet':
      return { id, type: 'list', style: 'bullet', items: toItems(text).slice(0, LIST_ITEMS_MAX) };
    case 'number':
      return { id, type: 'list', style: 'number', items: toItems(text).slice(0, LIST_ITEMS_MAX) };
    case 'quote':
      return { id, type: 'quote', text: text.slice(0, TEXT_MAX) };
    case 'aside':
      return { id, type: 'aside', kind: 'memo', text: text.slice(0, TEXT_MAX) };
    case 'table':
      return { id, type: 'table', header: true, rows: [['', ''], ['', '']] };
    case 'divider':
      return { id, type: 'divider' };
    case 'image':
      // url は写真を選んだ時点で入る。空のままなら保存前に落とす（呼び出し側の compact）
      return { id, type: 'image', url: '' };
    case 'link':
    case 'paragraph':
    default:
      return { id, type: 'paragraph', text: text.slice(0, TEXT_MAX) };
  }
}

/** 「リンクを貼る」は挿入ではなく URL を尋ねる操作。呼び出し側で分岐するための目印 */
export function isLinkAction(kind: EditorKind): boolean {
  return kind === 'link';
}

/* ------------------------------------------------------------------ *
 * テキストの読み書き（種類をまたいでテキストを持ち回すための土台）
 * ------------------------------------------------------------------ */

/** ブロック全体を 1 つの文章として読む。テキストを持たないブロックは null */
export function readText(block: ArticleBlock): string | null {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'quote':
    case 'aside':
      return block.text;
    case 'list':
      return block.items.join('\n');
    default:
      return null;
  }
}

/**
 * ブロックに文章を書き戻す。上限を超えた分は overflow で返し、捨てない。
 * （呼び出し側は overflow を次の段落として置くなど、必ず拾うこと）
 */
export function writeText(block: ArticleBlock, text: string): { block: ArticleBlock; overflow: string } {
  switch (block.type) {
    case 'paragraph':
    case 'quote':
    case 'aside':
      return { block: { ...block, text: text.slice(0, TEXT_MAX) }, overflow: text.slice(TEXT_MAX) };
    case 'heading': {
      // 見出しは 1 行。改行はスペースに畳む
      const flat = text.replace(/\n+/g, ' ');
      return { block: { ...block, text: flat.slice(0, SHORT_MAX) }, overflow: flat.slice(SHORT_MAX) };
    }
    case 'list': {
      const items = toItems(text);
      return { block: { ...block, items: items.slice(0, LIST_ITEMS_MAX) }, overflow: items.slice(LIST_ITEMS_MAX).join('\n') };
    }
    default:
      return { block, overflow: text };
  }
}

/** そのブロックが（テキストの）編集欄を持つか。divider / image / link などは false */
export function isEditableText(block: ArticleBlock): boolean {
  return readText(block) !== null || block.type === 'table';
}

/** キャレットが指している入力欄の中身 */
export function fieldTextAt(block: ArticleBlock, caret: Pick<Caret, 'row' | 'col'>): string {
  if (block.type === 'list') return block.items[caret.row ?? 0] ?? '';
  if (block.type === 'table') return block.rows[caret.row ?? 0]?.[caret.col ?? 0] ?? '';
  return readText(block) ?? '';
}

/** ブロック全体を通した文字位置 → 入力欄の位置（リストなら何番目の項目の何文字目か） */
export function caretFromAbsolute(block: ArticleBlock, abs: number): Caret {
  if (block.type === 'list') {
    let rest = Math.max(0, abs);
    for (let row = 0; row < block.items.length; row += 1) {
      const item = block.items[row] ?? '';
      if (rest <= item.length) return { blockId: block.id, row, offset: rest };
      rest -= item.length + 1; // 改行 1 文字ぶん
    }
    const last = Math.max(0, block.items.length - 1);
    return { blockId: block.id, row: last, offset: (block.items[last] ?? '').length };
  }
  if (block.type === 'table') return { blockId: block.id, row: 0, col: 0, offset: 0 };
  const len = (readText(block) ?? '').length;
  return { blockId: block.id, offset: Math.min(Math.max(0, abs), len) };
}

export function caretAtStart(block: ArticleBlock): Caret {
  if (block.type === 'list') return { blockId: block.id, row: 0, offset: 0 };
  if (block.type === 'table') return { blockId: block.id, row: 0, col: 0, offset: 0 };
  return { blockId: block.id, offset: 0 };
}

export function caretAtEnd(block: ArticleBlock): Caret {
  if (block.type === 'list') {
    const row = Math.max(0, block.items.length - 1);
    return { blockId: block.id, row, offset: (block.items[row] ?? '').length };
  }
  if (block.type === 'table') {
    const row = Math.max(0, block.rows.length - 1);
    const cols = block.rows[row]?.length ?? 1;
    const col = Math.max(0, cols - 1);
    return { blockId: block.id, row, col, offset: (block.rows[row]?.[col] ?? '').length };
  }
  return { blockId: block.id, offset: (readText(block) ?? '').length };
}

/* ------------------------------------------------------------------ *
 * 入力欄の中身を書き戻す（配列だけ返す。キャレットは動かないので OpResult にしない）
 * ------------------------------------------------------------------ */

export function setText(blocks: ArticleBlock[], id: string, text: string): ArticleBlock[] {
  return blocks.map((b) => (b.id === id ? writeText(b, text).block : b));
}

export function setListItem(blocks: ArticleBlock[], id: string, row: number, text: string): ArticleBlock[] {
  return blocks.map((b) => {
    if (b.id !== id || b.type !== 'list') return b;
    const items = b.items.slice();
    if (row < 0 || row >= items.length) return b;
    items[row] = text.replace(/\n/g, ' ').slice(0, SHORT_MAX);
    return { ...b, items };
  });
}

export function setCell(blocks: ArticleBlock[], id: string, row: number, col: number, text: string): ArticleBlock[] {
  return blocks.map((b) => {
    if (b.id !== id || b.type !== 'table') return b;
    const rows = b.rows.map((r) => r.slice());
    const target = rows[row];
    if (!target || col < 0 || col >= target.length) return b;
    target[col] = text.replace(/\n/g, ' ').slice(0, SHORT_MAX);
    return { ...b, rows };
  });
}

/** aside の色（ポイント / 注意 / メモ）を変える。テキストはそのまま */
export function setAsideTone(blocks: ArticleBlock[], id: string, tone: AsideBlock['kind']): ArticleBlock[] {
  return blocks.map((b) => (b.id === id && b.type === 'aside' ? { ...b, kind: tone } : b));
}

/** 引用の出典 */
export function setQuoteCite(blocks: ArticleBlock[], id: string, cite: string): ArticleBlock[] {
  return blocks.map((b) => {
    if (b.id !== id || b.type !== 'quote') return b;
    const next: QuoteBlock = { ...b, cite: cite.slice(0, SHORT_MAX) };
    if (!cite) delete next.cite;
    return next;
  });
}

/* ------------------------------------------------------------------ *
 * 種類を変える
 * ------------------------------------------------------------------ */

/**
 * 本文テキストを保ったまま種類を変える。
 * 段落 ⇄ 見出し(2/3) ⇄ 引用 ⇄ メモ ⇄ リスト の相互変換。
 * リスト → 段落は項目を改行で連結し、段落 → リストは改行で分ける。
 * 上限を超えた分は直後の段落に逃がす（テキストは 1 文字も捨てない）。
 */
export function turnInto(blocks: ArticleBlock[], id: string, kind: EditorKind): OpResult {
  const i = indexOfBlock(blocks, id);
  if (i < 0) return { blocks, caret: null };
  const cur = blocks[i]!;
  if (kindOf(cur) === kind) return { blocks, caret: null };

  const text = readText(cur);
  // テキストを持たないブロック（写真・区切り線・リンク）は変換の対象にしない
  if (text === null) return { blocks, caret: null };

  const shell = shellFor(cur, kind);
  if (!shell) return { blocks, caret: null };

  const { block, overflow } = writeText(shell, text);
  const next = blocks.slice();
  next[i] = block;
  if (overflow) next.splice(i + 1, 0, createBlock('paragraph', overflow));
  return { blocks: next, caret: caretAtEnd(block) };
}

/** 変換先の「空の器」。id と、引き継げる属性（引用の出典・メモの色）は残す */
function shellFor(cur: ArticleBlock, kind: EditorKind): ArticleBlock | null {
  const id = cur.id;
  switch (kind) {
    case 'paragraph':
      return { id, type: 'paragraph', text: '' };
    case 'heading2':
    case 'heading3': {
      const level = kind === 'heading3' ? 3 : 2;
      const h: Heading = { id, type: 'heading', level, text: '' };
      return h;
    }
    case 'bullet':
    case 'number': {
      const l: ListBlock = { id, type: 'list', style: kind === 'number' ? 'number' : 'bullet', items: [''] };
      return l;
    }
    case 'quote':
      return cur.type === 'quote' ? cur : { id, type: 'quote', text: '' };
    case 'aside':
      // すでにメモなら色（point / caution / memo）を引き継ぐ
      return cur.type === 'aside' ? cur : { id, type: 'aside', kind: 'memo', text: '' };
    default:
      return null;
  }
}

/** 見出しボタン: 本文 → 見出し → 小見出し → 本文 の循環 */
export function cycleHeading(kind: EditorKind | null): EditorKind {
  if (kind === 'heading2') return 'heading3';
  if (kind === 'heading3') return 'paragraph';
  return 'heading2';
}

/** ・ボタン: 本文 → 箇条書き → 番号つき → 本文 の循環 */
export function cycleList(kind: EditorKind | null): EditorKind {
  if (kind === 'bullet') return 'number';
  if (kind === 'number') return 'paragraph';
  return 'bullet';
}

/** ”ボタン: 本文 ⇄ 引用 */
export function toggleQuote(kind: EditorKind | null): EditorKind {
  return kind === 'quote' ? 'paragraph' : 'quote';
}

/** メモボタン: 本文 ⇄ メモ */
export function toggleAside(kind: EditorKind | null): EditorKind {
  return kind === 'aside' ? 'paragraph' : 'aside';
}

/* ------------------------------------------------------------------ *
 * 分割・結合
 * ------------------------------------------------------------------ */

/**
 * 段落の途中で分割して 2 ブロックにする。
 * 見出しの途中で改行したときの後半は「本文」にする（見出しが 2 つに増えるのは書き手の意図ではない）。
 */
export function splitAt(blocks: ArticleBlock[], id: string, offset: number): OpResult {
  const i = indexOfBlock(blocks, id);
  if (i < 0) return { blocks, caret: null };
  const cur = blocks[i]!;
  const text = readText(cur);
  if (text === null) return { blocks, caret: null };
  if (cur.type === 'list') return splitListItem(blocks, id, 0, offset);

  const at = Math.min(Math.max(0, offset), text.length);
  const head = text.slice(0, at);
  const tail = text.slice(at);

  const headBlock = writeText(cur, head).block;
  // 見出しの続きは本文。引用・メモは同じ種類のまま続ける
  const tailBlock = cur.type === 'heading' ? createBlock('paragraph', tail) : writeText(withId(cur), tail).block;

  const next = blocks.slice();
  next[i] = headBlock;
  next.splice(i + 1, 0, tailBlock);
  return { blocks: next, caret: caretAtStart(tailBlock) };
}

/**
 * 前のブロックと結合する（ブロックの先頭で Backspace）。
 * 結合後のキャレット（＝前のブロックの元の末尾）も返す。
 * 前が区切り線のときは区切り線を消す。写真・表・リンクのときは何もしない（誤って消さない）。
 */
export function mergeWithPrev(blocks: ArticleBlock[], id: string): OpResult {
  const i = indexOfBlock(blocks, id);
  if (i <= 0) return { blocks, caret: null };
  const cur = blocks[i]!;
  const prev = blocks[i - 1]!;

  const curText = readText(cur);
  if (curText === null) return { blocks, caret: null };

  if (prev.type === 'divider') {
    // 区切り線は本文と結合できないので、Backspace 1 回で消せるようにする
    const next = blocks.slice();
    next.splice(i - 1, 1);
    return { blocks: next, caret: caretAtStart(cur) };
  }

  const prevText = readText(prev);
  // 写真・表・リンクカードなどは結合できない。うっかり消さないよう何もしない
  if (prevText === null) return { blocks, caret: null };

  const { block: merged, overflow } = writeText(prev, prevText + curText);
  const next = blocks.slice();
  next[i - 1] = merged;
  next.splice(i, 1);
  if (overflow) next.splice(i, 0, createBlock('paragraph', overflow));
  return { blocks: next, caret: caretFromAbsolute(merged, prevText.length) };
}

/* ------------------------------------------------------------------ *
 * 並べ替え・追加・削除
 * ------------------------------------------------------------------ */

/** afterId の直後に入れる。afterId が null / 見つからないときは末尾 */
export function insertAfter(blocks: ArticleBlock[], afterId: string | null, block: ArticleBlock): OpResult {
  const i = afterId ? indexOfBlock(blocks, afterId) : -1;
  const next = blocks.slice();
  const at = i < 0 ? next.length : i + 1;
  next.splice(at, 0, block);
  return { blocks: next, caret: caretAtStart(block) };
}

/** 消したあとは前のブロックの末尾へ。前が無ければ次の先頭へ */
export function remove(blocks: ArticleBlock[], id: string): OpResult {
  const i = indexOfBlock(blocks, id);
  if (i < 0) return { blocks, caret: null };
  const next = blocks.slice();
  next.splice(i, 1);
  if (next.length === 0) {
    // 空の記事にしない。段落を 1 つ残す
    const p = createBlock('paragraph');
    return { blocks: [p], caret: caretAtStart(p) };
  }
  // 文字を打てる一番近いブロックへ。前を優先し、無ければ後ろ
  for (let j = i - 1; j >= 0; j -= 1) {
    const b = next[j];
    if (b && isEditableText(b)) return { blocks: next, caret: caretAtEnd(b) };
  }
  for (let j = i; j < next.length; j += 1) {
    const b = next[j];
    if (b && isEditableText(b)) return { blocks: next, caret: caretAtStart(b) };
  }
  return { blocks: next, caret: null };
}

export function move(blocks: ArticleBlock[], id: string, dir: 'up' | 'down'): OpResult {
  const i = indexOfBlock(blocks, id);
  if (i < 0) return { blocks, caret: null };
  const j = dir === 'up' ? i - 1 : i + 1;
  if (j < 0 || j >= blocks.length) return { blocks, caret: null };
  const next = blocks.slice();
  const a = next[i]!;
  const b = next[j]!;
  next[i] = b;
  next[j] = a;
  return { blocks: next, caret: caretAtStart(a) };
}

/** 複製。id は必ず振り直す（同じ id が 2 つあるとキャレットが行方不明になる） */
export function duplicate(blocks: ArticleBlock[], id: string): OpResult {
  const i = indexOfBlock(blocks, id);
  if (i < 0) return { blocks, caret: null };
  const copy = withId(clone(blocks[i]!));
  const next = blocks.slice();
  next.splice(i + 1, 0, copy);
  return { blocks: next, caret: caretAtStart(copy) };
}

/** ブロックを丸ごと差し替える（URL を解決して link_card / embed になったときなど）。id は差し替え先のものを使う */
export function replaceBlock(blocks: ArticleBlock[], id: string, block: ArticleBlock): OpResult {
  const i = indexOfBlock(blocks, id);
  if (i < 0) return { blocks, caret: null };
  const next = blocks.slice();
  next[i] = block;
  return { blocks: next, caret: isEditableText(block) ? caretAtEnd(block) : null };
}

/* ------------------------------------------------------------------ *
 * リスト（1 項目 1 入力欄）
 * ------------------------------------------------------------------ */

function listAt(blocks: ArticleBlock[], id: string): { i: number; list: ListBlock } | null {
  const i = indexOfBlock(blocks, id);
  const b = i >= 0 ? blocks[i] : undefined;
  if (!b || b.type !== 'list') return null;
  return { i, list: b };
}

/** 項目の途中で Enter → 次の項目。空の項目で Enter → リストを抜けて段落へ */
export function splitListItem(blocks: ArticleBlock[], id: string, row: number, offset: number): OpResult {
  const found = listAt(blocks, id);
  if (!found) return { blocks, caret: null };
  const { i, list } = found;
  const item = list.items[row] ?? '';
  if (item.trim() === '') return exitList(blocks, id, row);
  if (list.items.length >= LIST_ITEMS_MAX) return { blocks, caret: null };

  const at = Math.min(Math.max(0, offset), item.length);
  const items = list.items.slice();
  items.splice(row, 1, item.slice(0, at), item.slice(at));
  const next = blocks.slice();
  next[i] = { ...list, items };
  return { blocks: next, caret: { blockId: id, row: row + 1, offset: 0 } };
}

/** 空の項目でリストを抜ける。抜けた位置から後ろの項目は 2 つ目のリストとして残す */
export function exitList(blocks: ArticleBlock[], id: string, row: number): OpResult {
  const found = listAt(blocks, id);
  if (!found) return { blocks, caret: null };
  const { i, list } = found;
  const before = list.items.slice(0, row);
  const after = list.items.slice(row + 1);
  const para = createBlock('paragraph');

  const next = blocks.slice();
  const replacement: ArticleBlock[] = [];
  if (before.length > 0) replacement.push({ ...list, items: before });
  replacement.push(para);
  if (after.length > 0) replacement.push({ ...list, id: newBlockId(), items: after });
  next.splice(i, 1, ...replacement);
  return { blocks: next, caret: caretAtStart(para) };
}

/** 項目の先頭で Backspace（2 つ目以降）→ 前の項目とつなぐ */
export function mergeListItem(blocks: ArticleBlock[], id: string, row: number): OpResult {
  const found = listAt(blocks, id);
  if (!found || row <= 0) return { blocks, caret: null };
  const { i, list } = found;
  const prev = list.items[row - 1] ?? '';
  const cur = list.items[row] ?? '';
  const items = list.items.slice();
  items.splice(row - 1, 2, (prev + cur).slice(0, SHORT_MAX));
  const next = blocks.slice();
  next[i] = { ...list, items };
  return { blocks: next, caret: { blockId: id, row: row - 1, offset: prev.length } };
}

/** 先頭の項目で Backspace → その項目だけリストから出して段落にする（テキストは保つ） */
export function outdentListItem(blocks: ArticleBlock[], id: string, row: number): OpResult {
  const found = listAt(blocks, id);
  if (!found) return { blocks, caret: null };
  const { i, list } = found;
  const item = list.items[row] ?? '';
  const before = list.items.slice(0, row);
  const after = list.items.slice(row + 1);
  const para = createBlock('paragraph', item);

  const next = blocks.slice();
  const replacement: ArticleBlock[] = [];
  if (before.length > 0) replacement.push({ ...list, items: before });
  replacement.push(para);
  if (after.length > 0) replacement.push({ ...list, id: newBlockId(), items: after });
  next.splice(i, 1, ...replacement);
  return { blocks: next, caret: caretAtStart(para) };
}

/** 項目を消す。最後の 1 つなら段落に戻す */
export function removeListItem(blocks: ArticleBlock[], id: string, row: number): OpResult {
  const found = listAt(blocks, id);
  if (!found) return { blocks, caret: null };
  const { i, list } = found;
  if (list.items.length <= 1) return turnInto(blocks, id, 'paragraph');
  const items = list.items.slice();
  items.splice(row, 1);
  const next = blocks.slice();
  next[i] = { ...list, items };
  const at = Math.max(0, row - 1);
  return { blocks: next, caret: { blockId: id, row: at, offset: (items[at] ?? '').length } };
}

/* ------------------------------------------------------------------ *
 * 表（セル単位で編集する。旧エディタの「| で区切った 1 つの textarea」はやめる）
 * ------------------------------------------------------------------ */

function tableAt(blocks: ArticleBlock[], id: string): { i: number; table: TableBlock } | null {
  const i = indexOfBlock(blocks, id);
  const b = i >= 0 ? blocks[i] : undefined;
  if (!b || b.type !== 'table') return null;
  return { i, table: b };
}

export function tableSize(table: TableBlock): { rows: number; cols: number } {
  return { rows: table.rows.length, cols: table.rows.reduce((m, r) => Math.max(m, r.length), 0) };
}

/** 行を足す（at の直後。省略で末尾）。列数は既存にそろえる */
export function addTableRow(blocks: ArticleBlock[], id: string, at?: number): OpResult {
  const found = tableAt(blocks, id);
  if (!found) return { blocks, caret: null };
  const { i, table } = found;
  if (table.rows.length >= TABLE_ROWS_MAX) return { blocks, caret: null };
  const cols = Math.max(1, tableSize(table).cols);
  const rows = table.rows.map((r) => r.slice());
  const insertAt = at === undefined ? rows.length : Math.min(rows.length, at + 1);
  rows.splice(insertAt, 0, Array.from({ length: cols }, () => ''));
  const next = blocks.slice();
  next[i] = { ...table, rows };
  return { blocks: next, caret: { blockId: id, row: insertAt, col: 0, offset: 0 } };
}

/** 列を足す（at の直後。省略で右端） */
export function addTableColumn(blocks: ArticleBlock[], id: string, at?: number): OpResult {
  const found = tableAt(blocks, id);
  if (!found) return { blocks, caret: null };
  const { i, table } = found;
  const cols = tableSize(table).cols;
  if (cols >= TABLE_COLS_MAX) return { blocks, caret: null };
  const insertAt = at === undefined ? cols : Math.min(cols, at + 1);
  // 列数がズレると表示側（Prose）が崩れるので、必ず全行そろえる
  const rows = table.rows.map((r) => {
    const row = r.slice();
    while (row.length < cols) row.push('');
    row.splice(insertAt, 0, '');
    return row;
  });
  const next = blocks.slice();
  next[i] = { ...table, rows };
  return { blocks: next, caret: { blockId: id, row: 0, col: insertAt, offset: 0 } };
}

export function removeTableRow(blocks: ArticleBlock[], id: string, at: number): OpResult {
  const found = tableAt(blocks, id);
  if (!found) return { blocks, caret: null };
  const { i, table } = found;
  if (table.rows.length <= 1) return remove(blocks, id);
  const rows = table.rows.map((r) => r.slice());
  rows.splice(at, 1);
  const next = blocks.slice();
  next[i] = { ...table, rows };
  return { blocks: next, caret: { blockId: id, row: Math.max(0, at - 1), col: 0, offset: 0 } };
}

export function removeTableColumn(blocks: ArticleBlock[], id: string, at: number): OpResult {
  const found = tableAt(blocks, id);
  if (!found) return { blocks, caret: null };
  const { i, table } = found;
  if (tableSize(table).cols <= 1) return remove(blocks, id);
  const rows = table.rows.map((r) => {
    const row = r.slice();
    row.splice(at, 1);
    return row;
  });
  const next = blocks.slice();
  next[i] = { ...table, rows };
  return { blocks: next, caret: { blockId: id, row: 0, col: Math.max(0, at - 1), offset: 0 } };
}

/**
 * セル間の移動（Tab / Shift+Tab / ↑ / ↓）。
 * 最後のセルで Tab を押したときだけ行を足して続けられるようにする。
 * 表の外へ出るときは caret を null にして返し、呼び出し側の「前後のブロックへ」に任せる。
 */
export function tableCaret(
  blocks: ArticleBlock[],
  id: string,
  row: number,
  col: number,
  dir: 'next' | 'prev' | 'up' | 'down',
): OpResult {
  const found = tableAt(blocks, id);
  if (!found) return { blocks, caret: null };
  const { table } = found;
  const { rows, cols } = tableSize(table);
  const cell = (r: number, c: number): Caret => ({ blockId: id, row: r, col: c, offset: (table.rows[r]?.[c] ?? '').length });

  if (dir === 'up') return row > 0 ? { blocks, caret: cell(row - 1, col) } : { blocks, caret: null };
  if (dir === 'down') return row < rows - 1 ? { blocks, caret: cell(row + 1, col) } : { blocks, caret: null };
  if (dir === 'prev') {
    if (col > 0) return { blocks, caret: cell(row, col - 1) };
    if (row > 0) return { blocks, caret: cell(row - 1, cols - 1) };
    return { blocks, caret: null };
  }
  if (col < cols - 1) return { blocks, caret: cell(row, col + 1) };
  if (row < rows - 1) return { blocks, caret: cell(row + 1, 0) };
  // 右下のセルで Tab → 行を足して続ける
  return addTableRow(blocks, id);
}

/* ------------------------------------------------------------------ *
 * ブロックをまたぐキャレット移動
 * ------------------------------------------------------------------ */

/** 文字を打てるブロックだけを辿る（区切り線・写真・リンクは飛ばす） */
export function prevEditable(blocks: ArticleBlock[], id: string): ArticleBlock | null {
  const i = indexOfBlock(blocks, id);
  for (let j = i - 1; j >= 0; j -= 1) {
    const b = blocks[j];
    if (b && isEditableText(b)) return b;
  }
  return null;
}

export function nextEditable(blocks: ArticleBlock[], id: string): ArticleBlock | null {
  const i = indexOfBlock(blocks, id);
  if (i < 0) return null;
  for (let j = i + 1; j < blocks.length; j += 1) {
    const b = blocks[j];
    if (b && isEditableText(b)) return b;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * markdown ショートカット
 * ------------------------------------------------------------------ */

type Shortcut = { kind: EditorKind; rest: string };

/** 全角スペース。ソースに直接書くと lint（no-irregular-whitespace）に引っかかるのでコードから作る */
const IDEOGRAPHIC_SPACE = String.fromCharCode(0x3000);
const FULLWIDTH_SPACE_RE = new RegExp('^(\\S+?)' + IDEOGRAPHIC_SPACE);

/** 全角で打たれても拾う（スマホの日本語キーボードは全角記号になりやすい） */
function normalizePrefix(s: string): string {
  return s
    .replace(/^＃+/, (m) => '#'.repeat(m.length))
    .replace(/^[－ー―‐]/, '-')
    .replace(/^＊/, '*')
    .replace(/^＞/, '>')
    .replace(/^１\s*[.．、]/, '1.')
    .replace(/^1[．、]/, '1.')
    .replace(FULLWIDTH_SPACE_RE, '$1 '); // 全角スペースも区切りとして拾う
}

/**
 * 行頭の記号を書式に変える。打った瞬間に turnInto するので、記号は本文に残らない。
 * "# " "## " → 見出し / "### " → 小見出し / "- " "* " "・" → 箇条書き /
 * "1. " → 番号つき / "> " → 引用 / "---" → 区切り線
 */
export function matchMarkdownShortcut(text: string): Shortcut | null {
  const s = normalizePrefix(text);
  if (/^---$/.test(s.trim()) && s.trim() === s) return { kind: 'divider', rest: '' };
  const m = /^(#{1,3}|-|\*|・|1\.|>)[ ]?(.*)$/s.exec(s);
  if (!m) return null;
  const mark = m[1] ?? '';
  const rest = m[2] ?? '';
  // 記号だけで空白が来ていないものは無視（"-abc" を箇条書きにしない）
  if (mark !== '・' && !/^(#{1,3}|-|\*|1\.|>)[ ]/.test(s)) return null;
  switch (mark) {
    case '#':
    case '##':
      return { kind: 'heading2', rest };
    case '###':
      return { kind: 'heading3', rest };
    case '-':
    case '*':
    case '・':
      return { kind: 'bullet', rest };
    case '1.':
      return { kind: 'number', rest };
    case '>':
      return { kind: 'quote', rest };
    default:
      return null;
  }
}

/**
 * 段落に打たれた行頭記号を書式に変える。変換しないときは null。
 * 区切り線のときは区切り線 ＋ 空の段落を置き、キャレットは新しい段落へ。
 */
export function applyMarkdownShortcut(blocks: ArticleBlock[], id: string, text: string): OpResult | null {
  const i = indexOfBlock(blocks, id);
  if (i < 0) return null;
  const cur = blocks[i]!;
  // 段落でだけ効かせる（見出しの中で "- " と打ちたいこともあるため）
  if (cur.type !== 'paragraph') return null;
  const hit = matchMarkdownShortcut(text);
  if (!hit) return null;

  if (hit.kind === 'divider') {
    const line = createBlock('divider');
    const para = createBlock('paragraph');
    const next = blocks.slice();
    next.splice(i, 1, line, para);
    return { blocks: next, caret: caretAtStart(para) };
  }

  const shell = shellFor(cur, hit.kind);
  if (!shell) return null;
  const { block } = writeText(shell, hit.rest);
  const next = blocks.slice();
  next[i] = block;
  // 記号を消したぶんだけキャレットは行頭へ（記号の後ろに書きかけの文があってもそのまま残る）
  return { blocks: next, caret: caretAtStart(block) };
}

/* ------------------------------------------------------------------ *
 * 表示専用ブロック → 本文
 * ------------------------------------------------------------------ */

/**
 * 編集 UI を持たない 9 種を、書き手が触れる形（本文・箇条書き・写真）に開く。
 * 「本文に変換」ボタンから呼ぶ。中身は 1 つも捨てない。
 */
export function convertToBody(blocks: ArticleBlock[], id: string): OpResult {
  const i = indexOfBlock(blocks, id);
  if (i < 0) return { blocks, caret: null };
  const b = blocks[i]!;
  const made: ArticleBlock[] = [];
  const bullets = (items: string[]) => {
    const list = items.filter((t) => t.trim() !== '');
    if (list.length > 0) made.push(createBlock('bullet', list.join('\n')));
  };

  switch (b.type) {
    case 'images':
      for (const url of b.urls) made.push({ id: newBlockId(), type: 'image', url, ...(b.caption ? { caption: b.caption } : {}) });
      break;
    case 'takeaways':
      if (b.label) made.push(createBlock('paragraph', `**${b.label}**`));
      bullets(b.items);
      break;
    case 'checklist':
      bullets(b.items.map((x) => x.text));
      break;
    case 'faq':
      for (const x of b.items) {
        made.push(createBlock('heading3', x.q));
        made.push(createBlock('paragraph', x.a));
      }
      break;
    case 'terms':
      for (const x of b.items) made.push(createBlock('paragraph', `**${x.term}** ${x.def}`));
      break;
    case 'timeline':
      bullets(b.items.map((x) => `${x.date} ${x.text}`.trim()));
      break;
    case 'proscons':
      made.push(createBlock('paragraph', `**${b.prosLabel || '良い点'}**`));
      bullets(b.pros);
      made.push(createBlock('paragraph', `**${b.consLabel || '気になる点'}**`));
      bullets(b.cons);
      break;
    case 'stats':
      bullets(b.items.map((x) => `${x.value} ${x.label}`.trim()));
      break;
    case 'footnotes':
      if (b.items.filter((t) => t.trim() !== '').length > 0) made.push(createBlock('number', b.items.filter((t) => t.trim() !== '').join('\n')));
      break;
    default:
      return { blocks, caret: null };
  }

  if (made.length === 0) made.push(createBlock('paragraph'));
  const next = blocks.slice();
  next.splice(i, 1, ...made);
  const first = made[0]!;
  return { blocks: next, caret: isEditableText(first) ? caretAtStart(first) : null };
}

/** 保存前に「空のまま」のブロックを落とす（写真とリンクは url が入るまで blockSchema に通らない） */
export function compact(blocks: ArticleBlock[]): ArticleBlock[] {
  const kept = blocks.filter((b) => {
    switch (b.type) {
      case 'image':
        return !!b.url;
      case 'images':
        return b.urls.length > 0;
      case 'link_card':
      case 'embed':
        return !!b.url;
      default:
        return true;
    }
  });
  return kept;
}
