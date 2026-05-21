import { notFound } from 'next/navigation';
import { getDbArticleBundle } from '../../../lib/articles/published';
import { ArticleRenderer } from '../../../components/article/ArticleRenderer';
import {
  listMyFolders,
  listMyBookmarkedSpotIds,
} from '@/lib/spotFavorites/actions';
import {
  getArticleSocialCounts,
  listMyLikedArticleIds,
} from '@/lib/articleLikes/actions';
import { getMyBookmarkedIdSet } from '@/lib/bookmarks/actions';
import { getMyReviewForArticle } from '@/lib/reviews/actions';
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
  const writer = bundle.writer ?? null;
  const spots = bundle.spots;
  const reviews = bundle.reviews;
  const relatedDb = bundle.related;
  const region = bundle.region;
  const country = bundle.country;

  // 本文の分割：bodyPaid が空 → 全文無料記事として扱い Paywall を出さない
  const hasPaid = !!article.bodyPaid && article.bodyPaid.trim().length > 0;
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
    <ArticleRenderer
      article={article}
      writer={writer}
      spots={spots}
      reviews={reviews}
      related={related}
      region={region}
      country={country}
      unlocked={unlocked}
      purchasedOrOwner={purchasedFromDb || isOwner}
      isOwner={isOwner}
      viewerLoggedIn={viewerLoggedIn}
      alreadySavedByMe={alreadySavedByMe}
      bookmarkCount={counts.bookmarkCount}
      likeCount={counts.likeCount}
      initialLiked={initialLiked}
      folders={folders}
      bookmarkedSpotIds={bookmarkedSpotIds}
      myReview={myReview}
    />
  );
}
