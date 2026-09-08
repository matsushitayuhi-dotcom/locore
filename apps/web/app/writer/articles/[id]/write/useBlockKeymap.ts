'use client';

import { useCallback, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import type { ArticleBlock } from '@/lib/articles/blocks';
import {
  applyMarkdownShortcut,
  caretAtEnd,
  caretAtStart,
  createBlock,
  findBlock,
  indexOfBlock,
  insertAfter,
  matchMarkdownShortcut,
  mergeListItem,
  mergeWithPrev,
  nextEditable,
  outdentListItem,
  prevEditable,
  remove,
  setCell,
  setListItem,
  setText,
  splitAt,
  splitListItem,
  tableCaret,
  tableSize,
  type Caret,
  type OpResult,
} from './blockOps';

/**
 * ブロックエディタのキー処理をここに集約する（0091 / エディタ作り直しの土台）。
 *
 * いちばん大事な約束:
 *   **すべての分岐より先に e.nativeEvent.isComposing を見る。**
 *   日本語の変換中に押される Enter は「変換の確定」であって「改行」ではない。
 *   旧エディタはこれを見ていなかったので、確定した瞬間にブロックが差し替わっていた。
 *
 * この hook は状態を持たない。何をどう変えるかを blockOps（純粋関数）で計算して、
 *   - 配列が変わる操作 → apply(result)
 *   - キャレットだけ動く操作 → moveCaret(caret)
 * を呼ぶだけ。DOM のフォーカス復元は呼び出し側（BlockEditor）の仕事。
 */

/** いま編集している入力欄の場所。row / col はリストの項目・表のセルでだけ使う */
export type FieldPos = { blockId: string; row?: number; col?: number };

export type UseBlockKeymapOptions = {
  blocks: ArticleBlock[];
  /** ブロック配列が変わる操作。result.caret があればそこへフォーカスを戻す */
  apply: (result: OpResult) => void;
  /** 配列は変えずキャレットだけ動かす */
  moveCaret: (caret: Caret) => void;
};

export type BlockKeymap = {
  /** textarea / input の onKeyDown にそのまま渡す */
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>, at: FieldPos) => void;
  /**
   * onChange の先頭で呼ぶ。true を返したら markdown ショートカットで処理済みなので、
   * 呼び出し側は自前の setState をしないこと。
   */
  handleInput: (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>, at: FieldPos) => boolean;
};

/** IME 変換中か。isComposing が無い環境（古い Android）のために keyCode 229 も見る */
function isComposingEvent(e: { isComposing?: boolean; keyCode?: number }): boolean {
  return e.isComposing === true || e.keyCode === 229;
}

/** 同じブロックの中で 1 つ上の入力欄（リストの前の項目 / 表の上のセル） */
function fieldAbove(block: ArticleBlock, row: number, col: number, offset: number): Caret | null {
  if (block.type === 'list' && row > 0) {
    const text = block.items[row - 1] ?? '';
    return { blockId: block.id, row: row - 1, offset: Math.min(offset, text.length) };
  }
  if (block.type === 'table' && row > 0) {
    const text = block.rows[row - 1]?.[col] ?? '';
    return { blockId: block.id, row: row - 1, col, offset: Math.min(offset, text.length) };
  }
  return null;
}

/** 同じブロックの中で 1 つ下の入力欄 */
function fieldBelow(block: ArticleBlock, row: number, col: number, offset: number): Caret | null {
  if (block.type === 'list' && row < block.items.length - 1) {
    const text = block.items[row + 1] ?? '';
    return { blockId: block.id, row: row + 1, offset: Math.min(offset, text.length) };
  }
  if (block.type === 'table' && row < block.rows.length - 1) {
    const text = block.rows[row + 1]?.[col] ?? '';
    return { blockId: block.id, row: row + 1, col, offset: Math.min(offset, text.length) };
  }
  return null;
}

