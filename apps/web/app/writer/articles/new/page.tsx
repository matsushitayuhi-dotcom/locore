import { createArticleDraft } from '../actions';

export const dynamic = 'force-dynamic';

/**
 * 新規記事作成のエントリ。
 *
 * 以前はタイトルだけ入れる別ページだったが、それを廃止。
 * ここに来た瞬間にプレースホルダ「新しい記事」の下書きを作って
 * 即座にウィザード (/writer/articles/{id}/edit) に redirect する。
 *
 * ウィザード側でタイトルもタイプも本文もすべて入力する流れに統合。
 */
export default async function NewArticlePage() {
  await createArticleDraft({});
  // createArticleDraft 内で redirect(`/writer/articles/{id}/edit`) するので
  // ここには到達しない。型のために null を返す。
  return null;
}
