import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { parseBlocks, legacyBodyToBlocks } from '@/lib/articles/blocks';
import { BlockEditor } from './BlockEditor';

/**
 * /writer/articles/[id]/write — ブロック形式の記事エディタ（0091）。
 * 記事ページ（案 B）と同じ部品で書ける。「/」で部品を選ぶ。旧ウィザード（/edit）は旅行記事のために残す。
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
  return (
    <BlockEditor
      initial={{
        id: a.id,
        title: a.title === '新しい記事' ? '' : a.title,
        topic: a.topic ?? '',
        coverImageUrl: a.coverImageUrl ?? '',
        blocks: blocks.length > 0 ? blocks : a.body ? legacyBodyToBlocks(a.body) : [],
        status: a.status,
        publishedAt: a.publishedAt?.toISOString() ?? null,
        updatedAt: a.updatedAt.toISOString(),
      }}
    />
  );
}
