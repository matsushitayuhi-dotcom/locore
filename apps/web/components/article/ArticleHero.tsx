import Link from 'next/link';
import Image from 'next/image';
import { Badge, LocalTierBadge } from '@locore/ui';
import { ChevronRight, Clock, Star } from '@locore/ui/icons';
import { LikeButton } from './LikeButton';
import { AddToTripButton } from '../AddToTripButton';
import type { Article, Writer } from '@/lib/mock';
import type {
  ArticleBundleRegion,
  ArticleBundleCountry,
} from '@/lib/articles/published';

type ArticleHeroProps = {
  article: Article;
  writer: Writer | null;
  region: ArticleBundleRegion | null;
  country: ArticleBundleCountry | null;
  displayAreaLabel: string;
  viewerLoggedIn: boolean;
  alreadySavedByMe: boolean;
  bookmarkCount: number;
  likeCount: number;
  initialLiked: boolean;
  previewMode: boolean;
};

/**
 * 記事のヒーロー部 (雑誌風)。
 *
 * 構成:
 *   1. パンくず (細く控えめ)
 *   2. フルブリードのカバー画像 + 画像下のセンター寄せキャプション風タイトル
 *      - カバー上は dark→透明グラデーションだけ重ね、可読性のためタイトルは画像下に置く
 *   3. 著者署名 (アバター + 名前 + 公開日) ── 1 行・小さく
 *   4. 横長メタピル帯 (ローカル度 / 満足度 / 所要 / スポット数 / Like・Save)
 *
 * 旧ヘッダーと比べてタイトルが画像と一体になり、本文を読み始めるまでの
 * 視覚距離を縮める。並びは「Conde Nast Traveler / NYT Magazine」の
 * リード文の手前までを意識した。
 */
export function ArticleHero({
  article,
  country,
  displayAreaLabel,
  viewerLoggedIn,
  alreadySavedByMe,
  bookmarkCount,
  likeCount,
  initialLiked,
  previewMode,
}: ArticleHeroProps) {
  // 国ハブ (/[slug]) への遷移用に code → スラッグを解決。当面フランスのみ。
  const countrySlug = country?.code === 'fr' ? 'france' : null;
  const publishedLabel = (() => {
    try {
      return new Date(article.publishedAt).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return article.publishedAt;
    }
  })();

  return (
    <>
      {/* Breadcrumbs — スマホでは非表示にしてヒーローを軽くする */}
      <div className="hidden border-b border-border/60 sm:block">
        <nav
          aria-label="パンくず"
          className="mx-auto flex max-w-screen-xl items-center gap-1 px-4 py-3 text-[11px] text-foreground/55 sm:px-6"
        >
          <Link href="/" className="transition hover:text-foreground">
            世界
          </Link>
          {country?.nameJa ? (
            <>
              <ChevronRight className="h-3 w-3 text-foreground/30" />
              {countrySlug ? (
                <Link
                  href={`/${countrySlug}`}
                  className="transition hover:text-foreground"
                >
                  {country.nameJa}
                </Link>
              ) : (
                <span>{country.nameJa}</span>
              )}
            </>
          ) : null}
          <ChevronRight className="h-3 w-3 text-foreground/30" />
          <span className="line-clamp-1 max-w-[40ch] text-foreground/80">
            {article.title}
          </span>
        </nav>
      </div>

      {/* Full-bleed cover (max-w-screen-2xl) */}
      <div className="mx-auto w-full max-w-screen-2xl">
        <div className="relative aspect-[2/1] w-full overflow-hidden bg-muted sm:aspect-[21/9]">
          {article.coverImageUrl ? (
            <Image
              src={article.coverImageUrl}
              alt={article.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[12px] text-foreground/40">
              カバー画像未設定
            </div>
          )}
          {/* 下端を本文との橋渡しに使う、控えめなグラデーション */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/40 to-transparent"
          />
        </div>
      </div>

      {/* タイトル群 (画像下に左揃え)。中央寄せをやめて、本文の読み始めと
          視線の起点を揃える。著者署名はここから撤去し、本文末尾の
          「この記事を書いた人」カードに集約する。 */}
      <header className="mx-auto max-w-3xl px-4 pt-6 text-left sm:px-6 sm:pt-12">
        {/* 上の小タグ: 種別 + エリア + 公開日。スマホでは撤去してタイトルを最短距離に */}
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary-300">
            {article.articleType === 'itinerary' ? '旅程プラン' : 'スポット紹介'}
          </span>
          <span className="text-foreground/30">·</span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-foreground/55">
            {displayAreaLabel}
          </span>
          <span className="text-foreground/30">·</span>
          <time
            dateTime={article.publishedAt}
            className="text-[11px] text-foreground/55 tabular"
          >
            {publishedLabel}
          </time>
        </div>

        <h1 className="article-hero-title text-[22px] font-bold leading-[1.2] tracking-tight text-foreground sm:mt-4 sm:text-[40px] sm:leading-[1.15] md:text-[52px]">
          {article.title}
        </h1>

        {/* スマホ向けの公開日 (kicker が hidden の代わり) */}
        <time
          dateTime={article.publishedAt}
          className="mt-3 block text-[11px] text-foreground/55 tabular sm:hidden"
        >
          {publishedLabel}
        </time>

        {/* タグ行 (左揃え、控えめ。スマホでは非表示にしてヘッダを軽くする) */}
        {article.tags.length > 0 ? (
          <div className="mt-4 hidden flex-wrap items-center gap-1.5 sm:flex">
            {article.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      {/* 横長メタ帯。スコアと CTA をまとめて、本文への入り口手前で 1 度だけ見せる。
          目立たせ過ぎないため bg なしの薄い border 区切り。 */}
      <div className="mx-auto mt-8 max-w-3xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-border/70 py-3 text-[11px] text-foreground/70">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <LocalTierBadge
              score={article.localScoreAverage}
              size="md"
            />
            <span className="text-foreground/20">·</span>
            <span
              className="inline-flex items-center gap-1.5 font-medium tabular"
              aria-label={`満足度 ${article.satisfactionAverage.toFixed(1)} 件数 ${article.reviewCount}`}
            >
              <Star className="h-3.5 w-3.5 fill-warning-500 text-warning-500" />
              {article.satisfactionAverage.toFixed(1)}
              <span className="text-foreground/45">({article.reviewCount})</span>
            </span>
            <span className="text-foreground/20">·</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5" />
              {article.durationType}
            </span>
            <span className="text-foreground/20">·</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              {article.spotIds.length} スポット
            </span>
          </div>

          {!previewMode ? (
            <span className="ml-auto inline-flex items-center gap-2">
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
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}
