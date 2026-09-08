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
 * 本文は空で始め、/write（ブロックエディタ）で書く。
 */
const createSchema = z.object({
  // タイトルは任意。空なら「新しい記事」で開始してウィザードで埋める。
  title: z.string().trim().max(200).optional(),
});

/**
 * 新規下書きを作って即座に執筆画面 (/write = ブロックエディタ) に飛ばす。
 *
 * 2026-05 以降は「タイトルだけ入れるページ」を廃止して、
 * このアクションをタイトル無しで叩いてもよくした。
 *
 * 2026-09: 都市の自動紐付けを廃止（0092）。
 * 「最初に見つかった active な city」を勝手に入れていたので、書き手が選んでいない都市が付き、
 * cities が空の環境では新規作成そのものが落ちていた。読みもの記事は都市に紐付かない。
 *
 * ⚠ デプロイ手順: この関数は articles.city_id が nullable であることを前提にしている。
 * packages/db/migrations/manual/0092_articles_city_optional.sql を**先に**流すこと。
 * 未適用のまま出すと NOT NULL 違反で誰も記事を作れなくなるので、
 * その場合だけは書き手に「何が起きたか分かる日本語」を返す（下の catch）。
 */
export async function createArticleDraft(input: unknown = {}): Promise<never> {
  const parsed = createSchema.parse(input);
  const user = await requireUser();
  if (user.role !== 'resident_writer' && user.role !== 'editor') {
    throw new Error('クリエイターのみが作成できます');
  }
  const db = getDb();

  let inserted: { id: string }[];
  try {
    inserted = await db
      .insert(schema.articles)
      .values({
        writerId: user.id,
        title: parsed.title?.trim() || '新しい記事',
        body: '',
        // 2026-09: 新規記事はブロック形式のエディトリアル記事（無料・留学テーマ）
        priceJpy: 0,
        status: 'draft',
        tags: [],
        articleType: 'expat_info',
        bodyStyle: 'blocks',
      })
      .returning({ id: schema.articles.id });
  } catch (err) {
    // 0092 未適用の環境（city_id が NOT NULL のまま）。原因不明のエラー画面を見せない
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[createArticleDraft]', err);
    if (/city_id/i.test(msg) && /(null|23502)/i.test(msg)) {
      throw new Error('いま新しい記事を作れません（DB が未更新です: 0092）。運営に連絡してください');
    }
    throw new Error('新しい記事を作れませんでした。時間をおいてもう一度お試しください');
  }

  const newId = inserted[0]?.id;
  if (!newId) throw new Error('新しい記事を作れませんでした。時間をおいてもう一度お試しください');
  revalidatePath('/writer/articles');
  redirect(`/writer/articles/${newId}/write`);
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
  /**
   * 'blocks' = 新エディタ（/write）で書いた記事。それ以外は旧形式（photo_journal / classic / html / plain）。
   * 一覧の「編集」の行き先を決めるためだけに使う（page.tsx の editHref）。
   * 旧形式は /edit を経由させ、スポット・動画・有料パートを持つ記事だけ確認画面で止める。
   * 表示の分岐には使わない（記事ページ側は getEditorialArticleRow が自分で見る）。
   */
  bodyStyle: string;
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
      bodyStyle: schema.articles.bodyStyle,
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
