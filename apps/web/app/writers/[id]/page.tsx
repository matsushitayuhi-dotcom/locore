import { redirect, RedirectType } from 'next/navigation';

/**
 * /writers/[id] — 旧 writer 個別ページ。
 *
 * /residents/[id] 駐在員ハブに統合済み。既存ブックマーク / SNS シェア /
 * 外部記事リンクを壊さないため、サーバーサイドで透過的に置換リダイレクト。
 */

export const dynamic = 'force-dynamic';

export default function WritersRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/residents/${params.id}`, RedirectType.replace);
}
