import type { ArticleBlock } from '@/lib/articles/blocks';
import { TEXT_MAX, caretAtEnd, createBlock, indexOfBlock, setText, writeText } from '../blockOps';
import type { OpResult } from '../blockOps';
import type { FieldContext } from './types';

/**
 * 本文系（本文 / 見出し / 引用 / メモ）の書き戻し（0091 / エディタ作り直し）。
 *
 * blockOps.writeText は「上限を超えた分は overflow で返し、捨てない（呼び出し側は必ず拾うこと）」と
 * 決めているのに、setText は overflow を捨てていた。
 * メモアプリから 4000 字を超える下書きを貼ると、超過分が何も出ないまま消えていた。
 *
 * ここで拾って **直後に本文ブロックを作って逃がす**。1 文字も捨てない。
 * ふだんの 1 文字ずつの入力では overflow が出ないので、今までどおり update（キャレットが動かない道）を通る。
 */
export function writeBodyText(
  ctx: Pick<FieldContext, 'blocks' | 'apply' | 'update'>,
  block: ArticleBlock,
  text: string,
): void {
  const { overflow } = writeText(block, text);
  if (!overflow) {
    ctx.update((bs) => setText(bs, block.id, text));
    return;
  }
  // 超過が出たときだけ構造が変わる。逃がした先の末尾へキャレットを送る
  ctx.apply(spillOverflow(ctx.blocks, block.id, text));
}

/** 収まらなかった分を、直後に並べた本文ブロックへ順に置いた結果を返す */
export function spillOverflow(blocks: ArticleBlock[], id: string, text: string): OpResult {
  const i = indexOfBlock(blocks, id);
  if (i < 0) return { blocks, caret: null };
  const cur = blocks[i]!;
  const { block: head, overflow } = writeText(cur, text);

  const next = blocks.slice();
  next[i] = head;
  if (!overflow) return { blocks: next, caret: null };

  const made = paragraphsFrom(overflow);
  next.splice(i + 1, 0, ...made);
  const last = made[made.length - 1]!;
  return { blocks: next, caret: caretAtEnd(last) };
}

/** 文章を本文ブロックの列にする。TEXT_MAX ごとに切って 1 文字も捨てない */
export function paragraphsFrom(text: string): ArticleBlock[] {
  const made: ArticleBlock[] = [];
  let rest = text;
  do {
    made.push(createBlock('paragraph', rest.slice(0, TEXT_MAX)));
    rest = rest.slice(TEXT_MAX);
  } while (rest.length > 0);
  return made;
}
