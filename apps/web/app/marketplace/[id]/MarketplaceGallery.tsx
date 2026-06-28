'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, ChevronLeft, ChevronRight, X, Expand } from 'lucide-react';

/**
 * 売ります・買います用の商品ギャラリー。
 *
 * - 大きいメイン画像 + 横スクロールのサムネイル列（クリックで切替・選択中はライム枠）。
 * - メイン or 拡大ボタンで全画面ライトボックス（← →・キーボード・スワイプ・枚数カウンタ）。
 * - 1枚ならサムネ列なし、0枚はプレースホルダ。
 *
 * 要素（スペック等）は従来のまま。写真の見せ方だけを強化するためのコンポーネント。
 * 既存ページが next/image(unoptimized) を使っているのに合わせる。
 */
export function MarketplaceGallery({
  photos,
  title,
}: {
  photos: string[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchX = useRef<number | null>(null);

  const count = photos.length;
  const safeIndex = Math.min(index, Math.max(0, count - 1));

  const go = useCallback(
    (dir: 1 | -1) => {
      if (count === 0) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count],
  );

  // キーボード操作（ライトボックス中）
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    // ライトボックス中は背面スクロールを止める
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox, go]);

  if (count === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-muted text-foreground/30">
        <Camera className="h-10 w-10" />
      </div>
    );
  }

  // count > 0 かつ safeIndex は [0, count-1] にクランプ済みなので必ず存在する
  const current = photos[safeIndex] as string;

  return (
    <div>
      {/* メイン画像 */}
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-xl bg-muted"
        aria-label="写真を拡大表示"
      >
        <Image
          key={current}
          src={current}
          alt={`${title} の写真 ${safeIndex + 1}`}
          fill
          sizes="(min-width: 640px) 60vw, 100vw"
          className="object-cover"
          priority
          unoptimized
        />
        {/* 枚数カウンタ */}
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
          <Camera className="h-3 w-3" />
          {safeIndex + 1} / {count}
        </span>
        <span className="pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/0 px-2 py-1 text-[11px] font-bold text-white opacity-0 backdrop-blur-sm transition group-hover:bg-black/55 group-hover:opacity-100">
          <Expand className="h-3 w-3" />
          拡大
        </span>
        {/* メイン上の前後ボタン（複数時） */}
        {count > 1 ? (
          <>
            <span
              role="button"
              tabIndex={-1}
              aria-label="前の写真"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-foreground opacity-0 shadow transition hover:bg-white group-hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </span>
            <span
              role="button"
              tabIndex={-1}
              aria-label="次の写真"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-foreground opacity-0 shadow transition hover:bg-white group-hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          </>
        ) : null}
      </button>

      {/* サムネイル列 */}
      {count > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {photos.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`写真 ${i + 1} を表示`}
              aria-current={i === safeIndex}
              className={
                'relative aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted ring-2 transition ' +
                (i === safeIndex
                  ? 'ring-primary-500'
                  : 'ring-transparent hover:ring-border')
              }
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="64px"
                className={
                  'object-cover transition ' +
                  (i === safeIndex ? '' : 'opacity-80 hover:opacity-100')
                }
                unoptimized
              />
            </button>
          ))}
        </div>
      ) : null}

      {/* ライトボックス */}
      {lightbox ? (
        <div
          className="fixed inset-0 z-[120] flex flex-col bg-black/92"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} の写真`}
          onClick={() => setLightbox(false)}
        >
          {/* 上部バー */}
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-[13px] font-bold tabular">
              {safeIndex + 1} / {count}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              aria-label="閉じる"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 画像 */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-4"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              touchX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const endX = e.changedTouches[0]?.clientX;
              if (endX !== undefined) {
                const dx = endX - touchX.current;
                if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
              }
              touchX.current = null;
            }}
          >
            {count > 1 ? (
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="前の写真"
                className="absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-5"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            ) : null}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt={`${title} の写真 ${safeIndex + 1}`}
              className="max-h-full max-w-full select-none rounded-lg object-contain"
              draggable={false}
            />

            {count > 1 ? (
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="次の写真"
                className="absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-5"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            ) : null}
          </div>

          {/* 下部サムネイル */}
          {count > 1 ? (
            <div
              className="flex justify-start gap-2 overflow-x-auto px-4 py-3 sm:justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`写真 ${i + 1}`}
                  className={
                    'relative aspect-square h-12 w-12 shrink-0 overflow-hidden rounded-md ring-2 transition ' +
                    (i === safeIndex
                      ? 'ring-primary-500'
                      : 'opacity-55 ring-transparent hover:opacity-100')
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
