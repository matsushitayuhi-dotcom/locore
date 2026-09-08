import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { Button } from '@locore/ui';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';

/**
 * 旧ウィザード（/writer/articles/[id]/edit）は廃止。エディタは /write の 1 本だけ。
 *
 * ここは「/write へ送る入口」だが、素通しにはしない。/write の自動保存（dirty から 1.5 秒）は
 * saveArticleBlocks を叩き、これは無条件に body_style='blocks' と body=ブロックのプレーンテキストを
 * 書き込む（write/actions.ts）。旧形式（photo_journal / classic）の記事でそれが起きると:
 *   - 本文 body が Markdown 装飾ごとプレーンテキストに潰れて戻せない
 *   - 記事ページが EditorialArticle 分岐に入るので、スポット・動画・有料本文（body_paid）は
 *     DB に残ったまま公開ページから一切描かれなくなる（有料の旅行記事が無料の抜け殻になる）
 * 「保存を押すまで body は温存する」は自動保存がある以上ガードにならないので、
 * 失うものがある記事だけここで一度止めて、書き手に選ばせる。
 *
 * 恒久策は write/actions.ts 側（明示保存以外で body_style を書き換えない）だが、
 * それはエディタ担当の範囲なのでここは入口の確認にとどめている。
 *
 * 認可: 本人 / editor 以外は判定材料を見せず /write に流す（notFound は /write が出す）。
 */
export const metadata = { title: '記事を書く' };
export const dynamic = 'force-dynamic';

export default async function LegacyEditRedirect({
  params,
}: {
  params: { id: string };
}) {
  const to = `/writer/articles/${params.id}/write`;

  // uuid でなければ判定用のクエリを投げるだけ無駄。/write に流して 404 を出させる
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) redirect(to);

  const user = await getCurrentUser();
  if (!user) redirect(to);

  const db = getDb();
  const rows = await db
    .select({
      writerId: schema.articles.writerId,
      bodyStyle: schema.articles.bodyStyle,
      bodyPaid: schema.articles.bodyPaid,
    })
    .from(schema.articles)
    .where(eq(schema.articles.id, params.id))
    .limit(1)
    .catch(() => []);
  const a = rows[0];
  if (!a) redirect(to);
  if (a.writerId !== user.id && user.role !== 'editor') redirect(to);
  // 既にブロック形式なら失うものは無い
  if (a.bodyStyle === 'blocks') redirect(to);

  // 旧レイアウト固有の中身があるか。存在確認だけなので 1 行ずつ引く
  const [spotRows, videoRows] = await Promise.all([
    db
      .select({ id: schema.spots.id })
      .from(schema.spots)
      .where(eq(schema.spots.articleId, params.id))
      .limit(1)
      .catch(() => []),
    db
      .select({ id: schema.articleVideos.id })
      .from(schema.articleVideos)
      .where(eq(schema.articleVideos.articleId, params.id))
      .limit(1)
      .catch(() => []),
  ]);
  const losing: string[] = [];
  if (spotRows.length > 0) losing.push('スポット');
  if (videoRows.length > 0) losing.push('動画');
  if (a.bodyPaid && a.bodyPaid.trim().length > 0) losing.push('有料パート');
  if (losing.length === 0) redirect(to);

  return (
    <div className="mx-auto max-w-[42rem] space-y-5 px-4 py-8">
      <h1 className="text-[20px] font-bold leading-snug text-foreground">
        この記事は古い作りです
      </h1>
      {/* 本文は 16px。スマホで読む文なので小さくしない */}
      <div className="space-y-3 text-[16px] leading-relaxed text-foreground/80">
        <p>
          この記事には{losing.join('・')}が入っています。新しいエディタでは
          {losing.join('・')}を編集できません。
        </p>
        <p>
          新しいエディタで開いて<strong>本文を書き換えると</strong>、
          {losing.join('・')}は記事ページに表示されなくなります。
          （データが消えるわけではありませんが、公開ページからは見えなくなります。
          本文そのものは書き直した内容に置き換わります。）
        </p>
        <p>
          読むだけなら「プレビュー」から今の見た目を確認できます。
          迷ったら書き換えずに運営に相談してください。
        </p>
      </div>
      {/* タップ要素は 44px 以上（Button の既定 size=md が h-11）。
          縦積みにして 402px でも文字が折り返さないようにする */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline" className="text-[15px]">
          <Link href={`/writer/articles/${params.id}/preview`}>
            今の見た目を見る
          </Link>
        </Button>
        <Button asChild variant="ghost" className="text-[15px]">
          <Link href={to}>新しいエディタで開く</Link>
        </Button>
        <Button asChild variant="primary" className="text-[15px]">
          <Link href="/writer/articles">記事一覧に戻る</Link>
        </Button>
      </div>
    </div>
  );
}
