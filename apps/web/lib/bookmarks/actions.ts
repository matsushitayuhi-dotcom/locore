'use server';

import { z } from 'zod';
import { and, eq, desc, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';
import { requireUser } from '@/lib/auth/require-user';

const bookmarkInputSchema = z.object({
  articleId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
});

export type BookmarkActionResult =
  | { ok: true }
  | { ok: false; reason: 'unauthenticated' | 'invalid_input' | 'unknown'; message?: string };

/**
 * 現在ユーザーを取得。Agent A の書き換え後は `null` 許容になるため、
 * 例外で投げる旧実装と null を返す新実装の両方に対応する。
 */
async function tryGetCurrentUser() {
  try {
    const user = await getCurrentUser();
    return user ?? null;
  } catch {
    return null;
  }
}

export async function addBookmark(input: unknown): Promise<BookmarkActionResult> {
  const parsed = bookmarkInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'invalid_input',
      message: parsed.error.errors[0]?.message ?? 'invalid input',
    };
  }

  const user = await tryGetCurrentUser();
  if (!user) return { ok: false, reason: 'unauthenticated' };

  const db = getDb();
  await db
    .insert(schema.bookmarks)
    .values({
      userId: user.id,
      articleId: parsed.data.articleId,
      folderId: parsed.data.folderId ?? null,
    })
    .onConflictDoUpdate({
      target: [schema.bookmarks.userId, schema.bookmarks.articleId],
      set: { folderId: parsed.data.folderId ?? null },
    });

  revalidatePath('/library');
  return { ok: true };
}

export async function removeBookmark(input: unknown): Promise<BookmarkActionResult> {
  const parsed = bookmarkInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'invalid_input',
      message: parsed.error.errors[0]?.message ?? 'invalid input',
    };
  }

  const user = await tryGetCurrentUser();
  if (!user) return { ok: false, reason: 'unauthenticated' };

  const db = getDb();
  await db
    .delete(schema.bookmarks)
    .where(
      and(
        eq(schema.bookmarks.userId, user.id),
        eq(schema.bookmarks.articleId, parsed.data.articleId),
      ),
    );

  revalidatePath('/library');
  return { ok: true };
}

/**
 * 自分のブックマークを記事メタ込みで取得。
 * 並びは bookmarks.created_at DESC（保存日が新しい順）。
 *
 * RLS により他人の bookmark は読めないが、サーバ側で auth.uid() を立てる前
 * （= 現状のモック認証）は drizzle 側で WHERE で絞っている。
 */
export async function listMyBookmarks() {
  const user = await tryGetCurrentUser();
  if (!user)
    return [] as Array<{
      articleId: string;
      folderId: string | null;
      createdAt: Date;
    }>;

  const db = getDb();
  try {
    const rows = await db
      .select({
        articleId: schema.bookmarks.articleId,
        folderId: schema.bookmarks.folderId,
        createdAt: schema.bookmarks.createdAt,
      })
      .from(schema.bookmarks)
      .where(eq(schema.bookmarks.userId, user.id))
      .orderBy(desc(schema.bookmarks.createdAt));
    return rows;
  } catch {
    // folder_id 列がまだ無い（migration 0024 未適用）
    const rows = await db
      .select({
        articleId: schema.bookmarks.articleId,
        createdAt: schema.bookmarks.createdAt,
      })
      .from(schema.bookmarks)
      .where(eq(schema.bookmarks.userId, user.id))
      .orderBy(desc(schema.bookmarks.createdAt));
    return rows.map((r) => ({ ...r, folderId: null as string | null }));
  }
}

/**
 * 自分のブックマーク済み記事 ID の Set。
 * 既ブックマーク表示の判定に使う（ArticleGrid の `bookmarkedIds` プロップ向け）。
 */
export async function getMyBookmarkedIdSet(): Promise<Set<string>> {
  const rows = await listMyBookmarks();
  return new Set(rows.map((r) => r.articleId));
}

