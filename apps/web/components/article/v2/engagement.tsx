'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  CreatorBadge,
  LocalTierBadge,
  ResidencyBadge,
  SatisfactionStars,
} from '@locore/ui';
import { ChevronRight } from '@locore/ui/icons';
import { ServiceCard } from '../../services/ServiceCard';
import { LikeButton } from '../LikeButton';
import { AddToTripButton } from '../../AddToTripButton';
import type { Article, Writer, Spot, Review } from '@/lib/mock';
import type { FolderSummary } from '@/lib/spotFavorites/actions';
import type { getMyReviewForArticle } from '@/lib/reviews/actions';
import type { FeaturedService } from '@/lib/services/featured';
import type { ArticleVideoRow } from './classify';
import { toVideoEmbedSrc } from './classify';

/**
 * エンゲージメント層（共通の機能つき部品）。
 *
 * v2 の各タイプ別レイアウト（モデルコース / 場所あり / 場所なし）が、新スタイル本文の
 * 適切な位置に埋め込んで使う共通部品を提供する。本文描画そのものは各レイアウトが
 * Phase A の新デザインで自前に行い、ここでは横断的な「機能つき部品」だけを担う:
 *   - HeroActions（いいね / 保存。ヒーロー内に差す）
 *   - PreviewBanner（駐在員プレビュー帯）
 *   - AuthorCard（著者カード ＋ 著者サービス）
 *   - ReviewsList（レビュー一覧）
 *   - RelatedArticles（関連記事）
 *   - EssayVideos（essay の article_videos を 16:9 で描画）
 *   - SpotTipBox（スポットの「コツ」ライム破線ボックス・Phase C-2）
 *
 * 課金（Paywall）・スポット保存（SpotFavoriteButton）・地図（ArticleSpotsMap）・
 * レビュー投稿（ReviewFormToggle）は、各レイアウト側が新スタイルのゲート分岐の中で
 * 直接 import して配置する（unlocked で paid を漏らさないゲート意味論を維持するため）。
 */

export type MyReview = Awaited<ReturnType<typeof getMyReviewForArticle>>;

export type EngagementProps = {
  article: Article;
  writer: Writer | null;
  spots: Spot[];
  reviews: Review[];
  related: Article[];
  unlocked: boolean;
  purchasedOrOwner: boolean;
  isOwner: boolean;
  viewerLoggedIn: boolean;
  alreadySavedByMe: boolean;
  bookmarkCount: number;
  likeCount: number;
  initialLiked: boolean;
  folders: FolderSummary[];
  bookmarkedSpotIds: Set<string>;
  myReview: MyReview;
  previewMode: boolean;
  authorServices: FeaturedService[];
  videos: ArticleVideoRow[];
};

/* ===================== ヒーロー内アクション ===================== */

/**
 * いいね / 保存ボタン。v2 ヒーローの著者ブロック付近に差す。
 * previewMode では出さない（旧仕様踏襲）。
 */
export function HeroActions({
  article,
  viewerLoggedIn,
  alreadySavedByMe,
  bookmarkCount,
  likeCount,
  initialLiked,
  previewMode,
}: EngagementProps) {
  if (previewMode) return null;
  return (
    <div className="v2-hero-actions">
      <LikeButton
        articleId={article.id}
        initialLiked={initialLiked}
        initialCount={likeCount}
        viewerLoggedIn={viewerLoggedIn}
      />
      <AddToTripButton
        articleId={article.id}
        size="sm"
        compact
        initialSaved={alreadySavedByMe}
        initialCount={bookmarkCount}
      />
    </div>
  );
}

/* ===================== プレビュー帯 ===================== */

export function PreviewBanner({
  article,
  previewMode,
}: {
  article: Article;
  previewMode: boolean;
}) {
  if (!previewMode) return null;
  return (
    <div className="mx-auto max-w-screen-lg px-4 pt-4 sm:px-6">
      <div className="rounded-md border border-warning-500 bg-warning-50 px-4 py-3 text-warning-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] font-bold">
            <span className="mr-2 rounded-full bg-warning-500/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em]">
              プレビュー
            </span>
            この画面は駐在員専用の公開前プレビューです
          </p>
          <Link
            href={`/writer/articles/${article.id}/edit`}
            className="text-[12px] text-warning-700 underline-offset-4 hover:underline"
          >
            編集に戻る →
          </Link>
        </div>
        <p className="mt-1 text-[12px]">
          有料パートとロック解除後のレイアウトもまとめて表示しています。
          読者のいいね・購入導線はこのプレビューでは無効化されています。
        </p>
      </div>
    </div>
  );
}

/* ===================== スポットの「コツ」ボックス（Phase C-2）===================== */

/**
 * スポットの「コツ」を、本文中の callout (tip) と揃えたライムの破線ボックスで表示する。
 * 仕様 §3「tip = place 内のミニ callout」/ §2「コツ・注意ボックス（ライム破線）」に準拠。
 * 各タイプの新スタイル本文（場所カード / 旅程 stop）から共通で使う。
 */
export function SpotTipBox({ tip }: { tip: string }) {
  return (
    <div
      className="rounded-md border border-dashed px-3 py-2"
      style={{ borderColor: '#A8E01C', background: '#F3FBE0' }}
    >
      <p className="mb-0.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#5E8B0E]">
        <span aria-hidden>✨</span>
        コツ
      </p>
      <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#2a2a28]">
        {tip}
      </p>
    </div>
  );
}

