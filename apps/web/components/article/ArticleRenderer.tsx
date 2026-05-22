import Link from 'next/link';
import Image from 'next/image';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  CreatorBadge,
  LocalScoreBar,
  ResidencyBadge,
  SatisfactionStars,
} from '@locore/ui';
import { ChevronRight } from '@locore/ui/icons';
import { Paywall } from '../Paywall';
import { ItineraryTimeline } from '../ItineraryTimeline';
import { PhotoJournalView } from '../PhotoJournalView';
import { SpotsCardList } from '../SpotsCardList';
import { ArticleSpotsMap } from '../ArticleSpotsMap';
import { ArticleHero } from './ArticleHero';
import { ReviewFormToggle } from './ReviewFormToggle';
import { ItineraryDirectionsButton } from './ItineraryDirectionsButton';
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

      {/* 雑誌風ヒーロー (パンくず + フルブリードカバー + 大きいタイトル + 署名 + メタ帯) */}
      <ArticleHero
        article={article}
        writer={writer}
        region={region}
        country={country}
        displayAreaLabel={displayAreaLabel}
        viewerLoggedIn={viewerLoggedIn}
        alreadySavedByMe={alreadySavedByMe}
        bookmarkCount={bookmarkCount}
        likeCount={likeCount}
        initialLiked={initialLiked}
        previewMode={previewMode}
      />

      {/* Body preview + paywall。PC でも 1 カラムにし、680px の読みやすい行幅で本文を見せる。
          関連記事サイドカラムは廃止し、本文の下のフッター手前にグリッドで表示する。*/}
      <section className="mx-auto mt-10 max-w-[680px] px-4 pb-20 sm:mt-14 sm:px-6">
        <div className="space-y-10">
          {/*
            2026-05 改修: 本文は TipTap が生成した HTML をそのまま `articles.body` に
            保存している。renderArticleBodyHtml が HTML / 旧 Markdown を判定し、
            sanitize 済み HTML を返す。dangerouslySetInnerHTML で展開することで、
            見出し / コールアウト / コードブロック / テーブル / タスクリスト等の
            TipTap 由来ブロックがそのまま表示される。

            2026-05 雑誌風改修: prose-locore に `prose-locore--editorial` を追加。
            第 1 段落に Drop cap、リード (lede) として大きめサイズ、段落間余白広め、
            blockquote をプルクオート風、本文中の <img> を疑似フルブリードに広げる。
           */}
          <article
            className="prose-locore prose-locore--editorial"
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
              photoEntries={article.photoEntries ?? null}
              fallbackCoverImageUrl={article.coverImageUrl}
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
                    枚は購入後
                  </p>
                </div>
              </section>
            )
          ) : null}

          {unlocked ? (
            <>
              {/* 有料パートの本文。bodyPaid が空の無料記事のときは何も出さない */}
              {hasPaid && after.trim().length > 0 ? (
                <article className="prose-locore prose-locore--editorial prose-locore--continuation">
                  {/* 章区切り (◆): 無料パート→有料パートの切り替わりを雑誌風の節記号で示す */}
                  <div
                    aria-hidden
                    className="my-10 flex items-center justify-center text-[18px] tracking-[0.6em] text-foreground/30"
                  >
                    ◆ ◆ ◆
                  </div>
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
            <div className="space-y-3">
              {/* 旅程記事のときだけ、地図の上に「Google マップでルートを開く」ボタン。
                  各スポットを Place ID 優先で waypoints として渡し、Google Maps 側で
                  そのまま経路案内が出るようにする。 */}
              {article.articleType === 'itinerary' &&
              article.itineraryBlocks &&
              article.itineraryBlocks.length > 0 ? (
                <ItineraryDirectionsButton
                  blocks={article.itineraryBlocks}
                  spots={spots}
                />
              ) : null}
              <ArticleSpotsMap
                spots={spots}
                articleType={article.articleType}
                itineraryBlocks={article.itineraryBlocks ?? null}
                photoEntries={article.photoEntries ?? null}
                unlocked={unlocked}
              />
            </div>
          ) : (
            <section className="rounded-md bg-primary-500/10 p-6 text-center text-[12px] text-primary-300 ring-1 ring-border">
              <p className="font-semibold">地図は購入後</p>
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
              関連
            </h3>
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
      ) : null}
    </main>
  );
}
