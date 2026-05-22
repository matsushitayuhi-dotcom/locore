import * as React from "react";
import { cn } from "../../lib/utils";
import { clamp } from "../../lib/utils";

/**
 * ローカル度をスコア (0-100) からティアバッジ (ブロンズ / シルバー / ゴールド)
 * に変換して見せる小さなピル。LocalScoreBar (数値 + プログレスバー) より
 * 直感的に「どのくらいローカル寄りの記事か」を示すための表記方法。
 *
 * ティア閾値:
 *   0-49   → ブロンズ (まだ観光地寄り / レビュー少)
 *   50-74  → シルバー (中堅、住人視点が入っている)
 *   75-100 → ゴールド (住人だけが知っている密度の高い情報)
 *
 * 用途:
 *   - 記事カード (ArticleCard) の左下にオーバーレイ
 *   - 記事ヘッダーのメタ帯
 *   - レビュー 1 件ごとのスコア表示
 */

export type LocalTier = "bronze" | "silver" | "gold";

export interface LocalTierBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** 0-100 のローカルスコア。範囲外はクランプ */
  score: number;
  /** サイズ。sm = カード用、md = 記事ヘッダー用 */
  size?: "sm" | "md";
  /** ティア名 (ブロンズ等) を表示するか。false ならアイコン + 余白だけ。default true */
  showLabel?: boolean;
  /** 暗背景 (写真の上に乗せる時用)。default false (白背景用) */
  onDark?: boolean;
}

export function tierFromScore(score: number): LocalTier {
  const c = clamp(Math.round(score), 0, 100);
  if (c >= 75) return "gold";
  if (c >= 50) return "silver";
  return "bronze";
}

export function tierLabel(tier: LocalTier): string {
  return tier === "gold" ? "ゴールド" : tier === "silver" ? "シルバー" : "ブロンズ";
}

const PALETTE_LIGHT: Record<
  LocalTier,
  { bg: string; text: string; dot: string }
> = {
  gold: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    dot: "bg-yellow-500",
  },
  silver: {
    bg: "bg-zinc-100",
    text: "text-zinc-700",
    dot: "bg-zinc-400",
  },
  bronze: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
};

const PALETTE_DARK: Record<
  LocalTier,
  { bg: string; text: string; dot: string }
> = {
  gold: {
    bg: "bg-yellow-400/25 backdrop-blur",
    text: "text-yellow-100",
    dot: "bg-yellow-300",
  },
  silver: {
    bg: "bg-white/20 backdrop-blur",
    text: "text-white",
    dot: "bg-zinc-200",
  },
  bronze: {
    bg: "bg-amber-500/25 backdrop-blur",
    text: "text-amber-100",
    dot: "bg-amber-300",
  },
};

export const LocalTierBadge = React.forwardRef<
  HTMLSpanElement,
  LocalTierBadgeProps
>(
  (
    { score, size = "sm", showLabel = true, onDark = false, className, ...rest },
    ref,
  ) => {
    const tier = tierFromScore(score);
    const palette = onDark ? PALETTE_DARK[tier] : PALETTE_LIGHT[tier];
    const label = tierLabel(tier);
    const sizeClass =
      size === "md"
        ? "px-2.5 py-0.5 text-[11px] gap-1.5"
        : "px-2 py-0.5 text-[10px] gap-1";
    const dotSize = size === "md" ? "size-1.5" : "size-1";

    return (
      <span
        ref={ref}
        data-locore-component="LocalTierBadge"
        data-tier={tier}
        aria-label={`ローカル ${label}`}
        title={`ローカル ${label} (${Math.round(score)})`}
        className={cn(
          "inline-flex items-center rounded-full font-bold tracking-wider",
          sizeClass,
          palette.bg,
          palette.text,
          className,
        )}
        {...rest}
      >
        <span
          aria-hidden
          className={cn("rounded-full", dotSize, palette.dot)}
        />
        {showLabel ? <span className="leading-none">{label}</span> : null}
      </span>
    );
  },
);
LocalTierBadge.displayName = "LocalTierBadge";