/* ===================== 著者カード ===================== */

export function AuthorCard({
  writer,
  authorServices,
}: {
  writer: Writer | null;
  authorServices: FeaturedService[];
}) {
  if (!writer) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
        この記事を書いた人
      </p>
      <div className="mt-3 flex items-start gap-4">
        <Link
          href={`/users/${writer.id}`}
          className="shrink-0"
          aria-label={`${writer.name} のプロフィールへ`}
        >
          <Avatar size="lg">
            <AvatarImage src={writer.avatarUrl} alt={writer.name} />
            <AvatarFallback>{writer.name[0]}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/users/${writer.id}`}
              className="text-[17px] font-semibold leading-tight hover:text-primary-300"
            >
              {writer.name}
            </Link>
            <ResidencyBadge tier={writer.tier} years={writer.residencyYears} />
            {writer.isVerifiedCreator ? <CreatorBadge type="verified" /> : null}
            {writer.isFounding ? <CreatorBadge type="founding" /> : null}
          </div>
          <p className="mt-1 text-[12px] text-foreground/55 tabular">
            {writer.city} ・ 在住 {writer.residencyYears} 年 ・{' '}
            {writer.followerCount.toLocaleString('ja-JP')} followers
          </p>
          {writer.bio ? (
            <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-foreground/80">
              {writer.bio}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button asChild variant="primary" size="sm">
              <Link href={`/users/${writer.id}`}>プロフィールを見る</Link>
            </Button>
            <Link
              href={`/users/${writer.id}?tab=articles`}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary-300 hover:underline"
            >
              この駐在員の他の記事
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {authorServices.length > 0 ? (
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
              この駐在員の他のサービス
            </p>
            <Link
              href={`/users/${writer.id}?tab=services`}
              className="text-[11px] font-semibold text-primary-300 hover:underline"
            >
              すべて見る →
            </Link>
          </div>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {authorServices.map((s) => (
              <li key={s.id}>
                <ServiceCard service={s} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/* ===================== レビュー一覧 ===================== */

export function ReviewsList({ reviews }: { reviews: Review[] }) {
  return (
    <section>
      <h3 className="mb-4 text-[18px] font-semibold tracking-tight">
        レビュー
        <span className="ml-2 text-[12px] font-normal text-foreground/50 tabular">
          {reviews.length}
        </span>
      </h3>
      <div className="space-y-4">
        {reviews.slice(0, 6).map((r) => (
          <article
            key={r.id}
            className="rounded-md border border-border bg-card p-4 text-[14px]"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{r.authorName}</p>
              <p className="text-[11px] text-foreground/40 tabular">
                訪問 {new Date(r.visitedAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LocalTierBadge score={r.localScore} size="sm" />
              <SatisfactionStars rating={r.satisfaction} size="sm" showStars />
            </div>
            <p className="mt-3 leading-relaxed text-foreground/80">{r.body}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {r.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground/60"
                >
                  {t}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ===================== 関連記事 ===================== */

export function RelatedArticles({ related }: { related: Article[] }) {
  if (related.length === 0) return null;
  return (
    <section className="mx-auto max-w-screen-xl px-4 pb-20 sm:px-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-[20px] font-semibold tracking-tight">関連</h3>
        <Link
          href="/articles"
          aria-label="すべての記事を見る"
          className="text-[12px] font-semibold text-primary-300 hover:underline"
        >
          →
        </Link>
      </div>
      <ul
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: 'pan-x' }}
      >
        {related.map((a) => (
          <li key={a.id} className="snap-start">
            <Link
              href={`/articles/${a.id}`}
              className="group flex w-[170px] flex-col overflow-hidden rounded-md border border-border bg-card transition hover:bg-muted"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                <Image
                  src={a.coverImageUrl}
                  alt={a.title}
                  fill
                  sizes="170px"
                  className="object-cover transition group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-2.5">
                <p className="line-clamp-2 text-[12px] font-medium leading-snug">
                  {a.title}
                </p>
                <p className="mt-auto truncate text-[10px] text-foreground/50 tabular">
                  {a.writerName ? `${a.writerName} ・ ` : ''}¥
                  {a.priceJpy.toLocaleString('ja-JP')}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * essay 用：article_videos を 16:9 で描画（埋め込み不可は外部リンク）。
 * 解放状態に関わらず動画自体は表示（旧 essay モック踏襲）。
 */
export function EssayVideos({ videos }: { videos: ArticleVideoRow[] }) {
  if (videos.length === 0) return null;
  return (
    <>
      {videos.map((v) => {
        const src = toVideoEmbedSrc(v.embedUrl);
        if (src) {
          return (
            <div key={v.id} className="es-video es-rev">
              <div className="es-vframe">
                <span className="es-vbadge">VIDEO</span>
                <iframe
                  title="動画"
                  src={src}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
          );
        }
        return (
          <div key={v.id} className="es-vlink es-rev">
            <a href={v.embedUrl} target="_blank" rel="noopener noreferrer">
              ▶ 動画を開く（{v.platform}）
            </a>
          </div>
        );
      })}
    </>
  );
}
