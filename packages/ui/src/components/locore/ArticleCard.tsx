"use client";

import * as React from "react";
import { Clock, Heart, MapPin, Star } from "lucide-react";
import { cn } from "../../lib/utils";
import { type ResidencyTier } from "./ResidencyBadge";

export type DurationType = "1h" | "half-day" | "1day" | "multi-day" | string;

/**
 * 記事の種別タグ。
 * - `spot_guide`: 個別の店・場所を紹介する記事
 * - `itinerary` : 時間軸ありのコース・モデルプラン
 */
export type ArticleType = "spot_guide" | "itinerary";

const ARTICLE_TYPE_LABEL: Record<ArticleType, string> = {
  spot_guide: "スポット",
  itinerary: "旅程",
};

export interface ArticleCardAuthor {
  name: string;
  /** 居住している街の表示名（例: "パリ"）。 */
  residency?: string;
  tier: ResidencyTier;
  residencyYears?: number;
  avatarUrl?: string;
}

export interface ArticleCardModel {
  id: string;
  title: string;
  coverImageUrl?: string;
  /** カバー左上のエリアピル表示（例: "パリ・マレ"）。 */
  area?: string;
  author: ArticleCardAuthor;
  localScore: number;
  satisfactionStars: number;
  reviewCount?: number;
  priceJpy: number;
  durationType?: DurationType;
  spotsCount?: number;
  /** 記事の種別。`spot_guide`（場所紹介）/ `itinerary`（旅程プラン）。 */
  articleType?: ArticleType;
  /** いいね件数（任意。0 でも表示する） */
  likeCount?: number;
  /** お気に入り保存数（任意。0 でも表示する） */
  bookmarkCount?: number;
}

export interface ArticleCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "onClick"> {
  article: ArticleCardModel;
  /** Card-wide click handler (typically navigates to the article). */
  onClick?: (article: ArticleCardModel) => void;
  onAddToTrip?: (article: ArticleCardModel) => void;
  onBookmark?: (article: ArticleCardModel) => void;
  /** Already bookmarked. */
  bookmarked?: boolean;
  /** Hide the author row (used on author profile pages). */
  hideAuthor?: boolean;
}

const DURATION_LABEL: Record<string, string> = {
  "1h": "1時間",
  "half-day": "半日",
  "1day": "1日",
  "multi-day": "複数日",
};

function formatDuration(d?: DurationType): string | null {
  if (!d) return null;
  return DURATION_LABEL[d] ?? d;
}

/**
 * ArticleCard v2 — Airbnb 風フィードカード。
 *
 * デザイン方針:
 *  - 画像主導：aspect-square のフルブリードカバー、角丸 `rounded-xl`
 *  - カード自体に背景・ボーダーは持たせず、画像が「カード」を兼ねる
 *  - 画像の上には pill オーバーレイのみ（エリア / 種別 / ローカル度）
 *  - 画像の下は本文ページ背景の上に直接タイポを置く（Airbnb スタイル）
 *  - ハートで「保存」、コーラル色でフィル
 *  - タップで scale(0.98)、ホバーで画像のみ僅かに opacity 落とす
 */
