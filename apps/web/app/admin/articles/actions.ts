'use server';

import 'server-only';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/require-user';

/**
 * editor 専用: 記事の公開状態を操作する。
 *
 * - 公開 (publish):  status='published' + publishedAt が NULL なら now()
 * - 非公開 (unpublish): status='archived'  (元に戻したいときは再度公開)
 * - 削除 (soft delete): deletedAt=now(). 記事と購入履歴の整合性を守るため
 *   物理削除はしない。一覧からも自動的に除外される。
 *
 * 公開/非公開は writer の意図と関係なく editor 権限で実行できる
 * (モデレーション目的)。削除は記事の writer にも見えなくなるため慎重に。
 */

const idSchema = z.object({ id: z.string().uuid() });

export type ArticleActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/**
 * 関連ページを一括 revalidate。
 * 記事は色んな場所に出るので、editor 操作のたびにキャッシュを飛ばす。
 */
function revalidateArticleSurfaces(articleId: string, writerId?: string) {
  revalidatePath('/admin/articles');
  revalidatePath('/admin');
  revalidatePath(`/articles/${articleId}`);
  revalidatePath('/articles');
  // 該当 region/writer の一覧も更新が必要だが、slug を取得していないので
  // 包括的に / 経由でも対応 (/region/* は force-dynamic なのでキャッシュ無し)
  if (writerId) {
    revalidatePath(`/users/${writerId}`);
    revalidatePath(`/users/${writerId}`);
  }
}

async function loadArticleForEditor(id: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.articles.id,
      writerId: schema.articles.writerId,
      status: schema.articles.status,
      publishedAt: schema.articles.publishedAt,
      deletedAt: schema.articles.deletedAt,
    })
    .from(schema.articles)
    .where(eq(schema.articles.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// =============================================================================
// 公開
// =============================================================================

/**
 * 記事を公開状態にする。
 * - draft / pending_review / archived のいずれからでも published に遷移可能
 * - すでに published なら no-op
 * - 削除済み (deletedAt) は復活させない (誤操作防止)
 */
export async function publishArticle(input: unknown): Promise<ArticleActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な記事 ID です' };

  const article = await loadArticleForEditor(parsed.data.id);
  if (!article) return { ok: false, error: '記事が見つかりません' };
  if (article.deletedAt) {
    return { ok: false, error: '削除済みの記事は公開できません (先に復活が必要)' };
  }
  if (article.status === 'published') {
    return { ok: true, message: 'すでに公開済みです' };
  }

  const db = getDb();
  const now = new Date();
  try {
    await db
      .update(schema.articles)
      .set({
        status: 'published',
        // 初回公開ならタイムスタンプを記録、再公開なら維持
        publishedAt: article.publishedAt ?? now,
        updatedAt: now,
      })
      .where(eq(schema.articles.id, parsed.data.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `公開失敗: ${msg}` };
  }

  revalidateArticleSurfaces(parsed.data.id, article.writerId);
  return { ok: true, message: '記事を公開しました' };
}

// =============================================================================
// 非公開
// =============================================================================

/**
 * 記事を非公開 (archived) にする。
 * - 一覧からは出なくなるが、購入済みユーザーは引き続き読める
 *   (購入後アクセス権の不可逆性を守るため)
 * - URL 直叩きの挙動はサイト側の paywall ロジックに従う
 */
export async function unpublishArticle(input: unknown): Promise<ArticleActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な記事 ID です' };

  const article = await loadArticleForEditor(parsed.data.id);
  if (!article) return { ok: false, error: '記事が見つかりません' };
  if (article.deletedAt) {
    return { ok: false, error: '削除済みの記事です' };
  }
  if (article.status === 'archived') {
    return { ok: true, message: 'すでに非公開です' };
  }

  const db = getDb();
  try {
    await db
      .update(schema.articles)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(schema.articles.id, parsed.data.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `非公開化失敗: ${msg}` };
  }

  revalidateArticleSurfaces(parsed.data.id, article.writerId);
  return { ok: true, message: '記事を非公開にしました' };
}

// =============================================================================
// 削除 (soft delete)
// =============================================================================

/**
 * 記事を論理削除する (deletedAt をセット)。
 * - 一覧 / 検索 / プロフィールから完全に消える
 * - 物理削除はしない: 購入履歴 (purchases.article_id) と FK で結ばれているため
 * - 復活が必要なら Supabase Studio で deletedAt を NULL に戻す
 */
export async function softDeleteArticle(input: unknown): Promise<ArticleActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な記事 ID です' };

  const article = await loadArticleForEditor(parsed.data.id);
  if (!article) return { ok: false, error: '記事が見つかりません' };
  if (article.deletedAt) {
    return { ok: true, message: 'すでに削除済みです' };
  }

  const db = getDb();
  const now = new Date();
  try {
    await db
      .update(schema.articles)
      .set({
        deletedAt: now,
        // 公開中の記事を削除する場合は archived に落としてから論理削除する
        // (将来 deletedAt を NULL に戻したときに「いきなり公開状態」を避ける)
        status:
          article.status === 'published' ? 'archived' : article.status,
        updatedAt: now,
      })
      .where(and(eq(schema.articles.id, parsed.data.id), isNull(schema.articles.deletedAt)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `削除失敗: ${msg}` };
  }

  revalidateArticleSurfaces(parsed.data.id, article.writerId);
  return { ok: true, message: '記事を削除しました' };
}
