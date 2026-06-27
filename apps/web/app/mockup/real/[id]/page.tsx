import 'server-only';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getArticleBundleForPreview } from '@/lib/articles/v2';
import { ArticleRendererV2 } from '@/components/article/v2/ArticleRendererV2';

/**
 * `/mockup/real/[id]` — その id の本物の記事を、新レンダラで描画するプレビュー。
 *
 * - 既存の本番ローダ（getDbArticleBundle）をそのまま再利用し、article_videos だけを
 *   足した getArticleBundleForPreview で読み込む。
 * - プレビューなので Paywall は解除状態（全文表示）。新レンダラは body / body_paid を
 *   そのまま流す。
 *   ※ 本番 /articles/[id] へ差し替える際は、ここで unlocked 判定（purchases / owner /
 *      無料記事）を復元し、未解放時は body_paid を出さない課金分岐を戻すこと。
 * - 記事が無ければ notFound()。
 * - /mockup 配下なのでログインゲート下。robots noindex。ライブの /articles/[id] は無変更。
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function MockupRealArticlePage({
  params,
}: {
  params: { id: string };
}) {
  const bundle = await getArticleBundleForPreview(params.id);
  if (!bundle) return notFound();

  return (
    <>
      {/* プレビュー帯（ライブには出さない） */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: '#111',
          color: '#A8E01C',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 12,
          letterSpacing: '0.04em',
          padding: '8px 16px',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>PREVIEW · 実データ × 新デザイン（Paywall 解除・全文表示）</span>
        <Link href="/mockup/real" style={{ color: '#fff', textDecoration: 'underline' }}>
          ← 一覧へ
        </Link>
      </div>

      <ArticleRendererV2
        article={bundle.article}
        writer={bundle.writer}
        spots={bundle.spots}
        reviews={bundle.reviews}
        related={bundle.related}
        region={bundle.region}
        country={bundle.country}
        // 検証プレビュー: 全文解除。previewMode でいいね/購入/レビュー導線は抑止。
        unlocked={true}
        purchasedOrOwner={true}
        isOwner={true}
        viewerLoggedIn={false}
        alreadySavedByMe={false}
        bookmarkCount={0}
        likeCount={0}
        initialLiked={false}
        folders={[]}
        bookmarkedSpotIds={new Set()}
        myReview={null}
        authorServices={[]}
        videos={bundle.videos}
        previewMode
      />
    </>
  );
}
