'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { ImageIcon, MapPin } from 'lucide-react';
import {
  KIND_BASE_PATH,
  KIND_LABEL,
  type CommunityKind,
} from '@/lib/community/constants';
import type { CommunityPostListItem } from '@/lib/community/db';

/**
 * Airbnb 風のコミュニティ投稿カード。
 *
 * - 1〜N 枚の写真を 4:3 で大きく
 * - **写真エリアを横スワイプで切替できるミニカルーセル**（複数枚あるとき）
 * - 価格はバッジで右上、場所と投稿者を控えめに
 * - 投稿者名をクリックすると /residents/{id} の公開プロフィールへ
 */

type Props = {
  post: CommunityPostListItem;
  /** kind ラベルを左上にチップで表示するか（カテゴリ別セクションでは非表示推奨） */
  showKindBadge?: boolean;
};

function formatPrice(post: CommunityPostListItem): string | null {
  if (!post.priceAmount) return null;
  const sym = post.priceCurrency === 'JPY' ? '¥' : '€';
  const num = new Intl.NumberFormat('fr-FR').format(post.priceAmount);
  const unit = post.priceUnit;
  const unitJa =
    unit === 'monthly'
      ? '/月'
      : unit === 'hourly'
        ? '/時'
        : unit === 'annual'
          ? '/年'
          : unit === 'per_session'
            ? '/回'
            : '';
  return `${sym}${num}${unitJa}`;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const h = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60));
  if (h < 1) return 'たった今';
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}日前`;
  const m = Math.floor(day / 30);
  return `${m}ヶ月前`;
}

export function CommunityCard({ post, showKindBadge }: Props) {
  const href = `${KIND_BASE_PATH[post.kind]}/${post.id}`;
  const price = formatPrice(post);
  const photos = post.photos ?? [];

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-border transition hover:shadow-md hover:ring-primary-300">
      {/* 写真エリア（カルーセル） */}
      <PhotoStrip
        photos={photos}
        href={href}
        kind={post.kind}
        price={price}
        showKindBadge={showKindBadge}
      />

      {/* 本文 */}
      <Link href={href} className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground group-hover:text-primary-300 sm:text-[14px]">
          {post.title}
        </p>

        {post.locationText ? (
          <p className="inline-flex items-center gap-1 text-[11px] text-foreground/60">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{post.locationText}</span>
          </p>
        ) : null}
      </Link>

      {/* フッター: 投稿者リンクと日時。 Link の入れ子を避けるためカード本体の外に */}
      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-0 text-[10px] text-foreground/50 sm:px-4 sm:pb-4">
        {post.authorId ? (
          <Link
            href={`/residents/${post.authorId}`}
            className="line-clamp-1 underline-offset-2 hover:text-primary-300 hover:underline"
          >
            {post.authorName ?? '匿名'}
          </Link>
        ) : (
          <span className="line-clamp-1">{post.authorName ?? '匿名'}</span>
        )}
        <span className="shrink-0 tabular">{timeAgo(post.createdAt)}</span>
      </div>
    </div>
  );
}

// ===========================================================================
// 写真ストリップ（複数枚なら横スクロール、なければ 1 枚）
// ===========================================================================

function PhotoStrip({
  photos,
  href,
  kind,
  price,
  showKindBadge,
}: {
  photos: string[];
  href: string;
  kind: CommunityKind;
  price: string | null;
  showKindBadge?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const multi = photos.length > 1;

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w === 0) return;
    const idx = Math.round(el.scrollLeft / w);
    setActiveIndex(Math.max(0, Math.min(photos.length - 1, idx)));
  };

  if (photos.length === 0) {
    return (
      <Link
        href={href}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-muted"
      >
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-card text-foreground/30">
          <ImageIcon className="h-8 w-8" />
        </div>
        {showKindBadge ? (
          <span className="absolute left-2 top-2 rounded-full bg-card/95 px-2 py-0.5 text-[10px] font-bold tracking-wider text-foreground shadow-sm ring-1 ring-border/60 backdrop-blur">
            {KIND_LABEL[kind]}
          </span>
        ) : null}
        {price ? (
          <span className="absolute right-2 top-2 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold tabular text-background shadow-sm">
            {price}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
      {/* 横スクロールコンテナ */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapStop: 'always' }}
      >
        {photos.map((url, i) => (
          <Link
            key={i}
            href={href}
            className="relative h-full w-full shrink-0 snap-start snap-always"
            aria-label={`${i + 1} 枚目`}
          >
            <Image
              src={url}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition group-hover:scale-[1.02]"
              unoptimized
              priority={i === 0}
            />
          </Link>
        ))}
      </div>

      {/* オーバーレイバッジ */}
      {showKindBadge ? (
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-card/95 px-2 py-0.5 text-[10px] font-bold tracking-wider text-foreground shadow-sm ring-1 ring-border/60 backdrop-blur">
          {KIND_LABEL[kind]}
        </span>
      ) : null}
      {price ? (
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold tabular text-background shadow-sm">
          {price}
        </span>
      ) : null}

      {/* ドット（複数枚のときのみ） */}
      {multi ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1">
          {photos.map((_, i) => (
            <span
              key={i}
              className={
                'h-1.5 rounded-full transition-all duration-300 ' +
                (i === activeIndex
                  ? 'w-4 bg-white shadow'
                  : 'w-1.5 bg-white/60')
              }
            />
          ))}
        </div>
      ) : null}

      {/* 枚数チップ */}
      {multi ? (
        <span className="pointer-events-none absolute right-2 bottom-2 rounded-full bg-neutral-900/70 px-2 py-0.5 text-[10px] font-bold tabular text-white backdrop-blur">
          {activeIndex + 1} / {photos.length}
        </span>
      ) : null}
    </div>
  );
}
