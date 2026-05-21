import Link from 'next/link';
import Image from 'next/image';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  CreatorBadge,
  LocalScoreBar,
  ResidencyBadge,
  SatisfactionStars,
} from '@locore/ui';
import { ChevronRight, Clock, MapPin, Star } from '@locore/ui/icons';
import { Paywall } from '../Paywall';
import { AddToTripButton } from '../AddToTripButton';
import { ItineraryTimeline } from '../ItineraryTimeline';
import { PhotoJournalView } from '../PhotoJournalView';
import { SpotsCardList } from '../SpotsCardList';
import { ArticleSpotsMap } from '../ArticleSpotsMap';
import { LikeButton } from './LikeButton';
import { ReviewFormToggle } from './ReviewFormToggle';
import { renderArticleBodyHtml } from '@/lib/markdown/render';
import type { Article, Writer, Spot, Review } from '@/lib/mock';
import type {
  ArticleBundleRegion,
  ArticleBundleCountry,
} from '@/lib/articles/published';
import type { FolderSummary } from '@/lib/spotFavorites/actions';
import type { getMyReviewForArticle } from '@/lib/reviews/actions';

type MyReview = Awaited<ReturnType<typeof getMyReviewForArticle>>;

/**
 * 記事の本体レンダリング。本番 `/articles/[id]` ページとライター用
 * `/writer/articles/[id]/preview` ページで共通利用する。
 *
 * `previewMode=true` のときは:
 *   - 有料パートを強制解除 (Paywall は表示しない)
 *   - 上部に「これはプレビューです」バッジを表示
 *   - LikeButton / AddToTripButton / ReviewForm を非表示にする
 *     (まだ公開されていない記事に対しては購入/レビューを発火させない)
 *
 * 既存 articles/[id]/page.tsx の見た目を変えないため、JSX は元のまま移植する。
 */

type ArticleRendererProps = {
  article: Article;
  writer: Writer | null;
  spots: Spot[];
  reviews: Review[];
  related: Article[];
  region: ArticleBundleRegion | null;
  country: ArticleBundleCountry | null;
  /** Paywall 解除フラグ（購入済み / オーナー / 無料記事 / プレビュー） */
  unlocked: boolean;
  /** Paywall.alreadyPurchased に渡す */
  purchasedOrOwner: boolean;
  /** オーナー / editor か。ReviewForm の出し分けに使う */
  isOwner: boolean;
  /** ログイン状態（Paywall / LikeButton の挙動） */
  viewerLoggedIn: boolean;
  /** AddToTripButton 初期状態 */
  alreadySavedByMe: boolean;
  bookmarkCount: number;
  likeCount: number;
  initialLiked: boolean;
  /** SpotsCardList 用 */
  folders: FolderSummary[];
  bookmarkedSpotIds: Set<string>;
  /** 自分の既存レビュー（編集用） */
  myReview: MyReview;
  /** プレビューモード（ライター向け公開前確認画面） */
  previewMode?: boolean;
};

