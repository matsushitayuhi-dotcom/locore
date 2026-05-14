'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, Camera } from 'lucide-react';

/**
 * 物件詳細用の写真ギャラリー。
 * 1 枚目をヒーローで大きく、残りはサムネ行で。
 * クリックでライトボックス（全画面表示）。矢印キー / Esc で操作可能。
 */
export function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(
    () => setOpenIndex((i) => (i == null ? null : (i + 1) % photos.length)),
    [photos.length],
  );
  const prev = useCallback(
    () =>
      setOpenIndex((i) =>
        i == null ? null : (i - 1 + photos.length) % photos.length,
      ),
    [photos.length],
  );

  useEffect(() => {
    if (openIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex, close, next, prev]);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-muted text-[12px] text-foreground/45">
        <span className="inline-flex flex-col items-center gap-1.5">
          <Camera className="h-6 w-6" />
          写真はまだ登録されていません
        </span>
      </div>
    );
  }

  const hero = photos[0]!;
  const rest = photos.slice(1);

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        {/* ヒーロー（左 3/4） */}
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          className="relative col-span-1 aspect-[4/3] overflow-hidden rounded-xl bg-muted sm:col-span-3 sm:aspect-[16/10]"
        >
          <Image
            src={hero}
            alt={`${title} - 写真 1`}
            fill
            sizes="(min-width: 640px) 70vw, 100vw"
            className="object-cover transition hover:scale-[1.01]"
            priority
            unoptimized
          />
        </button>

        {/* サムネイル列（右 1/4） */}
        {rest.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-1 sm:grid-rows-3">
            {rest.slice(0, 3).map((src, i) => {
              const idx = i + 1;
              const isLast = i === 2 && rest.length > 3;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setOpenIndex(idx)}
                  className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted sm:aspect-auto"
                >
                  <Image
                    src={src}
                    alt={`${title} - 写真 ${idx + 1}`}
                    fill
                    sizes="(min-width: 640px) 25vw, 25vw"
                    className="object-cover"
                    unoptimized
                  />
                  {isLast ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-neutral-900/60 text-[14px] font-bold text-white">
                      +{photos.length - 4}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* ライトボックス */}
      {openIndex != null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="写真を拡大"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/90 px-4 py-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {photos.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="前の写真"
                onClick={prev}
                className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="次の写真"
                onClick={next}
                className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <div className="relative max-h-full max-w-5xl">
            {/* next/image は固定 fill が必要なのでラップ */}
            <div className="relative h-[80vh] w-[90vw] max-w-5xl">
              <Image
                src={photos[openIndex]!}
                alt={`${title} - 写真 ${openIndex + 1}`}
                fill
                sizes="90vw"
                className="object-contain"
                unoptimized
              />
            </div>
            <p className="mt-2 text-center text-[12px] text-white/70 tabular">
              {openIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
