import { notFound } from 'next/navigation';
import { eq, and, isNotNull } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getDbArticleBundle } from '@/lib/articles/published';
import { ArticleRenderer } from '@/components/article/ArticleRenderer';

export const metadata = {
  title: '共有プレビュー',
  robots: {
    // 検索エンジンに見つけられたくない (token は秘匿前提)
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

/**
 * magic-link 経由の共有プレビュー。
 *
 * - URL: `/preview/<uuid v4 token>`
 * - 認証不要。token 自体がアクセス権を兼ねる
 * - token が有効期限内 (`preview_token_expires_at >= now()`) なら、
 *   下書き / 未公開 / 公開済 を問わず全パート (unlocked) で表示する
 * - 期限切れ or 該当 token なし → 404
 * - 公開ステータスは触らない (token が有効でも記事を勝手に publish しない)
 *
 * 参照: `manual/0049_article_preview_token.sql`,
 *      `apps/web/app/writer/articles/[id]/edit/actions.ts` の
 *      `generatePreviewToken` / `revokePreviewToken`。
 */
export default async function PreviewByTokenPage({
  params,
}: {
  params: { token: string };
}) {
  // UUID v4 形式チェック (DB 問い合わせ前に弾く)
  const uuidPat =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPat.test(params.token)) return notFound();

  const db = getDb();
  const rows = await db
    .select({
      id: schema.articles.id,
      expiresAt: schema.articles.previewTokenExpiresAt,
    })
    .from(schema.articles)
    .where(
      and(
        eq(schema.articles.previewToken, params.token),
        isNotNull(schema.articles.previewToken),
      ),
    )
    .limit(1);

  if (rows.length === 0) return notFound();
  const row = rows[0]!;

  // 有効期限チェック (NULL なら無期限扱い。発行時は常に 14 日後を入れている)
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    return notFound();
  }

  // 下書き / pending_review / archived も表示可能にするため allowUnpublished=true
  const bundle = await getDbArticleBundle(row.id, { allowUnpublished: true });
  if (!bundle) return notFound();

  return (
    <div className="space-y-3">
      <aside
        role="note"
        className="rounded-md border border-primary-300/40 bg-primary-500/10 px-3 py-2 text-[12px] text-primary-300"
      >
        これは <strong>公開前の共有プレビュー</strong> です。
        リンクを知っている人なら誰でも閲覧できます。
        公開後は通常の記事ページ (/articles/{bundle.article.id}) からアクセスしてください。
      </aside>

      <ArticleRenderer
        article={bundle.article}
        writer={bundle.writer}
        spots={bundle.spots}
        reviews={bundle.reviews}
        related={bundle.related.slice(0, 6)}
        region={bundle.region}
        country={bundle.country}
        // magic-link 経由は全文解放
        unlocked={true}
        purchasedOrOwner={true}
        // 第三者向けプレビューなので owner 扱いにしないが、
        // previewMode=true で LikeButton / ReviewForm / 購入導線は全部抑制される
        isOwner={false}
        viewerLoggedIn={false}
        alreadySavedByMe={false}
        bookmarkCount={0}
        likeCount={0}
        initialLiked={false}
        folders={[]}
        bookmarkedSpotIds={new Set()}
        myReview={null}
        previewMode
      />
    </div>
  );
}
