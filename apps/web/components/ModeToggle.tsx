'use client';

import { useTransition } from 'react';
import { Compass, Briefcase } from 'lucide-react';
import { switchViewerMode } from '@/lib/mode/actions';

/**
 * ヘッダーに常駐するモード切替トグル。
 *
 * - 「旅行者 | 駐在員」2 セグメントのピル
 * - クリックで Server Action 経由で cookie を書き換えて、対応ホームへリダイレクト
 * - 現在モード未選択（cookie 無し）の場合は両方を未選択状態で出す
 *   → どちらかをタップすれば確定 + ホームへ
 *
 * モバイルでも常時見えるよう、コンパクトサイズ。
 */
export function ModeToggle({
  currentMode,
  size = 'sm',
}: {
  currentMode: 'traveler' | 'resident' | null;
  size?: 'sm' | 'md';
}) {
  const [isPending, startTransition] = useTransition();

  const onSwitch = (mode: 'traveler' | 'resident') => {
    if (mode === currentMode) return; // 同じモードならノーオペ
    startTransition(async () => {
      await switchViewerMode(mode);
    });
  };

  const padding = size === 'md' ? 'px-3 py-1.5' : 'px-2.5 py-1';
  const fontClass = size === 'md' ? 'text-[12px]' : 'text-[11px]';
  const iconSize = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';

  return (
    <div
      role="radiogroup"
      aria-label="モード切替"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-card p-0.5 ring-1 ring-border"
    >
      <button
        type="button"
        role="radio"
        aria-checked={currentMode === 'traveler'}
        disabled={isPending}
        onClick={() => onSwitch('traveler')}
        className={
          'inline-flex items-center gap-1 rounded-full font-semibold transition ' +
          padding +
          ' ' +
          fontClass +
          ' ' +
          (currentMode === 'traveler'
            ? 'bg-primary-500 text-neutral-950'
            : 'text-foreground/65 hover:text-foreground')
        }
      >
        <Compass className={iconSize} />
        旅行者
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={currentMode === 'resident'}
        disabled={isPending}
        onClick={() => onSwitch('resident')}
        className={
          'inline-flex items-center gap-1 rounded-full font-semibold transition ' +
          padding +
          ' ' +
          fontClass +
          ' ' +
          (currentMode === 'resident'
            ? 'bg-primary-500 text-neutral-950'
            : 'text-foreground/65 hover:text-foreground')
        }
      >
        <Briefcase className={iconSize} />
        駐在員
      </button>
    </div>
  );
}
