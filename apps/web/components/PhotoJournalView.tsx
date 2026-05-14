import Image from 'next/image';
import { MapPin } from 'lucide-react';
import type { PhotoEntry } from '@/lib/mock/types';

/**
 * フォト日記のリーダービュー。
 *
 * - 1 エントリ = 1 ビューポート相当
 * - 縦スクロール + scroll-snap で 1 枚ずつ吸着
 * - 写真をフル幅で見せ、キャプションと場所名は下部にオーバーレイ
 * - SSR フレンドリーな静的レイアウト（Client Component 不要）
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

  return (
    <section
      aria-label={`${title} のフォト日記`}
      className="snap-y snap-mandatory overflow-y-auto rounded-2xl bg-neutral-950 text-white"
      style={{ scrollSnapStop: 'always' }}
    >
      <ol className="divide-y divide-neutral-900">
        {sorted.map((entry, i) => (
          <li
            key={i}
            className="relative flex min-h-[88vh] snap-start snap-always flex-col"
          >
            {/* 写真 */}
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-900 sm:aspect-[3/4]">
              <Image
                src={entry.imageUrl}
                alt={entry.locationName ?? entry.caption.slice(0, 40)}
                fill
                sizes="(min-width: 640px) 720px, 100vw"
                className="object-cover"
                unoptimized
              />
              {/* 進捗インジケータ (i+1 / total) */}
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-neutral-950/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur">
                {i + 1} / {sorted.length}
              </span>
              {/* 場所バッジ */}
              {entry.locationName ? (
                <span className="absolute left-3 top-3 inline-flex max-w-[60%] items-center gap-1 rounded-full bg-neutral-950/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{entry.locationName}</span>
                </span>
              ) : null}
            </div>

            {/* キャプション */}
            {entry.caption ? (
              <div className="px-5 py-6 sm:px-8 sm:py-8">
                <p
                  className="whitespace-pre-line text-[15px] leading-[1.9] text-white/90"
                  style={{
                    fontFamily:
                      'var(--font-serif-jp), var(--font-serif), serif',
                  }}
                >
                  {entry.caption}
                </p>
              </div>
            ) : (
              <div className="px-5 py-6 sm:px-8 sm:py-8 text-[12px] text-white/45">
                キャプションはありません
              </div>
            )}
          </li>
        ))}

        {/* 末尾の余白（最後の写真もちゃんと snap して気持ちよく終わる） */}
        <li className="flex min-h-[40vh] flex-col items-center justify-center text-center text-white/45">
          <p
            className="text-[16px] font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            — 最後まで読んでくれてありがとう —
          </p>
          <p className="mt-2 text-[11px]">{title}</p>
        </li>
      </ol>
    </section>
  );
}
