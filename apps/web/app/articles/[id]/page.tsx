import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { desc, eq, isNull } from 'drizzle-orm';
import { getDbArticleBundle } from '../../../lib/articles/published';
import {
  articleJsonLd,
  extractDescription,
} from '@/lib/seo/jsonld';
import { CONSULTATION_TAG } from '@/lib/experts/constants';
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

const uuidPat =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * SEO 用メタデータ（v2 ブログ再位置付け）。
 * バンドル全体（スポット・レビュー・関連）を引かず、記事 + 著者名だけの軽量クエリ。
 */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  if (!uuidPat.test(params.id)) return {};
  try {
    const db = getDb();
    const rows = await db
      .select({
        title: schema.articles.title,
        body: schema.articles.body,
        coverImageUrl: schema.articles.coverImageUrl,
        status: schema.articles.status,
      })
      .from(schema.articles)
      .where(
        and(
          eq(schema.articles.id, params.id),
          isNull(schema.articles.deletedAt),
        ),
      )
      .limit(1);
    const a = rows[0];
    if (!a || a.status !== 'published') return {};
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
  } catch {
    return {};
  }
}

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

  // 2026-09 (v2) ブログ再位置付け: bodyPaid が空の記事は Paywall を出さず
  // 全文表示する（判定は各レイアウト側の paidHtml 条件）。

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
    videos,
  ] = await Promise.all([
    listMyFolders(),
    listMyBookmarkedSpotIds(),
    getArticleSocialCounts([article.id]),
    listMyLikedArticleIds(),
    getMyBookmarkedIdSet(),
    getMyReviewForArticle(article.id),
    // 著者カード末尾の「他のサービス」+ エキスパート判定（consultation タグ）用。
    // 判定漏れを減らすため 3 → 8 件引く（カード側は先頭 4 件だけ表示）
    writer?.id ? listServicesByUserId(writer.id, 8) : Promise.resolve([]),
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

  // v2 ブログ再位置付け: 著者がエキスパート（consultation タグの相談メニューを
  // 持つ）なら、著者カードの CTA を「この記事を書いた人に相談する」に切り替える。
  const authorIsExpert = authorServices.some((s) =>
    s.tags.includes(CONSULTATION_TAG),
  );
  const authorExpertHref =
    authorIsExpert && writer ? `/experts/${writer.id}` : undefined;

  // 居住認証バッジ（最新申請が approved。getResidentProfile と同じ判定）
  let authorIsVerified = false;
  if (writer?.id) {
    try {
      const db = getDb();
      const rows = await db
        .select({ status: schema.residencyVerifications.status })
        .from(schema.residencyVerifications)
        .where(eq(schema.residencyVerifications.userId, writer.id))
        .orderBy(desc(schema.residencyVerifications.submittedAt))
        .limit(1);
      authorIsVerified = rows[0]?.status === 'approved';
    } catch {
      authorIsVerified = false;
    }
  }

  // Article JSON-LD（SEO）
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://locore.app';
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
