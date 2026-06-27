import { notFound } from 'next/navigation';
import { getDbArticleBundle } from '@/lib/articles/published';
import { getArticleVideos } from '@/lib/articles/v2';
import { ArticleRendererV2 } from '@/components/article/v2/ArticleRendererV2';
import { requireUser } from '@/lib/auth/require-user';

export const metadata = {
  title: '公開前プレビュー',
};

export const dynamic = 'force-dynamic';

/**
 * ライター向け公開前プレビュー。
 *
 * 本番 `/articles/[id]` ページと同じ `<ArticleRendererV2 />` を使って
 * 「公開後の見え方」を再現する。違いは:
 *   - 下書きや審査中（status != published）も表示可能
 *   - 有料パートは強制解除
 *   - いいね / 購入導線は無効化
 *
 * 認可: 自分の記事 or editor のみアクセス可。
 */
export default async function PreviewArticlePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const bundle = await getDbArticleBundle(params.id, { allowUnpublished: true });
  if (!bundle) return notFound();

  const article = bundle.article;
  if (article.writerId !== user.id && user.role !== 'editor') {
    return notFound();
  }

  const videos = await getArticleVideos(article.id);

  return (
    <ArticleRendererV2
      article={article}
      writer={bundle.writer}
      spots={bundle.spots}
      reviews={bundle.reviews}
      related={bundle.related.slice(0, 6)}
      region={bundle.region}
      country={bundle.country}
      // プレビューは常に全解除
      unlocked={true}
      purchasedOrOwner={true}
      // 公開前なのでオーナー扱いで ReviewForm を出さない方が安全だが、
      // previewMode=true で別途抑止しているのでここは true のままで OK。
      isOwner={true}
      viewerLoggedIn={true}
      alreadySavedByMe={false}
      bookmarkCount={0}
      likeCount={0}
      initialLiked={false}
      folders={[]}
      bookmarkedSpotIds={new Set()}
      myReview={null}
      authorServices={[]}
      videos={videos}
      previewMode
    />
  );
}
