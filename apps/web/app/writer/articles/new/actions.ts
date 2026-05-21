'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';

/**
 * 過去記事から複製して新規下書きを作る Server Action。
 *
 * - source の writer が自分（または editor）であることを検証
 * - コピーするフィールド: bodyStyle / articleType / body / bodyPaid /
 *   photoEntries / tags / priceJpy / cityId / durationType / coverImageUrl /
 *   itineraryBlocks
 * - コピー**しない**: title（空にする）/ status（draft）/ publishedAt /
 *   moderationScore / warned / spots（記事に強く紐付くため引き継ぎ無し）
 *
 * 完了後は新記事の編集画面に redirect する（戻り値は never）。
 */
const duplicateSchema = z.object({
  sourceId: z.string().uuid(),
});

export async function duplicateArticle(input: unknown): Promise<never> {
  const { sourceId } = duplicateSchema.parse(input);
  const user = await requireUser();
  if (user.role !== 'resident_writer' && user.role !== 'editor') {
    throw new Error('クリエイターのみが作成できます');
  }
  const db = getDb();

  const sourceRows = await db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.id, sourceId))
    .limit(1);
  if (sourceRows.length === 0) {
    throw new Error('複製元の記事が見つかりません');
  }
  const source = sourceRows[0]!;
  if (source.writerId !== user.id && user.role !== 'editor') {
    throw new Error('他のクリエイターの記事は複製できません');
  }

  const inserted = await db
    .insert(schema.articles)
    .values({
      writerId: user.id,
      cityId: source.cityId,
      // タイトルは空ベース。ウィザード側のプレースホルダと合わせて「新しい記事」。
      title: '新しい記事',
      body: source.body ?? '',
      bodyPaid: source.bodyPaid ?? null,
      bodyStyle: source.bodyStyle,
      articleType: source.articleType,
      // 画像 URL は元のものを流用（Supabase Storage の公開 URL を共有）
      photoEntries: source.photoEntries ?? [],
      itineraryBlocks: source.itineraryBlocks ?? null,
      tags: source.tags ?? [],
      priceJpy: source.priceJpy,
      durationType: source.durationType ?? null,
      coverImageUrl: source.coverImageUrl ?? null,
      status: 'draft',
      // publishedAt / warned / moderationScore は引き継がない（デフォルトのまま）
    })
    .returning({ id: schema.articles.id });

  const newId = inserted[0]!.id;
  revalidatePath('/writer/articles');
  redirect(`/writer/articles/${newId}/edit`);
}

/** 複製候補（自分の記事すべて）を返す。 */
export type DuplicateCandidate = {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived' | 'pending_review';
  coverImageUrl: string | null;
  updatedAt: Date;
  publishedAt: Date | null;
};

export async function listDuplicateCandidates(): Promise<DuplicateCandidate[]> {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select({
      id: schema.articles.id,
      title: schema.articles.title,
      status: schema.articles.status,
      coverImageUrl: schema.articles.coverImageUrl,
      updatedAt: schema.articles.updatedAt,
      publishedAt: schema.articles.publishedAt,
    })
    .from(schema.articles)
    .where(eq(schema.articles.writerId, user.id));
  // updatedAt 降順
  return rows
    .slice()
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
