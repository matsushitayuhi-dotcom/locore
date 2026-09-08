'use client';

import { AutoTextarea } from './AutoTextarea';
import type { BlockOf, FieldProps } from './types';
import { writeBodyText } from './writeBody';

/**
 * 見出し（H2）と小見出し（H3）。0091 / エディタ作り直し。
 *
 * - 書き手には「見出し」「小見出し」としか見せない。level という言い方は UI に出さない
 * - 1 行だけ。改行はスペースに畳む（保存形式が short = 300 字の 1 行だから）
 * - 300 字を超えた貼り付けは捨てずに直後の本文へ逃がす（writeBodyText）。
 *   見出しの途中で改行したときの後半を本文にする splitAt と同じ扱いにそろえている
 * - 旧エディタにあった「番号を付ける」チェックは出さない。書き手が触る語彙を増やさないため。
 *   既存記事の numbered は writeText が {...block} で持ち回すので消えない
 */
export function HeadingField(props: FieldProps<BlockOf<'heading'>>) {
  const { block, keymap, onFocusField } = props;
  const isH2 = block.level === 2;
  return (
    <AutoTextarea
      pos={{ blockId: block.id }}
      value={block.text}
      onChange={(v) => writeBodyText(props, block, v)}
      keymap={keymap}
      onFocusField={onFocusField}
      singleLine
      placeholder={isH2 ? '見出し' : '小見出し'}
      ariaLabel={isH2 ? '見出し' : '小見出し'}
      className={
        isH2
          ? 'text-[22px] font-bold leading-[1.5] tracking-[-0.015em] text-foreground'
          : 'text-[18px] font-bold leading-[1.6] text-foreground'
      }
    />
  );
}