export function ArticleRenderer({
  article,
  writer,
  spots,
  reviews,
  related,
  region,
  country,
  unlocked,
  purchasedOrOwner,
  isOwner,
  viewerLoggedIn,
  alreadySavedByMe,
  bookmarkCount,
  likeCount,
  initialLiked,
  folders,
  bookmarkedSpotIds,
  myReview,
  previewMode = false,
}: ArticleRendererProps) {
  const displayAreaLabel: string = region?.nameJa ?? article.area ?? '';

  // 本文の分割（記事詳細ページと同じロジック）
  const hasPaid = !!article.bodyPaid && article.bodyPaid.trim().length > 0;
  const preview: string = article.body;
  const after: string = hasPaid ? article.bodyPaid! : '';

  return (
    <main className="bg-background">
      {previewMode ? (
        <div className="mx-auto max-w-screen-lg px-4 pt-4 sm:px-6">
          <div className="rounded-md border border-warning-500 bg-warning-50 px-4 py-3 text-warning-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] font-bold">
                <span className="mr-2 rounded-full bg-warning-500/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em]">
                  プレビュー
                </span>
                この画面はライター専用の公開前プレビューです
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
      ) : null}

      {/* Breadcrumbs */}
      <div className="border-b border-border">
        <nav
          aria-label="パンくず"
          className="mx-auto flex max-w-screen-lg items-center gap-1 px-4 py-3 text-[12px] text-foreground/60 sm:px-6"
        >
          <Link href="/" className="transition hover:text-foreground">
            世界
          </Link>
          {country?.nameJa ? (
            <>
              <ChevronRight className="h-3 w-3 text-foreground/30" />
              {country.code ? (
                <Link
                  href={`/country/${country.code}`}
                  className="transition hover:text-foreground"
                >
                  {country.nameJa}
                </Link>
              ) : (
                <span>{country.nameJa}</span>
              )}
            </>
          ) : null}
          {region?.nameJa ? (
            <>
              <ChevronRight className="h-3 w-3 text-foreground/30" />
              {region.slug ? (
                <Link
                  href={`/region/${region.slug}`}
                  className="transition hover:text-foreground"
                >
                  {region.nameJa}
                </Link>
              ) : (
                <span>{region.nameJa}</span>
              )}
            </>
          ) : null}
          <ChevronRight className="h-3 w-3 text-foreground/30" />
          <span className="line-clamp-1 max-w-[40ch] text-foreground">
            {article.title}
          </span>
        </nav>
      </div>

      {/* Cover */}
      <div className="mx-auto max-w-screen-lg px-4 pt-6 sm:px-6">
        <div className="relative aspect-cover overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
          {article.coverImageUrl ? (
            <Image
              src={article.coverImageUrl}
              alt={article.title}
              fill
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[12px] text-foreground/40">
              カバー画像未設定
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="mx-auto max-w-screen-lg px-4 pt-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={article.articleType === 'itinerary' ? 'accent' : 'default'}
            data-locore-article-type={article.articleType}
          >
            {article.articleType === 'itinerary' ? '旅程プラン' : 'スポット紹介'}
          </Badge>
          <Badge variant="outline">{displayAreaLabel}</Badge>
          {article.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
          <Badge variant="default">{article.durationType}</Badge>
        </div>
        <h1
          className="mt-4 text-[32px] font-semibold leading-[1.2] tracking-tight sm:text-[42px]"
        >
          {article.title}
        </h1>

        {/* 1 行コンパクトメタ。本文への到達距離を最短にするのが目的なので、
            ヘッダーには「著者の顔 + 評価ピル + 所要時間 + いいね/保存」だけを並べる。
            著者の詳細プロフィール (bio / 在住年数 / フォロワー数) は本文後の
            「この記事を書いた人」セクションにまとめる。 */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-foreground/65">
          {writer ? (
            <Link
              href={`/residents/${writer.id}`}
              className="group inline-flex items-center gap-1.5 rounded-full px-1 py-0.5 -ml-1 transition hover:bg-muted"
            >
              <Avatar size="sm">
                <AvatarImage src={writer.avatarUrl} alt={writer.name} />
                <AvatarFallback>{writer.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-[13px] font-semibold text-foreground group-hover:text-primary-300">
                {writer.name}
              </span>
            </Link>
          ) : null}
          <span
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/75 tabular"
            aria-label={`ローカル度 ${Math.round(article.localScoreAverage)}`}
          >
            <MapPin className="h-3 w-3 text-primary-300" />
            ローカル {Math.round(article.localScoreAverage)}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/75 tabular"
            aria-label={`満足度 ${article.satisfactionAverage.toFixed(1)} 件数 ${article.reviewCount}`}
          >
            <Star className="h-3 w-3 fill-warning-500 text-warning-500" />
            {article.satisfactionAverage.toFixed(1)}
            <span className="text-foreground/50">({article.reviewCount})</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/75">
            <Clock className="h-3 w-3" />
            {article.durationType}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/75">
            {displayAreaLabel} ・ {article.spotIds.length} スポット
          </span>

          {/* 読者向け CTA。プレビューモードでは描画しない。
              他のメタピルと同じ高さの小型ボタン (h-7) で行内に置く。 */}
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
      </header>

      {/* Body preview + paywall。PC でも 1 カラムにし、本文をフル幅で見せる。
          関連記事サイドカラムは廃止し、本文の下のフッター手前にグリッドで表示する。*/}
      <section className="mx-auto mt-10 max-w-3xl px-4 pb-20 sm:px-6">
        <div className="space-y-8">
          {/*
            2026-05 改修: 本文は TipTap が生成した HTML をそのまま `articles.body` に
            保存している。renderArticleBodyHtml が HTML / 旧 Markdown を判定し、
            sanitize 済み HTML を返す。dangerouslySetInnerHTML で展開することで、
            見出し / コールアウト / コードブロック / テーブル / タスクリスト等の
            TipTap 由来ブロックがそのまま表示される。
           */}
          <article
            className="prose-locore"
            dangerouslySetInnerHTML={{ __html: renderArticleBodyHtml(preview) }}
          />

          {/* 旅程プラン記事のときだけ構造化タイムラインを差し込む */}
          {article.articleType === 'itinerary' &&
          article.itineraryBlocks &&
          article.itineraryBlocks.length > 0 ? (
            <ItineraryTimeline
              articleId={article.id}
              blocks={article.itineraryBlocks}
              spots={spots}
              defaultUnlocked={unlocked}
            />
          ) : null}

          {/* フォト日記スタイルのときだけ縦スクロール没入ビュー（購入後のみ全部見せる） */}
          {article.bodyStyle === 'photo_journal' &&
          article.photoEntries &&
          article.photoEntries.length > 0 ? (
            unlocked ? (
              <PhotoJournalView
                entries={article.photoEntries}
                title={article.title}
              />
            ) : (
              <section className="relative overflow-hidden rounded-2xl bg-neutral-950 text-white">
                <div className="aspect-[4/5] w-full sm:aspect-[3/4]">
                  {article.photoEntries[0] ? (
                    // 最初の 1 枚だけプレビュー
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.photoEntries[0].imageUrl}
                      alt=""
                      className="h-full w-full object-cover opacity-60"
                    />
                  ) : null}
                </div>
                <div className="px-6 py-6 text-center">
                  <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-primary-300">
                    フォト日記
                  </p>
                  <p className="mt-2 text-[16px] font-bold leading-snug">
                    残り{' '}
                    <span className="tabular">
                      {article.photoEntries.length - 1}
                    </span>{' '}
                    枚 + キャプションは購入後に
                  </p>
                  <p className="mt-1 text-[12px] text-white/60">
                    縦スクロールで 1 枚ずつ全画面表示されます
                  </p>
                </div>
              </section>
            )
          ) : null}

          {unlocked ? (
            <>
              {/* 有料パートの本文。bodyPaid が空の無料記事のときは何も出さない */}
              {hasPaid && after.trim().length > 0 ? (
                <article className="prose-locore">
                  {previewMode ? (
                    <div className="mb-3 inline-flex rounded-full bg-primary-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
                      有料パート（プレビュー解除中）
                    </div>
                  ) : null}
                  {/* 2026-05 改修: 有料パートも HTML / Markdown 両対応で sanitize render */}
                  <div
                    dangerouslySetInnerHTML={{ __html: renderArticleBodyHtml(after) }}
                  />
                </article>
              ) : null}
              <SpotsCardList
                spots={spots}
                folders={folders}
                bookmarkedSpotIds={bookmarkedSpotIds}
                viewerLoggedIn={viewerLoggedIn}
              />
            </>
          ) : (
            <Paywall
              article={article}
              bodyAfter={after}
              spots={spots}
              folders={folders}
              bookmarkedSpotIds={bookmarkedSpotIds}
              viewerLoggedIn={viewerLoggedIn}
              alreadyPurchased={purchasedOrOwner}
            />
          )}

          {/* スポット地図（旅程記事はルート線、スポット紹介はピンのみ）。
              有料記事は購入後 / オーナー時のみ表示。 */}
          {unlocked ? (
            <ArticleSpotsMap
              spots={spots}
              articleType={article.articleType}
              itineraryBlocks={article.itineraryBlocks ?? null}
            />
          ) : (
            <section className="rounded-md bg-primary-500/10 p-6 text-center text-[12px] text-primary-300 ring-1 ring-border">
              <p className="font-semibold">スポット地図は購入後に解放されます</p>
              <p className="mt-1 text-foreground/60">
                {article.articleType === 'itinerary'
                  ? '実際に辿るルートと所要時間を地図上で確認できます'
                  : 'すべてのスポットの位置をまとめて確認できます'}
              </p>
            </section>
          )}

          {/* レビュー投稿フォーム（購入済み読者にのみ表示。プレビューでは出さない）。
              いきなり大きなフォームを出さず、ボタン押下で展開する。 */}
          {!previewMode && unlocked && !isOwner ? (
            <ReviewFormToggle articleId={article.id} initial={myReview} />
          ) : null}

          {/* この記事を書いた人。ヘッダー直下を軽くしたぶん、本文を読み終えた後に
              じっくり著者プロフィールを見せる。bio / 在住年数 / フォロワー数 /
              プロフィールへのリンクをまとめて出す。 */}
          {writer ? (
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
                この記事を書いた人
              </p>
              <div className="mt-3 flex items-start gap-4">
                <Link
                  href={`/residents/${writer.id}`}
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
                      href={`/residents/${writer.id}`}
                      className="text-[17px] font-semibold leading-tight hover:text-primary-300"
                    >
                      {writer.name}
                    </Link>
                    <ResidencyBadge
                      tier={writer.tier}
                      years={writer.residencyYears}
                    />
                    {writer.isVerifiedCreator ? (
                      <CreatorBadge type="verified" />
                    ) : null}
                    {writer.isFounding ? (
                      <CreatorBadge type="founding" />
                    ) : null}
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
                      <Link href={`/residents/${writer.id}`}>フォローする</Link>
                    </Button>
                    <Link
                      href={`/residents/${writer.id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary-300 hover:underline"
                    >
                      この著者の他の記事
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Reviews */}
          <section>
            <h3
              className="mb-4 text-[18px] font-semibold tracking-tight"
            >
              読者レビュー（{reviews.length}件）
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
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1">
                      <LocalScoreBar
                        value={r.localScore}
                        size="sm"
                        showLabel={false}
                      />
                    </div>
                    <SatisfactionStars
                      rating={r.satisfaction}
                      size="sm"
                      showStars
                    />
                  </div>
                  <p className="mt-3 leading-relaxed text-foreground/80">
                    {r.body}
                  </p>
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
        </div>
      </section>

      {/* 関連記事 — グリッドではなく小型カードの横スクロールカルーセル。
          1 カード w-[170px] の固定幅 + aspect-[4/3] サムネ。snap-x snap-mandatory で
          スマホ指スワイプも PC のスクロールも気持ち良く止まる。 */}
      {related.length > 0 ? (
        <section className="mx-auto max-w-screen-xl px-4 pb-20 sm:px-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3
              className="text-[20px] font-semibold tracking-tight"
            >
              関連記事
            </h3>
            <Link
              href="/articles"
              className="text-[12px] font-semibold text-primary-300 hover:underline"
            >
              すべての記事 →
            </Link>
          </div>
          <ul
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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
      ) : null}
    </main>
  );
}