export const ArticleCard = React.forwardRef<HTMLElement, ArticleCardProps>(
  (
    {
      article,
      onClick,
      onAddToTrip,
      onBookmark,
      bookmarked = false,
      hideAuthor = false,
      className,
      ...rest
    },
    ref,
  ) => {
    const {
      title,
      coverImageUrl,
      area,
      author,
      localScore,
      satisfactionStars,
      reviewCount,
      priceJpy,
      durationType,
      spotsCount,
      articleType,
    } = article;

    const handleBookmark = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onBookmark?.(article);
    };
    const handleAddToTrip = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onAddToTrip?.(article);
    };
    const handleRootClick = () => onClick?.(article);

    const durationLabel = formatDuration(durationType);

    return (
      <article
        ref={ref}
        data-locore-component="ArticleCard"
        data-locore-article-id={article.id}
        onClick={onClick ? handleRootClick : undefined}
        className={cn(
          "group flex flex-col gap-3 transition-transform duration-fast ease-out",
          "active:scale-[0.98]",
          onClick && "cursor-pointer",
          className,
        )}
        {...rest}
      >
        {/* Image (square, card-style rounded) ----------------------------- */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImageUrl}
              alt=""
              loading="lazy"
              className={cn(
                "h-full w-full object-cover",
                "transition-transform duration-slow ease-out",
                onClick && "group-hover:scale-[1.03]",
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/30">
              <span className="text-[11px] font-medium uppercase tracking-wider">No Cover</span>
            </div>
          )}

          {/* Top-left: area + type pills */}
          {(area || articleType) && (
            <div className="absolute left-3 top-3 flex items-center gap-1.5">
              {area ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    "rounded-full bg-neutral-950/70 px-2.5 py-1 backdrop-blur-md",
                    "text-[10px] font-bold uppercase tracking-wider text-neutral-50",
                  )}
                >
                  <MapPin className="size-3" aria-hidden />
                  {area}
                </span>
              ) : null}
              {articleType ? (
                <span
                  data-locore-article-type={articleType}
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 backdrop-blur-md",
                    "text-[10px] font-bold uppercase tracking-wider",
                    articleType === "itinerary"
                      ? "bg-primary-500 text-neutral-950"
                      : "bg-neutral-950/70 text-neutral-50",
                  )}
                >
                  {ARTICLE_TYPE_LABEL[articleType]}
                </span>
              ) : null}
            </div>
          )}

          {/* Top-right: heart save */}
          {onBookmark ? (
            <button
              type="button"
              onClick={handleBookmark}
              aria-label={bookmarked ? "保存を外す" : "保存"}
              aria-pressed={bookmarked}
              className={cn(
                "absolute right-3 top-3 inline-flex size-9 items-center justify-center",
                "rounded-full backdrop-blur-md transition-transform duration-fast ease-out",
                "hover:scale-110 active:scale-95",
                bookmarked
                  ? "bg-accent-500/90 text-neutral-50"
                  : "bg-neutral-950/55 text-neutral-50 hover:bg-neutral-950/70",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500",
              )}
            >
              <Heart
                className="size-5"
                fill={bookmarked ? "currentColor" : "none"}
                strokeWidth={2.2}
                aria-hidden
              />
            </button>
          ) : null}

          {/* Bottom-left: local score pill */}
          <div
            className={cn(
              "absolute bottom-3 left-3 inline-flex items-center gap-1.5",
              "rounded-full bg-neutral-950/80 px-2.5 py-1 backdrop-blur-md",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                localScore >= 70
                  ? "bg-primary-500"
                  : localScore >= 30
                    ? "bg-primary-300"
                    : "bg-primary-900",
              )}
            />
            <span className="text-[10px] font-bold tracking-wider text-neutral-50">
              <span className="tabular">{localScore}</span>
              <span className="ml-0.5 opacity-60">/100</span>
            </span>
          </div>
        </div>

        {/* Below image (Airbnb-style text on page bg) ---------------------- */}
        <div className="flex flex-col gap-0.5 px-0.5">
          {/* Line 1: author + rating */}
          <div className="flex items-center justify-between gap-2">
            {!hideAuthor ? (
              <p className="min-w-0 truncate text-[13px] font-medium text-foreground">
                {author.name}
                {typeof author.residencyYears === "number" ? (
                  <span className="ml-1.5 text-foreground/50">
                    ・{author.residencyYears}年目
                  </span>
                ) : null}
              </p>
            ) : (
              <span aria-hidden />
            )}
            {typeof reviewCount === "number" && reviewCount > 0 ? (
              <div className="flex shrink-0 items-center gap-1 text-[13px] text-foreground">
                <Star className="size-3.5 fill-current text-primary-500" aria-hidden />
                <span className="tabular font-medium">
                  {satisfactionStars.toFixed(1)}
                </span>
                <span className="tabular text-foreground/50">({reviewCount})</span>
              </div>
            ) : null}
          </div>

          {/* Line 2: title (the article headline) */}
          <h3
            className={cn(
              "line-clamp-2 text-[15px] font-semibold leading-snug text-foreground/95",
            )}
            style={{
              fontFamily: "var(--font-serif-jp), var(--font-serif), serif",
            }}
          >
            {title}
          </h3>

          {/* Line 3: duration / spots */}
          {(durationLabel || typeof spotsCount === "number") && (
            <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-foreground/55">
              {durationLabel ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" aria-hidden />
                  <span>{durationLabel}</span>
                </span>
              ) : null}
              {typeof spotsCount === "number" ? (
                <>
                  {durationLabel ? <span aria-hidden>·</span> : null}
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" aria-hidden />
                    <span>
                      <span className="tabular">{spotsCount}</span> 箇所
                    </span>
                  </span>
                </>
              ) : null}
            </div>
          )}

          {/* Line 4: price + add to trip */}
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[15px] font-semibold text-foreground">
              <span className="tabular">¥{priceJpy.toLocaleString("ja-JP")}</span>
              <span className="ml-1 text-[12px] font-normal text-foreground/50">
                / 1記事
              </span>
            </p>
            {onAddToTrip ? (
              <button
                type="button"
                onClick={handleAddToTrip}
                aria-label="旅程に追加"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5",
                  "bg-muted text-[12px] font-medium text-foreground",
                  "ring-1 ring-border transition-colors duration-fast ease-out",
                  "hover:bg-card hover:ring-border-strong",
                )}
              >
                + 旅程
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  },
);
ArticleCard.displayName = "ArticleCard";
