'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PhotoEntry } from '@/lib/mock/types';

/**
 * フォト日記のリーダービュー（Instagram カルーセル風）。
 *
 * 仕様:
 *  - 1 エントリ = 1 スライド、横スクロール + scroll-snap で左右にスワイプ
 *  - キャプションは画像の上にオーバーレイで重ねる
 *      - 初期表示: 画像下部にグラデーション + 2 行プレビュー
 *      - タップ: 画像全面に半透明オーバーレイ + キャプション全文
 *      - もう一度タップで戻る
 *  - 進捗バー (Instagram ストーリー風) を上部に
 *  - キーボード ←→ でも切り替え可能
 *
 * 親 (article 詳細ページ) で paywall を通った後にだけ描画する想定。
 */
export function PhotoJournalView({
  entries,
  title,
}: {
  entries: PhotoEntry[];
  title: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card px-6 py-12 text-center text-[13px] text-foreground/55">
        まだ写真がアップロードされていません。
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => a.position - b.position);

  return <InstaCarousel sorted={sorted} title={title} />;
}

// ===========================================================================
// 横スクロールカルーセル本体
// ===========================================================================

function InstaCarousel({
  sorted,
  title,
}: {
  sorted: PhotoEntry[];
  title: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // スクロール位置から現在のスライドを算出
  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w === 0) return;
    const idx = Math.round(el.scrollLeft / w);
    setActiveIndex(Math.max(0, Math.min(sorted.length - 1, idx)));
  };

  const goTo = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(sorted.length - 1, idx));
    el.scrollTo({ left: el.clientWidth * target, behavior: 'smooth' });
  };

  // キーボード矢印で操作
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // テキスト入力中は無視
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') goTo(activeIndex + 1);
      else if (e.key === 'ArrowLeft') goTo(activeIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, sorted.length]);

  return (
    <section
      aria-label={`${title} のフォト日記`}
      aria-roledescription="carousel"
      className="relative overflow-hidden rounded-2xl bg-neutral-950 text-white"
    >
      {/* 上部の進捗バー（Insta ストーリー風） */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex gap-1">
        {sorted.map((_, i) => (
          <div
            key={i}
            className={
              'h-0.5 flex-1 rounded-full transition-colors duration-300 ' +
              (i < activeIndex
                ? 'bg-white/90'
                : i === activeIndex
                  ? 'bg-white'
                  : 'bg-white/25')
            }
          />
        ))}
      </div>

      {/* 左右矢印（デスクトップ向け） */}
      {activeIndex > 0 ? (
        <button
          type="button"
          aria-label="前の写真"
          onClick={() => goTo(activeIndex - 1)}
          className="absolute left-2 top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-full bg-neutral-950/60 p-2 text-white/90 backdrop-blur transition hover:bg-neutral-950/80 sm:inline-flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : null}
      {activeIndex < sorted.length - 1 ? (
        <button
          type="button"
          aria-label="次の写真"
          onClick={() => goTo(activeIndex + 1)}
          className="absolute right-2 top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-full bg-neutral-950/60 p-2 text-white/90 backdrop-blur transition hover:bg-neutral-950/80 sm:inline-flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      ) : null}

      {/* 横スクロールコンテナ */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapStop: 'always' }}
      >
        {sorted.map((entry, i) => (
          <InstaSlide
            key={i}
            entry={entry}
            index={i}
            total={sorted.length}
            isActive={i === activeIndex}
          />
        ))}
      </div>

      {/* 下のドット + カウンター（モバイルでも見えるように） */}
      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-[11px] text-white/65 sm:px-6">
        <span className="tabular">
          <span className="font-bold text-white">{activeIndex + 1}</span>
          <span className="mx-1 text-white/40">/</span>
          {sorted.length}
        </span>
        <div className="flex items-center gap-1">
          {sorted.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} 枚目へ`}
              onClick={() => goTo(i)}
              className={
                'h-1.5 rounded-full transition-all ' +
                (i === activeIndex
                  ? 'w-5 bg-white'
                  : 'w-1.5 bg-white/30 hover:bg-white/60')
              }
            />
          ))}
        </div>
        <span className="hidden text-white/40 sm:inline">{title}</span>
      </div>
    </section>
  );
}

// ===========================================================================
// 1 枚のスライド（画像 + オーバーレイキャプション）
// ===========================================================================

function InstaSlide({
  entry,
  index,
  total,
  isActive,
}: {
  entry: PhotoEntry;
  index: number;
  total: number;
  isActive: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // 別スライドに移ったら、勝手に閉じておく
  useEffect(() => {
    if (!isActive && expanded) setExpanded(false);
  }, [isActive, expanded]);

  return (
    <article
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} / ${total}`}
      className="relative w-full shrink-0 snap-start snap-always"
      style={{ scrollSnapStop: 'always' }}
    >
      {/* 画像本体（縦長ポートレート寄りで Insta っぽく） */}
      <div
        className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-900 sm:aspect-[3/4]"
        onClick={() => setExpanded((x) => !x)}
      >
        <Image
          src={entry.imageUrl}
          alt={entry.locationName ?? entry.caption.slice(0, 40)}
          fill
          sizes="(min-width: 640px) 720px, 100vw"
          className="object-cover"
          unoptimized
          priority={index === 0}
        />

        {/* 場所バッジ（左上）— 進捗バーと被らないよう少し下げる */}
        {entry.locationName ? (
          <span className="pointer-events-none absolute left-3 top-8 z-20 inline-flex max-w-[60%] items-center gap-1 rounded-full bg-neutral-950/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{entry.locationName}</span>
          </span>
        ) : null}

        {/* カウンター（右上） */}
        <span className="pointer-events-none absolute right-3 top-8 z-20 inline-flex items-center rounded-full bg-neutral-950/60 px-2 py-0.5 text-[10px] font-bold tabular tracking-wider text-white/90 backdrop-blur">
          {index + 1} / {total}
        </span>

        {/* キャプションオーバーレイ */}
        {entry.caption ? (
          expanded ? (
            // 全画面オーバーレイ
            <div
              className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/70 to-black/30 px-5 pb-6 pt-12 sm:px-8 sm:pb-8"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setExpanded(false);
              }}
            >
              <p
                className="whitespace-pre-line text-[14px] leading-[1.85] text-white sm:text-[15px]"
                style={{
                  fontFamily:
                    'var(--font-serif-jp), var(--font-serif), serif',
                }}
              >
                {entry.caption}
              </p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/55">
                タップで閉じる
              </p>
            </div>
          ) : (
            // ピーク表示（下部のみ）
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-3 pt-12 sm:px-6 sm:pb-4">
              <p className="line-clamp-2 text-[13px] leading-snug text-white/95 sm:text-[14px]">
                {entry.caption}
              </p>
              {entry.caption.length > 60 ? (
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/55">
                  タップで全文
                </p>
              ) : null}
            </div>
          )
        ) : null}
      </div>
    </article>
  );
}
