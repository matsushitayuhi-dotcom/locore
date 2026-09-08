'use client';

import type { BlockOf, FieldProps } from './types';

/**
 * 区切り線（0091 / エディタ作り直し）。
 * 中に文字は入らないので、書式バーの「↑ / ↓ / 削除」を効かせるための
 * **44px の当たり判定**だけを用意する（タップするとこのブロックが選ばれる）。
 */
export function DividerField({ block, onFocusField }: FieldProps<BlockOf<'divider'>>) {
  return (
    <button
      type="button"
      onFocus={() => onFocusField?.({ blockId: block.id })}
      onClick={() => onFocusField?.({ blockId: block.id })}
      aria-label="区切り線"
      className="flex min-h-[44px] w-full items-center rounded-lg px-1 focus:outline-none focus-visible:bg-neutral-100"
    >
      <span aria-hidden className="block w-16 border-t border-foreground" />
    </button>
  );
}
