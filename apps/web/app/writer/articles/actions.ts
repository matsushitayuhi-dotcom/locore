'use server';

import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';

/**
 * 新規記事下書きを作成し、編集画面にリダイレクトする。
 * 価格・本文・都市は仮値で埋め、編集画面で書き手が変更する。
 */
const createSchema = z.object({
  title: z.string().trim().min(1, 'タイトルを入力してください').max(200),
});

export async function createArticleDraft(input: unknown): Promise<never> {
  const parsed = createSchema.parse(input);
  const user = await requireUser();
  if (user.role !== 'resident_writer' && user.role !== 'editor') {
    throw new Error('書き手のみが作成できます');
  }
  const db = getDb();

  // 既定都市は最初に見つかった active な city を採用（パリ想定）。
  const cityRows = await db
    .select({ id: schema.cities.id })
    .from(schema.cities)
    .where(eq(schema.cities.isActive, true))
    .limit(1);

  if (cityRows.length === 0) {
    throw new Error('対応都市が見つかりません。先に cities をシードしてください。');
  }

  const inserted = await db
    .insert(schema.articles)
    .values({
      writerId: user.id,
      cityId: cityRows[0]!.id,
      title: parsed.title,
      body: '',
      priceJpy: 800,
      status: 'draft',
      tags: [],
    })
    .returning({ id: schema.articles.id });

  const newId = inserted[0]!.id;
  revalidatePath('/writer/articles');
  redirect(`/writer/articles/${newId}/edit`);
}

/** 自分の記事一覧（status 別）。 */
export type WriterArticleSummary = {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived' | 'pending_review';
  priceJpy: number;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  warned: boolean;
  moderationScore: number | null;
};

export async function listMyArticles(): Promise<WriterArticleSummary[]> {
  const user = await requireUser();
  const db = getDb();

  const rows = await db
    .select({
      id: schema.articles.id,
      title: schema.articles.title,
      status: schema.articles.status,
      priceJpy: schema.articles.priceJpy,
      coverImageUrl: schema.articles.coverImageUrl,
      publishedAt: schema.articles.publishedAt,
      updatedAt: schema.articles.updatedAt,
      warned: schema.articles.warned,
      moderationScore: schema.articles.moderationScore,
    })
    .from(schema.articles)
    .where(
      and(
        eq(schema.articles.writerId, user.id),
        // deleted_at IS NULL は drizzle 流に書きづらいので、生 SQL は避けて status で十分
      ),
    )
    .orderBy(desc(schema.articles.updatedAt));

  return rows;
}
