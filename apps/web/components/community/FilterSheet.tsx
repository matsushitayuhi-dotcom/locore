'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

/**
 * コミュニティ一覧用の「絞り込み」ボトムシート / モーダル。
 *
 * - トリガー: 「絞り込み (N)」ボタン
 * - スマホ: 下から slide-up
 * - PC (sm+): 中央にモーダル
 * - 中身は children として親から各 kind 固有のフィルタフォームを渡す
 *
 * 親側で <form action="..." method="GET"> として hidden を含むフォームを置く設計。
 * 「適用」「リセット」もこの中に置く想定（親から渡す）。
 */
export function FilterSheet({
  activeCount,
  children,
}: {
  /** active な絞り込み数（バッジ表示用） */
  activeCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // body スクロールロック
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // ESC で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ' +
          (activeCount > 0
            ? 'bg-primary-500 text-neutral-950'
            : 'bg-muted text-foreground/75 hover:bg-foreground/10')
        }
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        絞り込み
        {activeCount > 0 ? (
          <span className="tabular">({activeCount})</span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="絞り込み"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        >
          {/* オーバーレイ */}
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
          />

          {/* シート本体 */}
          <div
            className={
              'relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden bg-background shadow-2xl ' +
              'rounded-t-2xl sm:max-w-md sm:rounded-2xl sm:max-h-[80vh]'
            }
          >
            <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-foreground/75" />
                <h2 className="text-[14px] font-bold">絞り込み</h2>
                {activeCount > 0 ? (
                  <span className="inline-flex items-center justify-center rounded-full bg-primary-500 px-1.5 py-0.5 text-[10px] font-bold tabular text-neutral-950">
                    {activeCount}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="rounded-full p-1.5 text-foreground/65 transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
