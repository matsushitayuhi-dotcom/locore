'use client';

import { setQuoteCite } from '../blockOps';
import { AutoTextarea } from './AutoTextarea';
import type { BlockOf, FieldProps } from './types';
import { writeBodyText } from './writeBody';

/**
 * 引用（0091 / エディタ作り直し）。本文 ＋ 出典の 2 つだけ。
 * 記事ページ（Prose）と同じ「細い縦線」の見た目のまま書ける。
 *
 * 本文の書き戻しは writeBodyText。上限を超えた貼り付けを捨てずに直後の本文へ逃がす。
 *
 * 出典の欄は keymap にも fieldFocus にも登録しない。
 * ブロックをまたぐキャレット移動は「引用の本文」だけを辿ればよく、
 * 出典まで経路に入れると Enter や ↑↓ の行き先が読めなくなるため。
 */
export function QuoteField(props: FieldProps<BlockOf<'quote'>>) {
  const { block, update, keymap, onFocusField, onPasteFiles } = props;
  return (
    <div className="border-l border-foreground pl-[18px]">
      <AutoTextarea
        pos={{ blockId: block.id }}
        value={block.text}
        onChange={(v) => writeBodyText(props, block, v)}
        keymap={keymap}
        onFocusField={onFocusField}
        onPasteFiles={onPasteFiles ? (files) => onPasteFiles(files, block.id) : undefined}
        placeholder="引用する言葉"
        ariaLabel="引用する言葉"
        className="text-[18px] leading-[1.85] text-foreground"
      />
      <div className="mt-1 flex min-h-[44px] items-center gap-1.5">
        <span aria-hidden className="text-[16px] text-neutral-400">
          —
        </span>
        <input
          value={block.cite ?? ''}
          onChange={(e) => update((bs) => setQuoteCite(bs, block.id, e.target.value))}
          placeholder="出典（だれの言葉か。書かなくてもよい）"
          aria-label="引用の出典"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[16px] text-neutral-500 placeholder:text-neutral-300 focus:outline-none"
        />
      </div>
    </div>
  );
}
