'use client';

import { Plus, X } from 'lucide-react';
import type { ArticleBlock } from '@/lib/articles/blocks';
import { LIST_ITEMS_MAX, SHORT_MAX, indexOfBlock, removeListItem, setListItem, splitListItem } from '../blockOps';
import type { OpResult } from '../blockOps';
import { AutoTextarea } from './AutoTextarea';
import { useFieldFocus } from './fieldFocus';
import type { BlockOf, FieldProps } from './types';
import { DASHED_BUTTON, ICON_BUTTON } from './ui';
import { paragraphsFrom } from './writeBody';

/**
 * 箇条書き / 番号つき（0091 / エディタ作り直し）。
 *
 * **1 項目 1 入力欄**にした。旧エディタは「1 つの textarea を改行で split」していたので、
 * 途中の項目にキャレットを戻せず、Enter の扱いも IME と噛み合っていなかった。
 *
 * キー操作は useBlockKeymap 側:
 *   Enter … 次の項目 ／ 空の項目なら箇条書きを抜けて本文へ
 *   Backspace（項目の先頭）… 前の項目と結合 ／ 1 つ目なら本文に戻す
 *   ↑ ↓ ← → … 項目をまたいで移動
 * ここが持つのは、指で押せる「項目を追加」「この項目を削除」と、複数行の貼り付けだけ。
 */
export function ListField({ block, blocks, apply, update, keymap, onFocusField }: FieldProps<BlockOf<'list'>>) {
  const fieldFocus = useFieldFocus();
  // 保存形式は items が空の配列でも通る。画面には必ず 1 つ入力欄を出す
  const items = block.items.length > 0 ? block.items : [''];
  const numbered = block.style === 'number';
  const full = items.length >= LIST_ITEMS_MAX;

  const writeItem = (row: number, text: string) =>
    update((bs) => {
      // items が空の保存形式（項目 0 個）は setListItem が書けない（row >= items.length）。
      // 画面には入力欄を 1 つ出しているので、最初の 1 文字でここが 1 つ目の項目を作る
      const cur = bs.find((b) => b.id === block.id);
      if (cur && cur.type === 'list' && cur.items.length === 0) {
        return bs.map((b) => (b.id === block.id && b.type === 'list' ? { ...b, items: [text.slice(0, SHORT_MAX)] } : b));
      }
      return setListItem(bs, block.id, row, text);
    });

  /**
   * 複数行の貼り付けを「1 行 = 1 項目」に分ける。
   * 入力欄は 1 行しか受け付けない（singleLine が改行をスペースに畳む）ので、
   * メモアプリから 5 行コピーしてきた下書きが 1 本の長い項目に潰れていた。
   * 1 行だけの貼り付けは横取りしない（false を返して素通し）。
   */
  const pasteIntoItem = (row: number, text: string, el: HTMLTextAreaElement): boolean => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .flatMap((l) => chunk(l, SHORT_MAX)); // 1 項目 300 字。長い行も捨てずに次の項目へ送る
    if (lines.length <= 1) return false;

    const head = el.value.slice(0, el.selectionStart ?? el.value.length);
    const tail = el.value.slice(el.selectionEnd ?? el.value.length);
    const merged = [
      head + lines[0]!,
      ...lines.slice(1, -1),
      lines[lines.length - 1]! + tail,
    ].flatMap((l) => chunk(l, SHORT_MAX));

    apply(spliceItems(blocks, block.id, row, merged, tail.length));
    return true;
  };

  /** 末尾に項目を足す。すでに空の項目が末尾にあるなら、そこへキャレットを移すだけ */
  const addItem = () => {
    const last = items.length - 1;
    const lastText = items[last] ?? '';
    if (lastText.trim() === '') {
      fieldFocus?.focus({ blockId: block.id, row: last, offset: lastText.length });
      return;
    }
    apply(splitListItem(blocks, block.id, last, lastText.length));
  };

  return (
    <div>
      <ul className="space-y-0.5">
        {items.map((item, row) => (
          <li key={row} className="flex items-start gap-1">
            <span
              aria-hidden
              className="w-6 shrink-0 pt-[9px] text-right text-[15px] leading-[1.9] tabular-nums text-neutral-400"
            >
              {numbered ? `${row + 1}.` : '・'}
            </span>
            <div className="min-w-0 flex-1 py-[9px]">
              <AutoTextarea
                pos={{ blockId: block.id, row }}
                value={item}
                onChange={(v) => writeItem(row, v)}
                onPasteText={(text, el) => pasteIntoItem(row, text, el)}
                keymap={keymap}
                onFocusField={onFocusField}
                singleLine
                placeholder={row === 0 ? '項目' : undefined}
                ariaLabel={`${row + 1} つ目の項目`}
                className="text-[17px] leading-[1.7] text-neutral-900"
              />
            </div>
            <button
              type="button"
              onClick={() => apply(removeListItem(blocks, block.id, row))}
              className={ICON_BUTTON}
              aria-label={`${row + 1} つ目の項目を削除`}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {/* 「/」も Enter も使わずに項目を足せる道。スマホの主導線はこちら */}
      <button type="button" onClick={addItem} disabled={full} className={DASHED_BUTTON + ' mt-1 w-full disabled:opacity-40'}>
        <Plus className="h-4 w-4" aria-hidden /> 項目を追加
      </button>
      {full ? <p className="mt-1 text-[13px] text-neutral-500">項目は {LIST_ITEMS_MAX} 個までです</p> : null}
    </div>
  );
}

/** 長い 1 行を上限ごとに切る（捨てない） */
function chunk(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

/**
 * row 番目の項目を replacement で置き換える。
 * 項目の上限を超えた分は捨てずに、箇条書きの直後の本文ブロックへ送る。
 */
function spliceItems(
  blocks: ArticleBlock[],
  id: string,
  row: number,
  replacement: string[],
  tailLength: number,
): OpResult {
  const i = indexOfBlock(blocks, id);
  const cur = i >= 0 ? blocks[i] : undefined;
  if (!cur || cur.type !== 'list') return { blocks, caret: null };

  const base = cur.items.length > 0 ? cur.items.slice() : [''];
  base.splice(row, 1, ...replacement);
  const kept = base.slice(0, LIST_ITEMS_MAX);
  const rest = base.slice(LIST_ITEMS_MAX);

  const next = blocks.slice();
  next[i] = { ...cur, items: kept };
  if (rest.length > 0) next.splice(i + 1, 0, ...paragraphsFrom(rest.join('\n')));

  // 貼り付けた文字の終わり（＝元々あった後半の手前）にキャレットを置く。
  // 上限で切られたときは、残った最後の項目の末尾へ
  const last = row + replacement.length - 1;
  const at = Math.max(0, Math.min(last, kept.length - 1));
  const len = (kept[at] ?? '').length;
  return { blocks: next, caret: { blockId: id, row: at, offset: at === last ? Math.max(0, len - tailLength) : len } };
}
