'use client';

import { AutoTextarea } from './AutoTextarea';
import type { BlockOf, FieldProps } from './types';
import { writeBodyText } from './writeBody';

/**
 * 本文（0091 / エディタ作り直し）。
 * 記事ページ（Prose）の本文と同じ大きさ・行間で書けるようにしている。
 * Enter での分割・Backspace での結合・URL の貼り付けはすべて useBlockKeymap と BlockEditor 側の仕事。
 *
 * 書き戻しは writeBodyText を通す。上限（4000 字）を超えた貼り付けを捨てずに
 * 直後の本文ブロックへ逃がすため（setText をそのまま使うと超過分が無言で消える）。
 * 写真ファイルの貼り付けは親（onPasteFiles）へ渡して、この段落の直後に写真ブロックを作ってもらう。
 */
export function ParagraphField(props: FieldProps<BlockOf<'paragraph'>>) {
  const { block, keymap, onFocusField, onPasteFiles } = props;
  return (
    <AutoTextarea
      pos={{ blockId: block.id }}
      value={block.text}
      onChange={(v) => writeBodyText(props, block, v)}
      keymap={keymap}
      onFocusField={onFocusField}
      onPasteFiles={onPasteFiles ? (files) => onPasteFiles(files, block.id) : undefined}
      placeholder="本文"
      ariaLabel="本文"
      className="text-[17px] leading-[1.95] text-neutral-900"
    />
  );
}
