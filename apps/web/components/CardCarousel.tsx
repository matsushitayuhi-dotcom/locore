'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * CardCarousel — カードを横スワイプで見せる汎用カルーセル。
 *
 * 何のための部品か
 * ----------------
 * トップ（/）の「注目のエキスパート」や /experts のカード一覧を、2 カラムの
 * 縦長グリッドではなく「横に続く 1 列」で見せるための入れ物。スマホで 1 画面に
 * 2 枚しか入らず一覧性が悪い問題を、横スクロール + scroll-snap で解消する。
 *
 * どう使うか
 * ----------
 * カード自体は渡す側が用意する。この部品は「並べ方・スナップ・矢印・ドット」だけを持つ。
 *
 *   <CardCarousel title="注目のエキスパート" viewAllHref="/experts">
 *     {experts.map((e) => (
 *       <ExpertCard key={e.id} expert={e} />
 *     ))}
 *   </CardCarousel>
 *
 * 見出しや「すべて見る」が要らなければ props なしで children だけでもよい。
 *
 * 挙動
 * ----
 * - スマホ: 1 枚 80vw（次のカードが少し覗いて「横に続く」と分かる）。矢印は出さず指で送る。
 *   下に現在位置のドット（カードが 1 枚のときは出さない）。
 * - sm 以上: 2 / 3 / 4 / 5 列ぶんの幅に切り替わり、見出し右の矢印ボタンで 1 画面ぶん送る。
 * - キーボード: 列にフォーカスして ← → で前後に送れる（矢印ボタン自体も Tab で押せる）。
 * - JS が動かなくても素の横スクロールとしては使える（矢印とドットが出ないだけ）。
 *
 * レイアウト上の約束
 * ------------------
 * - 子は「縮まない側」なので幅を固定している。子側で w-full を付けても壊れない。
 * - 全幅ぶち抜き（-mx-4）はしていない。親の左右余白にカードの左端が揃う。
 * - スクロールバーはこのファイル内で隠している（globals.css は触らない）。
 */

export type CardCarouselProps = {
  /** 横に並べるカード。1 要素 = 1 スライド。 */
  children: ReactNode;
  /** 見出し（任意）。渡すと h2 として左上に出る。 */
  title?: string;
  /** 右上に置く「すべて見る」リンクの遷移先（任意）。省略するとリンクを出さない。 */
  viewAllHref?: string;
  /** 「すべて見る」の文言。既定は「すべて見る」。 */
  viewAllLabel?: string;
  /**
   * スクロール領域の aria-label。省略時は title、それも無ければ「カード一覧」。
   * 同じページに複数置くときは別々の文言にする。
   */
  ariaLabel?: string;
  /** 外側 section に足すクラス（余白の調整用）。 */
  className?: string;
};

/** 端の判定に使う許容誤差(px)。小数のスクロール位置で矢印がちらつくのを防ぐ。 */
const EDGE_TOLERANCE = 4;

