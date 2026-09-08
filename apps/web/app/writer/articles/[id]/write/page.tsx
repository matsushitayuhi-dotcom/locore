import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { parseBlocks, legacyBodyToBlocks } from '@/lib/articles/blocks';
import { BlockEditor } from './BlockEditor';

/**
 * /writer/articles/[id]/write — ブロック形式の記事エディタ（0091）。
 * 記事ページと同じ部品で書ける。スマホの書式バーと ＋ のシートが操作の中心。
 *
 * subtitle / lead は 0091 で足したカラム。記事ページ（EditorialArticle）は前から描いているのに
 * エディタが読み書きしていなかったので、ここで初期値として渡す（保存は actions.ts の saveArticleBlocks）。
 */
export const metadata = { title: '記事を書く' };
export const dynamic = 'force-dynamic';

export default async function WriteArticlePage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select({
      id: schema.articles.id,
      writerId: schema.articles.writerId,
      title: schema.articles.title,
      subtitle: schema.articles.subtitle,
      lead: schema.articles.lead,
      topic: schema.articles.topic,
      coverImageUrl: schema.articles.coverImageUrl,
      blocks: schema.articles.blocks,
      body: schema.articles.body,
      status: schema.articles.status,
      publishedAt: schema.articles.publishedAt,
      updatedAt: schema.articles.updatedAt,
    })
    .from(schema.articles)
    .where(eq(schema.articles.id, params.id))
    .limit(1)
    .catch(() => []);
  const a = rows[0];
  if (!a) return notFound();
  if (a.writerId !== user.id && user.role !== 'editor') return notFound();
  const blocks = parseBlocks(a.blocks);
  // 変数に組み立ててから渡す（BlockEditor 側で subtitle / lead を受ける前でも型が壊れないように）。
  //
  // ⚠ 現状: subtitle は BlockEditor に入力欄があり保存まで通っているが、**lead はまだ UI が無い**。
  // サーバー（saveArticleBlocks の saveSchema）と複製（new/actions.ts）は lead を扱えるので、
  // 既存記事の lead が消えることはない（キーが無い項目は書き換えない約束）。
  // ただし /write からは lead を新しく書けない。BlockEditor に lead の入力欄が入った時点で、
  // payload に lead を足せばそのまま保存される。
  const initial = {
    id: a.id,
    title: a.title === '新しい記事' ? '' : a.title,
    subtitle: a.subtitle ?? '',
    lead: a.lead ?? '',
    topic: a.topic ?? '',
    coverImageUrl: a.coverImageUrl ?? '',
    blocks: blocks.length > 0 ? blocks : a.body ? legacyBodyToBlocks(a.body) : [],
    status: a.status,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    updatedAt: a.updatedAt.toISOString(),
  };
  return <BlockEditor initial={initial} />;
}
