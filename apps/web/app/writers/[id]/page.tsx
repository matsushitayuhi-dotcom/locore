import { redirect } from 'next/navigation';

/**
 * /writers/[id] — 旧 writer 個別ページ。
 *
 * 現在は /residents/[id] に統合済み（マッチングアプリ風のリッチな
 * プロフィールページ）。記事ページやチャットからの遷移リンクも
 * 含めて、ユーザープロフィールの表示はすべて /residents/[id] に
 * 集約する方針。
 *
 * 既存ブックマーク・SNS シェアの URL を壊さないように、ここでは
 * サーバーサイドで透過的にリダイレクトするだけにしている。
 */

export const dynamic = 'force-dynamic';

export default function WriterRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/residents/${params.id}`);
}