export function CardCarousel({
  children,
  title,
  viewAllHref,
  viewAllLabel = 'すべて見る',
  ariaLabel,
  className,
}: CardCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // 空の子（条件付きレンダリングの false / null）を除いて枚数を数える。
  const items = useMemo(() => {
    const list: ReactNode[] = [];
    const walk = (node: ReactNode) => {
      if (node === null || node === undefined || node === false || node === true) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      list.push(node);
    };
    walk(children);
    return list;
  }, [children]);

  const count = items.length;

  /** 各スライドの左端（トラック内座標）。DOM から都度読む。 */
  const slideOffsets = useCallback((el: HTMLDivElement) => {
    const base = el.getBoundingClientRect().left - el.scrollLeft;
    return Array.from(el.children).map(
      (child) => (child as HTMLElement).getBoundingClientRect().left - base,
    );
  }, []);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > EDGE_TOLERANCE);
    setCanNext(el.scrollLeft < max - EDGE_TOLERANCE);

    const offsets = slideOffsets(el);
    if (offsets.length === 0) return;
    let nearest = 0;
    let best = Number.POSITIVE_INFINITY;
    offsets.forEach((left, i) => {
      const d = Math.abs(left - el.scrollLeft);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setActiveIndex(nearest);
  }, [slideOffsets]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', sync);
      ro.disconnect();
    };
  }, [sync, count]);

  /** dir 方向へ「1 画面ぶん」送る。1 画面に何枚入るかは実測から決める。 */
  const go = useCallback(
    (dir: 1 | -1) => {
      const el = trackRef.current;
      if (!el) return;
      const offsets = slideOffsets(el);
      const first = offsets[0];
      if (first === undefined) return;

      const second = offsets[1];
      const stride = second === undefined ? el.clientWidth : second - first;
      const perView =
        stride > 0 ? Math.max(1, Math.floor(el.clientWidth / stride)) : 1;

      const target = Math.min(
        Math.max(activeIndex + dir * perView, 0),
        offsets.length - 1,
      );
      const left = offsets[target];
      if (left === undefined) return;
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      el.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
    },
    [activeIndex, slideOffsets],
  );

  if (count === 0) return null;

  const label = ariaLabel ?? title ?? 'カード一覧';
  const hasHeader = Boolean(title) || Boolean(viewAllHref) || count > 1;

  return (
    <section
      className={className}
      aria-labelledby={title ? headingId : undefined}
    >
      {hasHeader ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          {title ? (
            <h2
              id={headingId}
              // flex-basis:0 のままだと折り返しの引き金にならないので min-w-[8rem] を併記
              className="min-w-[8rem] flex-1 text-[15px] font-bold tracking-tight text-foreground sm:text-lg"
            >
              {title}
            </h2>
          ) : (
            <span className="min-w-0 flex-1" aria-hidden />
          )}

          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-primary-700 underline-offset-4 hover:underline"
            >
              {viewAllLabel}
            </Link>
          ) : null}

          {/* 矢印は sm 以上だけ。スマホは指で送るので出さない。 */}
          {count > 1 ? (
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={!canPrev}
                aria-label={`${label}を前へ`}
                aria-controls={`${headingId}-track`}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-border"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={!canNext}
                aria-label={`${label}を次へ`}
                aria-controls={`${headingId}-track`}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-border"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        ref={trackRef}
        id={`${headingId}-track`}
        // スクロール領域はキーボードでも届く必要がある（WCAG 2.1.1）。
        tabIndex={0}
        role="group"
        aria-roledescription="カルーセル"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            go(1);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            go(-1);
          }
        }}
        className={
          'flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 ' +
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ' +
          'sm:gap-4 ' +
          // スクロールバーを隠す（globals.css に共通ユーティリティが無いのでここで完結）
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
        }
      >
        {items.map((child, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="スライド"
            aria-label={`${i + 1} / ${count}`}
            className={
              // スマホ: 画面の 80%。次が覗くので「横に続く」と分かる。
              'w-[80vw] max-w-[20rem] shrink-0 snap-start ' +
              // sm 以上: gap ぶんを引いて 2 → 3 → 4 → 5 列
              'sm:w-[calc((100%-1rem)/2)] sm:max-w-none ' +
              'md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)] xl:w-[calc((100%-4rem)/5)]'
            }
          >
            {child}
          </div>
        ))}
      </div>

      {/* 現在位置のドット。スマホのみ・2 枚以上のときだけ。
          タップ対象にすると 36px の的が枚数ぶん要るので、表示専用にして
          読み上げには下の sr-only テキストで位置を伝える。 */}
      {count > 1 ? (
        <>
          <div
            className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:hidden"
            aria-hidden
          >
            {items.map((_, i) => (
              <span
                key={i}
                className={
                  'h-1.5 rounded-full transition-all ' +
                  (i === activeIndex
                    ? 'w-4 bg-foreground/70'
                    : 'w-1.5 bg-foreground/20')
                }
              />
            ))}
          </div>
          <p className="sr-only" aria-live="polite">
            {activeIndex + 1} / {count} 枚目
          </p>
        </>
      ) : null}
    </section>
  );
}

export default CardCarousel;
