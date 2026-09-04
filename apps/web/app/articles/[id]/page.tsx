import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { getDbArticleBundle } from '../../../lib/articles/published';
import {
  articleJsonLd,
  extractDescription,
  jsonLdScriptText,
} from '@/lib/seo/jsonld';
import { getSiteUrl } from '@/lib/seo/siteUrl';
import { isExpertUser } from '@/lib/experts/list';
import { isUserVerified } from '@/lib/residents/verification';
import { getArticleVideos } from '../../../lib/articles/v2';
import { ArticleRendererV2 } from '../../../components/article/v2/ArticleRendererV2';
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
import { and } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { listServicesByUserId } from '@/lib/services/list';

export const dynamic = 'force-dynamic';

/**
 * generateMetadata とページ本体が同一リクエスト内で同じバンドルを共有するための
 * React cache()。以前は generateMetadata 用に記事を別クエリで二重フェッチしていた。
 * getDbArticleBundle は published のみ返し、DB 失敗時は null（→ メタデータ空）。
 */
const getArticleBundleCached = cache((id: string) => getDbArticleBundle(id));

/** SEO 用メタデータ（v2 ブログ再位置付け）。 */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const bundle = await getArticleBundleCached(params.id);
  if (!bundle) return {};
  const a = bundle.article;
  const description = extractDescription(a.body, 120);
  return {
    title: a.title,
    description,
    openGraph: {
      type: 'article',
      title: a.title,
      description,
      ...(a.coverImageUrl ? { images: [{ url: a.coverImageUrl }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: a.title,
      description,
      ...(a.coverImageUrl ? { images: [a.coverImageUrl] } : {}),
    },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // DB ファースト：mock を経由せず直接 DB を引く（generateMetadata と共有キャッシュ）
  const bundle = await getArticleBundleCached(params.id);
  if (!bundle) return notFound();
  const article = bundle.article;
  const writer = bundle.writer ?? null;
  const spots = bundle.spots;
  const reviews = bundle.reviews;
  const relatedDb = bundle.related;
  const region = bundle.region;
  const country = bundle.country;

  // 2026-09 (v2) ブログ再位置付け: 無料記事（priceJpy === 0 かつ bodyPaid 無し）
  // だけ Paywall を出さず全文表示する。priceJpy > 0 の記事は bodyPaid が空でも
  // ゲートする（有料スポット詳細の漏えい防止。判定は各レイアウト側）。

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

  // お気に入りスポット + いいね / ブックマーク数 + 自分の既存レビュー +
  // 著者のエキスパート判定・居住認証 を並列取得
  const [
    { folders },
    bookmarkedSpotIds,
    socialCounts,
    likedSet,
    bookmarkedArticleIds,
    myReview,
    authorServices,
    authorIsExpert,
    authorIsVerified,
    videos,
  ] = await Promise.all([
    listMyFolders(),
    listMyBookmarkedSpotIds(),
    getArticleSocialCounts([article.id]),
    listMyLikedArticleIds(),
    getMyBookmarkedIdSet(),
    getMyReviewForArticle(article.id),
    // 著者カード末尾の「他のサービス」表示用（カード側は先頭 4 件だけ表示）
    writer?.id ? listServicesByUserId(writer.id, 4) : Promise.resolve([]),
    // v2 ブログ再位置付け: 著者がエキスパート（consultation タグの相談メニューを
    // 持つ）なら、著者カードの CTA を「この記事を書いた人に相談する」に切り替える。
    // 判定は limit 1 の存在チェック（表示用リストの件数に依存しない）。
    writer?.id ? isExpertUser(writer.id) : Promise.resolve(false),
    // 居住認証バッジ（最新申請 approved の共通判定）
    writer?.id ? isUserVerified(writer.id) : Promise.resolve(false),
    // essay（ブログ・場所なし）v2 レンダラ用の外部動画
    getArticleVideos(article.id),
  ]);
  const alreadySavedByMe = bookmarkedArticleIds.has(article.id);
  const viewerLoggedIn = !!me;
  const counts = socialCounts.get(article.id) ?? {
    likeCount: 0,
    bookmarkCount: 0,
  };
  const initialLiked = likedSet.has(article.id);

  const authorExpertHref =
    authorIsExpert && writer ? `/experts/${writer.id}` : undefined;

  // Article JSON-LD（SEO）
  const siteUrl = getSiteUrl();
  const jsonLd = articleJsonLd({
    url: `${siteUrl}/articles/${article.id}`,
    title: article.title,
    description: extractDescription(article.body, 120),
    coverImageUrl: article.coverImageUrl,
    publishedAt: article.publishedAt ?? null,
    authorName: writer?.name ?? null,
    authorUrl: writer
      ? `${siteUrl}${authorIsExpert ? `/experts/${writer.id}` : `/users/${writer.id}`}`
      : null,
  });

  return (
    <>
      <script
        type="application/ld+json"
        // ユーザー入力（タイトル・著者名）を含むため必ず jsonLdScriptText で
        // < > & をエスケープする（</script> 挿入による stored XSS 防止）
        dangerouslySetInnerHTML={{ __html: jsonLdScriptText(jsonLd) }}
      />
      <ArticleRendererV2
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
      videos={videos}
      previewMode={false}
      authorIsExpert={authorIsExpert}
      authorExpertHref={authorExpertHref}
      authorIsVerified={authorIsVerified}
    />
    </>
  );
}
