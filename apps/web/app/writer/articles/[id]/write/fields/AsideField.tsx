'use client';

import { ASIDE_TONES } from '../BLOCK_KINDS';
import { setAsideTone } from '../blockOps';
import { AutoTextarea } from './AutoTextarea';
import type { BlockOf, FieldProps } from './types';
import { writeBodyText } from './writeBody';

/**
 * メモ（0091 / エディタ作り直し）。本文 ＋ 種類のピルだけ。
 *
 * - ピルの文字は BLOCK_KINDS.ASIDE_TONES から取る。保存形式の enum（point / caution / memo）は画面に出さない
 * - 本文の書き戻しは writeBodyText。上限を超えた貼り付けを捨てずに直後の本文へ逃がす
 * - 旧エディタにあった「ラベル」欄は出さない。書き手が覚える語彙を増やさないため
 *   （既存記事の label は writeText / setAsideTone が {...block} で持ち回すので消えない）
 * - ピルは 44px 角以上。hover ではなく常に見えている
 */
export function AsideField(props: FieldProps<BlockOf<'aside'>>) {
  const { block, update, keymap, onFocusField, onPasteFiles } = props;
  return (
    <div className="rounded-lg border border-border bg-muted p-3">
      <div className="mb-1.5 flex flex-wrap gap-1.5" role="group" aria-label="メモの種類">
        {ASIDE_TONES.map((t) => {
          const on = block.kind === t.tone;
          return (
            <button
              key={t.tone}
              type="button"
              aria-pressed={on}
              onClick={() => update((bs) => setAsideTone(bs, block.id, t.tone))}
              className={
                'inline-flex min-h-[44px] items-center rounded-full border px-4 text-[14px] font-bold transition ' +
                (on ? 'border-foreground bg-foreground text-white' : 'border-border-strong bg-card text-neutral-500')
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <AutoTextarea
        pos={{ blockId: block.id }}
        value={block.text}
        onChange={(v) => writeBodyText(props, block, v)}
        keymap={keymap}
        onFocusField={onFocusField}
        onPasteFiles={onPasteFiles ? (files) => onPasteFiles(files, block.id) : undefined}
        placeholder="補足や注意を書く"
        ariaLabel="メモの本文"
        className="text-[16px] leading-[1.85] text-neutral-700"
      />
    </div>
  );
}