// =====================================================
// フォルダ管理
// =====================================================

export type BookmarkFolderSummary = {
  id: string;
  name: string;
  color: string | null;
  count: number;
};

export type BookmarkFolderActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().trim().max(20).optional().nullable(),
});

export async function createBookmarkFolder(
  input: unknown,
): Promise<BookmarkFolderActionResult<{ id: string }>> {
  const parsed = createFolderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なフォルダ名' };
  const me = await requireUser();
  const db = getDb();
  try {
    const inserted = await db
      .insert(schema.bookmarkFolders)
      .values({
        userId: me.id,
        name: parsed.data.name,
        color: parsed.data.color ?? null,
      })
      .returning({ id: schema.bookmarkFolders.id });
    revalidatePath('/library');
    return { ok: true, data: { id: inserted[0]!.id } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `フォルダ作成に失敗（${msg}）。0024_bookmark_folders.sql が適用されているか確認してください。`,
    };
  }
}

const renameFolderSchema = z.object({
  folderId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
});

export async function renameBookmarkFolder(
  input: unknown,
): Promise<BookmarkFolderActionResult> {
  const parsed = renameFolderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な入力' };
  const me = await requireUser();
  const db = getDb();
  await db
    .update(schema.bookmarkFolders)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(
      and(
        eq(schema.bookmarkFolders.id, parsed.data.folderId),
        eq(schema.bookmarkFolders.userId, me.id),
      ),
    );
  revalidatePath('/library');
  return { ok: true };
}

const deleteFolderSchema = z.object({
  folderId: z.string().uuid(),
});

export async function deleteBookmarkFolder(
  input: unknown,
): Promise<BookmarkFolderActionResult> {
  const parsed = deleteFolderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な入力' };
  const me = await requireUser();
  const db = getDb();
  // フォルダ削除 → 含まれていた bookmarks は folder_id が ON DELETE SET NULL で未分類に戻る
  await db
    .delete(schema.bookmarkFolders)
    .where(
      and(
        eq(schema.bookmarkFolders.id, parsed.data.folderId),
        eq(schema.bookmarkFolders.userId, me.id),
      ),
    );
  revalidatePath('/library');
  return { ok: true };
}

const moveSchema = z.object({
  articleId: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
});

/** 既存ブックマークを別フォルダに移動。未保存ならまず保存してから入れる */
export async function moveBookmark(
  input: unknown,
): Promise<BookmarkFolderActionResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な入力' };
  const me = await requireUser();
  const db = getDb();
  await db
    .insert(schema.bookmarks)
    .values({
      userId: me.id,
      articleId: parsed.data.articleId,
      folderId: parsed.data.folderId,
    })
    .onConflictDoUpdate({
      target: [schema.bookmarks.userId, schema.bookmarks.articleId],
      set: { folderId: parsed.data.folderId },
    });
  revalidatePath('/library');
  return { ok: true };
}

/**
 * 自分のフォルダ一覧 + 各フォルダの件数。
 * 0024 未適用なら空配列で返してページを落とさない。
 */
export async function listMyBookmarkFolders(): Promise<BookmarkFolderSummary[]> {
  const me = await tryGetCurrentUser();
  if (!me) return [];
  const db = getDb();
  try {
    const rows = await db
      .select({
        id: schema.bookmarkFolders.id,
        name: schema.bookmarkFolders.name,
        color: schema.bookmarkFolders.color,
        cnt: sql<number>`(
          SELECT count(*)::int FROM ${schema.bookmarks}
          WHERE ${schema.bookmarks.folderId} = ${schema.bookmarkFolders.id}
            AND ${schema.bookmarks.userId} = ${schema.bookmarkFolders.userId}
        )`,
      })
      .from(schema.bookmarkFolders)
      .where(eq(schema.bookmarkFolders.userId, me.id))
      .orderBy(desc(schema.bookmarkFolders.createdAt));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color ?? null,
      count: r.cnt ?? 0,
    }));
  } catch {
    return [];
  }
}
