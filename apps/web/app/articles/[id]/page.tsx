import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  CreatorBadge,
  LocalScoreBar,
  PriceTag,
  ResidencyBadge,
  SatisfactionStars,
} from '@locore/ui';
import { ChevronRight, MapPin, Clock, Users } from '@locore/ui/icons';
import { getDbArticleBundle } from '../../../lib/articles/published';
import { Paywall } from '../../../components/Paywall';
import { AddToTripButton } from '../../../components/AddToTripButton';
import { ArticleGrid } from '../../../components/ArticleGrid';
import { ItineraryTimeline } from '../../../components/ItineraryTimeline';
import { PhotoJournalView } from '../../../components/PhotoJournalView';
import { SpotsCardList } from '../../../components/SpotsCardList';
import { ArticleSpotsMap } from '../../../components/ArticleSpotsMap';
import { LikeButton } from '../../../components/article/LikeButton';
import {
  listMyFolders,
  listMyBookmarkedSpotIds,
} from '@/lib/spotFavorites/actions';
import {
  getArticleSocialCounts,
  listMyLikedArticleIds,
} from '@/lib/articleLikes/actions';
import { Bookmark } from '@locore/ui/icons';
import { getMyBookmarkedIdSet } from '@/lib/bookmarks/actions';
import { getMyReviewForArticle } from '@/lib/reviews/actions';
import { ReviewForm } from '@/components/ReviewForm';
import { getCurrentUser } from '@/lib/auth/current-user';
import { eq, and } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function ArticleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // DB ファースト：mock を経由せず直接 DB を引く
  const bundle = await getDbArticleBundle(params.id);
  if (!bundle) return notFound();
  const article = bundle.article;
  const writer = bundle.writer ?? undefined;
  const spots = bundle.spots;
  const reviews = bundle.reviews;
  const relatedDb = bundle.related;

  // 本文の分割：
  //   * bodyPaid が空 → 全文無料記事として扱い Paywall を出さない
  //   * bodyPaid が入っていれば → body=無料プレビュー / bodyPaid=有料部分
  const hasPaid = !!article.bodyPaid && article.bodyPaid.trim().length > 0;
  const preview: string = article.body;
  const after: string = hasPaid ? article.bodyPaid! : '';
  const isFreeArticle = !hasPaid;

  // 関連記事は DB から取得済み
  const related = relatedDb.slice(0, 6);

  // 旅程タイムラインの解放判定：DB の purchases に該当行があれば true
  const me = await getCurrentUser();
  let purchasedFromDb = false;
  if (me) {
    try {
      const db = getDb();
      const rows = await db
        .select({ id: schema.purchases.id })
        .from(schema.purchases)
        .where(
          and(
            eq(schema.purchases.buyerId, me.id),
            eq(schema.purchases.articleId, article.id),
          ),
        )
        .limit(1);
      purchasedFromDb = rows.length > 0;
    } catch {
      purchasedFromDb = false;
    }
  }

  // 自分の記事は常に全解放（オーナー / editor）
  const isOwner = !!me && (me.id === article.writerId || me.role === 'editor');
  const unlocked = isFreeArticle || purchasedFromDb || isOwner;

  // お気に入りスポット + いいね / ブックマーク数 + 自分の既存レビュー を並列取得
  const [
    { folders },
    bookmarkedSpotIds,
    socialCounts,
    likedSet,
    bookmarkedArticleIds,
    myReview,
  ] = await Promise.all([
    listMyFolders(),
    listMyBookmarkedSpotIds(),
    getArticleSocialCounts([article.id]),
    listMyLikedArticleIds(),
    getMyBookmarkedIdSet(),
    getMyReviewForArticle(article.id),
  ]);
  const alreadySavedByMe = bookmarkedArticleIds.has(article.id);
  const viewerLoggedIn = !!me;
  const counts = socialCounts.get(article.id) ?? {
    likeCount: 0,
    bookmarkCount: 0,
  };
  const initialLiked = likedSet.has(article.id);

  return (
    <main className="bg-background">
      {/* Breadcrumbs */}
      <div className="border-b border-border">
        <nav
          aria-label="パンくず"
          className="mx-auto flex max-w-screen-lg items-center gap-1 px-4 py-3 text-[12px] text-foreground/60 sm:px-6"
        >
          <Link href="/" className="transition hover:text-foreground">
            ホーム
          </Link>
          <ChevronRight className="h-3 w-3 text-foreground/30" />
          <span>パリ</span>
          <ChevronRight className="h-3 w-3 text-foreground/30" />
          <span>{article.area}</span>
          <ChevronRight className="h-3 w-3 text-foreground/30" />
          <span className="line-clamp-1 max-w-[40ch] text-foreground">
            {article.title}
          </span>
        </nav>
      </div>

      {/* Cover */}
      <div className="mx-auto max-w-screen-lg px-4 pt-6 sm:px-6">
        <div className="relative aspect-cover overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            fill
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover"
          />
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
          <Badge variant="outline">{article.area === 'パリ' || article.area.startsWith('パリ') ? article.area : `パリ・${article.area}`}</Badge>
          {article.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
          <Badge variant="default">{article.durationType}</Badge>
        </div>
        <h1
          className="mt-4 text-[32px] font-semibold leading-[1.2] tracking-tight sm:text-[42px]"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          {article.title}
        </h1>

        {/* Writer block */}
        {writer ? (
          <Link
            href={`/writers/${writer.id}`}
            className="mt-6 flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 transition hover:bg-muted"
          >
            <Avatar size="md">
              <AvatarImage src={writer.avatarUrl} alt={writer.name} />
              <AvatarFallback>{writer.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-semibold">{writer.name}</p>
                <ResidencyBadge tier={writer.tier} years={writer.residencyYears} />
                {writer.isVerifiedCreator ? (
                  <CreatorBadge type="verified" />
                ) : null}
                {writer.isFounding ? <CreatorBadge type="founding" /> : null}
              </div>
              <p className="mt-0.5 text-[12px] text-foreground/60">
                パリ在住 {writer.residencyYears}年 ・ {writer.followerCount.toLocaleString('ja-JP')} followers
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-foreground/30" />
          </Link>
        ) : null}

        {/* Meta */}
        <div className="mt-6 grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-[1.4fr_1fr_auto]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
              ローカル度
            </p>
            <div className="mt-1">
              <LocalScoreBar value={article.localScoreAverage} size="md" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
              満足度
            </p>
            <div className="mt-1">
              <SatisfactionStars
                rating={article.satisfactionAverage}
                count={article.reviewCount}
                size="md"
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
              価格
            </p>
            <PriceTag amount={article.priceJpy} size="lg" />
            <p className="mt-1 text-[11px] text-foreground/50 tabular">
              {article.purchaseCount.toLocaleString('ja-JP')} 人購入済
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-foreground/60">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            エリア：{article.area === 'パリ' || article.area.startsWith('パリ') ? article.area : `パリ・${article.area}`}（具体住所はマスク）
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.durationType}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            スポット {article.spotIds.length} 箇所
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <AddToTripButton
            articleId={article.id}
            size="md"
            initialSaved={alreadySavedByMe}
          />
          <LikeButton
            articleId={article.id}
            initialLiked={initialLiked}
            initialCount={counts.likeCount}
            viewerLoggedIn={viewerLoggedIn}
          />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground/70 ring-1 ring-border">
            <Bookmark className="h-4 w-4" />
            <span className="tabular">
              {counts.bookmarkCount.toLocaleString('ja-JP')}
            </span>
            <span className="text-[11px] text-foreground/50">保存</span>
          </span>
        </div>
      </header>

      {/* Body preview + paywall */}
      <section className="mx-auto mt-10 grid max-w-screen-lg gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <article className="prose-locore">
            {preview.split(/\n\n+/).map((para, i) => (
              <p key={i} className="whitespace-pre-line">
                {para}
              </p>
            ))}
          </article>

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
                    残り <span className="tabular">{article.photoEntries.length - 1}</span> 枚 + キャプションは購入後に
                  </p>
                  <p className="mt-1 text-[12px] text-white/60">
                    縦スクロールで 1 枚ずつ全画面表示されます
                  </p>
                </div>
              </section>
            )
          ) : null}

          {unlocked ? (
            <SpotsCardList
              spots={spots}
              folders={folders}
              bookmarkedSpotIds={bookmarkedSpotIds}
              viewerLoggedIn={viewerLoggedIn}
            />
          ) : (
            <Paywall
              article={article}
              bodyAfter={after}
              spots={spots}
              folders={folders}
              bookmarkedSpotIds={bookmarkedSpotIds}
              viewerLoggedIn={viewerLoggedIn}
              alreadyPurchased={purchasedFromDb || isOwner}
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

          {/* レビュー投稿フォーム（購入済みのみ表示） */}
          {unlocked && !isOwner ? (
            <ReviewForm
              articleId={article.id}
              initial={myReview}
            />
          ) : null}

          {/* Reviews */}
          <section>
            <h3
              className="mb-4 text-[18px] font-semibold tracking-tight"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
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
                      <LocalScoreBar value={r.localScore} size="sm" showLabel={false} />
                    </div>
                    <SatisfactionStars rating={r.satisfaction} size="sm" showStars />
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

        {/* Side rail */}
        <aside className="space-y-6">
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
              この街
            </p>
            <h4
              className="mt-1 text-[18px] font-semibold tracking-tight"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              {article.area === 'パリ' || article.area.startsWith('パリ') ? article.area : `パリ・${article.area}`}
            </h4>
            <p className="mt-2 text-[13px] leading-relaxed text-foreground/70">
              観光地から少し外れた、クリエイターが日常的に歩いているエリア。
            </p>
            <Link
              href="/map"
              className="mt-4 inline-flex text-[13px] font-medium text-primary-300 hover:underline"
            >
              地図で確認する →
            </Link>
          </div>

          {related.length > 0 ? (
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
                関連記事
              </p>
              <div className="grid gap-3">
                {related.map((a) => (
                  <Link
                    key={a.id}
                    href={`/articles/${a.id}`}
                    className="flex gap-3 rounded-md border border-border bg-card p-3 transition hover:bg-muted"
                  >
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-muted">
                      <Image
                        src={a.coverImageUrl}
                        alt={a.title}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[13px] font-medium leading-snug">
                        {a.title}
                      </p>
                      <p className="mt-1 text-[11px] text-foreground/50 tabular">
                        ¥{a.priceJpy.toLocaleString('ja-JP')} ・ {a.area}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      {/* Bottom related grid */}
      <section className="mx-auto max-w-screen-xl px-4 pb-20 sm:px-6">
        <h3
          className="mb-5 text-[20px] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          同じクリエイター・同じ街の記事
        </h3>
        <ArticleGrid articles={related} />
      </section>
    </main>
  );
}
