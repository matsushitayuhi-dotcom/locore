import Link from 'next/link';
import Image from 'next/image';
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
 * - 1枚目の写真を 4:3 で大きく
 * - 価格はカード右上 or 下部に強調
 * - 場所 / 投稿者 / 日数経過を控えめに
 *
 * /expat トップでカテゴリごとの新着 4 件をグリッドに並べるのに使う。
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
  const photo = post.photos[0] ?? null;
  const price = formatPrice(post);

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-border transition hover:shadow-md hover:ring-primary-300"
    >
      {/* 写真エリア（4:3） */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {photo ? (
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-card text-foreground/30">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        {showKindBadge ? (
          <span className="absolute left-2 top-2 rounded-full bg-card/95 px-2 py-0.5 text-[10px] font-bold tracking-wider text-foreground shadow-sm ring-1 ring-border/60 backdrop-blur">
            {KIND_LABEL[post.kind as CommunityKind]}
          </span>
        ) : null}
        {price ? (
          <span className="absolute right-2 top-2 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold tabular text-background shadow-sm">
            {price}
          </span>
        ) : null}
      </div>

      {/* 本文 */}
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground group-hover:text-primary-300 sm:text-[14px]">
          {post.title}
        </p>

        {post.locationText ? (
          <p className="inline-flex items-center gap-1 text-[11px] text-foreground/60">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{post.locationText}</span>
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[10px] text-foreground/50">
          <span className="line-clamp-1">
            {post.authorName ?? '匿名'}
          </span>
          <span className="shrink-0 tabular">{timeAgo(post.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
