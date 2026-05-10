"use client";

import * as React from "react";
import { Bookmark, Clock, Heart, MapPin } from "lucide-react";
import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarImage, getInitials } from "../primitives/Avatar";
import { Button } from "../primitives/Button";
import { LocalScoreBar } from "./LocalScoreBar";
import { PriceTag } from "./PriceTag";
import { ResidencyBadge, type ResidencyTier } from "./ResidencyBadge";
import { SatisfactionStars } from "./SatisfactionStars";

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
  /** 居住している街の表示名（例: "パリ"）。エリアピルとは別の意味。 */
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
  /** Add-to-trip button label. Defaults to `+ 旅程に追加`. */
  addToTripLabel?: string;
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
 * ArticleCard — feed card for an article. DESIGN.md §3.2.
 * Cover aspect ratio is 3:2 (NOT 16:9), per DESIGN.md §1.3 「映え禁止」 rationale.
 */
export const ArticleCard = React.forwardRef<HTMLElement, ArticleCardProps>(
  (
    {
      article,
      onClick,
      onAddToTrip,
      onBookmark,
      bookmarked = false,
      addToTripLabel = "旅程に追加",
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
      likeCount,
      bookmarkCount,
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
          "group flex flex-col overflow-hidden rounded-2xl bg-white",
          "shadow-sm ring-1 ring-primary-100 transition-all duration-base ease-out",
          "hover:-translate-y-1 hover:shadow-md hover:ring-primary-300 focus-within:shadow-md",
          onClick && "cursor-pointer",
          className,
        )}
        {...rest}
      >
        {/* Cover (3:2) ----------------------------------------------------- */}
        <div className="relative aspect-cover w-full overflow-hidden bg-neutral-100">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImageUrl}
              alt=""
              loading="lazy"
              className={cn(
                "h-full w-full object-cover",
                "transition-transform duration-slow ease-out",
                onClick && "group-hover:scale-[1.02]",
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300">
              <span className="text-overline uppercase">No Cover</span>
            </div>
          )}

          {area || articleType ? (
            <div className="absolute left-3 top-3 flex items-center gap-1.5">
              {area ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    "rounded-full bg-white/95 px-2.5 py-1 backdrop-blur",
                    "text-[10px] font-bold uppercase tracking-wider text-primary-700",
                    "shadow-sm",
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
                    "inline-flex items-center",
                    "rounded-full px-2.5 py-1",
                    "text-[10px] font-bold uppercase tracking-wider shadow-sm",
                    articleType === "itinerary"
                      ? "bg-primary-700 text-white"
                      : "bg-white/95 text-primary-700 backdrop-blur",
                  )}
                >
                  {ARTICLE_TYPE_LABEL[articleType]}
                </span>
              ) : null}
            </div>
          ) : null}

          {onBookmark ? (
            <button
              type="button"
              onClick={handleBookmark}
              aria-label={bookmarked ? "ブックマークを外す" : "ブックマークに追加"}
              aria-pressed={bookmarked}
              className={cn(
                "absolute right-3 top-3 inline-flex size-8 items-center justify-center",
                "rounded-full bg-neutral-0/80 backdrop-blur-sm",
                "text-neutral-900 hover:bg-neutral-0",
                "transition-colors duration-fast ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <Bookmark
                className="size-4"
                fill={bookmarked ? "currentColor" : "none"}
                aria-hidden
              />
            </button>
          ) : null}
        </div>

        {/* Body ------------------------------------------------------------- */}
        <div className="flex flex-col gap-3 p-4">
          <h3
            className={cn(
              "font-serif text-heading-md text-neutral-900",
              "line-clamp-2",
            )}
          >
            {title}
          </h3>

          {!hideAuthor && (
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                {author.avatarUrl ? (
                  <AvatarImage src={author.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback>{getInitials(author.name)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-body-sm text-neutral-700">
                  {author.name}
                </span>
                <ResidencyBadge
                  tier={author.tier}
                  years={author.residencyYears}
                  iconOnly
                />
                {typeof author.residencyYears === "number" ? (
                  <span className="whitespace-nowrap text-caption text-neutral-500">
                    · 居住{author.residencyYears}年
                  </span>
                ) : null}
              </div>
            </div>
          )}

          <LocalScoreBar value={localScore} size="md" />

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-neutral-500">
            <SatisfactionStars
              rating={satisfactionStars}
              count={reviewCount}
              size="sm"
              showStars={false}
            />
            {durationLabel ? (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>·</span>
                <Clock className="size-3" aria-hidden />
                <span>{durationLabel}</span>
              </span>
            ) : null}
            {typeof spotsCount === "number" ? (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>·</span>
                <MapPin className="size-3" aria-hidden />
                <span>{spotsCount}箇所</span>
              </span>
            ) : null}
            {typeof likeCount === "number" ? (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>·</span>
                <Heart className="size-3" aria-hidden />
                <span className="tabular">{likeCount.toLocaleString("ja-JP")}</span>
              </span>
            ) : null}
            {typeof bookmarkCount === "number" ? (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>·</span>
                <Bookmark className="size-3" aria-hidden />
                <span className="tabular">{bookmarkCount.toLocaleString("ja-JP")}</span>
              </span>
            ) : null}
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
            <PriceTag amount={priceJpy} size="md" />
            {onAddToTrip ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddToTrip}
                aria-label={addToTripLabel}
              >
                + {addToTripLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </article>
    );
  },
);
ArticleCard.displayName = "ArticleCard";