/** ← で入力欄の先頭から出るときの行き先（同じブロック内） */
function fieldBefore(block: ArticleBlock, row: number, col: number): Caret | null {
  if (block.type === 'list' && row > 0) {
    const text = block.items[row - 1] ?? '';
    return { blockId: block.id, row: row - 1, offset: text.length };
  }
  if (block.type === 'table') {
    const cols = tableSize(block).cols;
    if (col > 0) return { blockId: block.id, row, col: col - 1, offset: (block.rows[row]?.[col - 1] ?? '').length };
    if (row > 0) return { blockId: block.id, row: row - 1, col: cols - 1, offset: (block.rows[row - 1]?.[cols - 1] ?? '').length };
  }
  return null;
}

/** → で入力欄の末尾から出るときの行き先（同じブロック内） */
function fieldAfter(block: ArticleBlock, row: number, col: number): Caret | null {
  if (block.type === 'list' && row < block.items.length - 1) return { blockId: block.id, row: row + 1, offset: 0 };
  if (block.type === 'table') {
    const { rows, cols } = tableSize(block);
    if (col < cols - 1) return { blockId: block.id, row, col: col + 1, offset: 0 };
    if (row < rows - 1) return { blockId: block.id, row: row + 1, col: 0, offset: 0 };
  }
  return null;
}

