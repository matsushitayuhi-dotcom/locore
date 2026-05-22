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
import { listServicesByUserId } from '@/lib/services/list';

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

  // 本文の分割：bodyPaid が空 → 全文無料記事として扱う。
  // 2026-05 改修: 無料記事でも「アンロック」フローを通す方針 (便宜上の統一)。
  //   - hasPaid: 有料本文の有無
  //   - isFreeArticle: 価格 0 円の記事 (priceJpy === 0)。これも Paywall を
  //     経由するが、CTA は「無料でアンロック」表記になる
  const hasPaid = !!article.bodyPaid && article.bodyPaid.trim().length > 0;
  const isFreeArticle = article.priceJpy === 0;

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
  // 2026-05 改修: 無料記事も明示的なアンロック必須に変更。
  //   purchasedFromDb (DB の purchases 行あり) または isOwner (自分の記事)
  //   のみで unlocked になる。無料記事のときは Paywall が「無料でアンロック」
  //   ボタンを出し、1 クリックで purchases に amountJpy=0 で行を作る。
  //   (Paywall コンポーネントが localStorage Purchases.has でも判定するので
  //    未ログインユーザーも localStorage 経由で開ける)
  const unlocked = purchasedFromDb || isOwner;

  // お気に入りスポット + いいね / ブックマーク数 + 自分の既存レビュー を並列取得
  const [
    { folders },
    bookmarkedSpotIds,
    socialCounts,
    likedSet,
    bookmarkedArticleIds,
    myReview,
    authorServices,
  ] = await Promise.all([
    listMyFolders(),
    listMyBookmarkedSpotIds(),
    getArticleSocialCounts([article.id]),
    listMyLikedArticleIds(),
    getMyBookmarkedIdSet(),
    getMyReviewForArticle(article.id),
    // 著者カード末尾に「この駐在員の他のサービス」セクションを出す用
    writer?.id ? listServicesByUserId(writer.id, 3) : Promise.resolve([]),
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
      authorServices={authorServices}
    />
  );
}
