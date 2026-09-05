'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * /experts のテーマ列（Intro 型の横スクロール列）。
 * 子要素をそのまま横に並べ、右端（左端）に丸い矢印ボタンを出す。
 * スクロールは CSS の overflow + snap で、JS は「1 画面ぶん進む」だけ。
 * JS 無効時も横スクロールできる（ボタンだけ消える）。
 */
export function ExpertRail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        className="grid snap-x snap-mandatory auto-cols-[calc((100%-14px)/2)] grid-flow-col gap-[14px] overflow-x-auto pb-1.5 [scrollbar-width:none] sm:auto-cols-[calc((100%-2*14px)/3)] lg:auto-cols-[calc((100%-3*14px)/4)] xl:auto-cols-[calc((100%-5*14px)/6)] [&::-webkit-scrollbar]:hidden [&>*]:snap-start"
      >
        {children}
      </div>
      {canPrev ? (
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="前へ"
          className="absolute -left-4 top-[calc(50%-70px)] hidden h-10 w-10 place-items-center rounded-full border border-border bg-card shadow-md transition hover:border-foreground md:grid"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      {canNext ? (
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="次へ"
          className="absolute -right-4 top-[calc(50%-70px)] hidden h-10 w-10 place-items-center rounded-full border border-border bg-card shadow-md transition hover:border-foreground md:grid"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