export function useBlockKeymap({ blocks, apply, moveCaret }: UseBlockKeymapOptions): BlockKeymap {
  // 最新の値を ref に置いて、返す関数は毎回作り直さない（textarea の再レンダーを減らす）
  const latest = useRef({ blocks, apply, moveCaret });
  latest.current = { blocks, apply, moveCaret };

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>, at: FieldPos) => {
    // ── ここが最優先。変換中のキーには一切手を出さない（確定の Enter を奪わない） ──
    if (isComposingEvent(e.nativeEvent)) return;
    // ⌘Z / ⌘A などは textarea の標準動作に任せる（Shift だけは自前で見る）
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const { blocks: current, apply: doApply, moveCaret: doMove } = latest.current;
    const block = findBlock(current, at.blockId);
    if (!block) return;

    const el = e.currentTarget;
    const value = el.value;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const row = at.row ?? 0;
    const col = at.col ?? 0;
    const collapsed = start === end;

    /** 画面の値をブロックへ書き戻してから構造を変える（React の state が 1 テンポ遅れていても崩れないように） */
    const synced = (): ArticleBlock[] => {
      const text = collapsed ? value : value.slice(0, start) + value.slice(end);
      if (block.type === 'list') return setListItem(current, block.id, row, text);
      if (block.type === 'table') return setCell(current, block.id, row, col, text);
      return setText(current, block.id, text);
    };

    switch (e.key) {
      case 'Enter': {
        if (e.shiftKey) {
          // 見出し・リストの項目・表のセルは 1 行。改行させない
          if (block.type === 'heading' || block.type === 'list' || block.type === 'table') e.preventDefault();
          return; // 段落・引用・メモの Shift+Enter は素の改行
        }
        e.preventDefault();
        if (block.type === 'list') {
          // 途中なら次の項目へ。空の項目ならリストを抜けて段落に（＝リストから出られる）
          doApply(splitListItem(synced(), block.id, row, start));
          return;
        }
        if (block.type === 'table') {
          const down = tableCaret(synced(), block.id, row, col, 'down');
          if (down.caret) {
            doApply(down);
            return;
          }
          // 最終行で Enter → 表の下に段落を作って抜ける（表に閉じ込めない）
          const para = createBlock('paragraph');
          doApply(insertAfter(down.blocks, block.id, para));
          return;
        }
        doApply(splitAt(synced(), block.id, start));
        return;
      }

      case 'Backspace': {
        // 先頭以外はふつうの 1 文字削除。標準に任せる
        if (!collapsed || start > 0) return;
        if (block.type === 'list') {
          e.preventDefault();
          // 2 つ目以降は前の項目とつなぐ。先頭の項目はリストから出して段落へ
          doApply(row > 0 ? mergeListItem(synced(), block.id, row) : outdentListItem(synced(), block.id, 0));
          return;
        }
        if (block.type === 'table') {
          // セルの先頭では何もしない（表をうっかり壊さない）
          return;
        }
        const merged = mergeWithPrev(synced(), block.id);
        if (merged.caret) {
          e.preventDefault();
          doApply(merged);
        }
        return;
      }

      case 'Delete': {
        // 末尾で Delete → 次のブロックを引き上げて結合
        if (!collapsed || start < value.length) return;
        const i = indexOfBlock(current, block.id);
        const after = i >= 0 ? current[i + 1] : undefined;
        if (!after) return;
        if (after.type === 'divider') {
          e.preventDefault();
          const dropped = remove(synced(), after.id);
          doApply({ blocks: dropped.blocks, caret: { blockId: block.id, row, col, offset: start } });
          return;
        }
        const merged = mergeWithPrev(synced(), after.id);
        if (merged.caret) {
          e.preventDefault();
          doApply(merged);
        }
        return;
      }

      case 'ArrowUp': {
        if (!collapsed) return;
        const inside = fieldAbove(block, row, col, start);
        if (inside) {
          e.preventDefault();
          doMove(inside);
          return;
        }
        // textarea の 1 行目にいるときだけブロックをまたぐ
        const onFirstLine = block.type === 'list' || block.type === 'table' || start === 0 || value.lastIndexOf('\n', start - 1) === -1;
        if (!onFirstLine) return;
        const prev = prevEditable(current, block.id);
        if (!prev) return;
        e.preventDefault();
        doMove(caretAtEnd(prev));
        return;
      }

      case 'ArrowDown': {
        if (!collapsed) return;
        const inside = fieldBelow(block, row, col, start);
        if (inside) {
          e.preventDefault();
          doMove(inside);
          return;
        }
        const onLastLine = block.type === 'list' || block.type === 'table' || value.indexOf('\n', start) === -1;
        if (!onLastLine) return;
        const next = nextEditable(current, block.id);
        if (!next) return;
        e.preventDefault();
        doMove(caretAtStart(next));
        return;
      }

      case 'ArrowLeft': {
        if (!collapsed || start > 0) return;
        const inside = fieldBefore(block, row, col);
        if (inside) {
          e.preventDefault();
          doMove(inside);
          return;
        }
        const prev = prevEditable(current, block.id);
        if (!prev) return;
        e.preventDefault();
        doMove(caretAtEnd(prev));
        return;
      }

      case 'ArrowRight': {
        if (!collapsed || start < value.length) return;
        const inside = fieldAfter(block, row, col);
        if (inside) {
          e.preventDefault();
          doMove(inside);
          return;
        }
        const next = nextEditable(current, block.id);
        if (!next) return;
        e.preventDefault();
        doMove(caretAtStart(next));
        return;
      }

      case 'Tab': {
        // 表の中だけセル移動に使う。ほかは標準のフォーカス移動のまま（キーボード操作を殺さない）
        if (block.type !== 'table') return;
        e.preventDefault();
        const moved = tableCaret(synced(), block.id, row, col, e.shiftKey ? 'prev' : 'next');
        if (moved.caret) {
          doApply(moved);
          return;
        }
        // 左上のセルで Shift+Tab → 表の手前のブロックへ抜ける
        const prev = prevEditable(current, block.id);
        if (prev) doMove(caretAtEnd(prev));
        return;
      }

      default:
        return;
    }
  }, []);

  const handleInput = useCallback((e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>, at: FieldPos): boolean => {
    // 変換中の途中経過では書式を変えない（「＃」を打った瞬間に見出しになるのを防ぐ）
    if (isComposingEvent(e.nativeEvent as unknown as { isComposing?: boolean; keyCode?: number })) return false;
    const { blocks: current, apply: doApply } = latest.current;
    const block = findBlock(current, at.blockId);
    if (!block || block.type !== 'paragraph') return false;

    const el = e.currentTarget;
    const value = el.value;
    const caret = el.selectionStart ?? value.length;
    // 「いま打った記号のすぐ後ろにキャレットがある」ときだけ発火させる。
    // これで、書き終わった段落の途中で "- " が現れても勝手に箇条書きにならない
    const head = value.slice(0, caret);
    const probe = matchMarkdownShortcut(head);
    // rest が空 ＝ 記号を打ち終わった直後だけ発火する
    if (!probe || probe.rest !== '') return false;

    const result = applyMarkdownShortcut(current, block.id, value);
    if (!result) return false;
    doApply(result);
    return true;
  }, []);

  return { onKeyDown, handleInput };
}
