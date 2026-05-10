'use server';

import { z } from 'zod';
import { eq, and, asc, desc, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { getCurrentUser } from '@/lib/auth/current-user';

/**
 * お気に入りスポット + 1 階層フォルダ管理の Server Actions。
 *
 * すべて auth.uid() = user_id ベース。RLS は migrations/manual/0021_spot_favorites.sql で開く。
 */

export type SpotFavActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// =============================================================================
// フォルダ
// =============================================================================

const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().trim().max(40).optional(),
});

export async function createSpotFolder(
  input: unknown,
): Promise<SpotFavActionResult<{ id: string }>> {
  const parsed = createFolderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '入力が不正です' };
  const me = await requireUser();
  const db = getDb();

  // 末尾に position 採番
  const existing = await db
    .select({ position: schema.spotFolders.position })
    .from(schema.spotFolders)
    .where(eq(schema.spotFolders.userId, me.id))
    .orderBy(asc(schema.spotFolders.position));
  const nextPos = (existing[existing.length - 1]?.position ?? -1) + 1;

  const inserted = await db
    .insert(schema.spotFolders)
    .values({
      userId: me.id,
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      position: nextPos,
    })
    .returning({ id: schema.spotFolders.id });

  revalidatePath('/library');
  revalidatePath('/library/spots');
  return { ok: true, data: { id: inserted[0]!.id } };
}

const renameFolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  color: z.string().trim().max(40).optional().nullable(),
});

export async function updateSpotFolder(
  input: unknown,
): Promise<SpotFavActionResult> {
  const parsed = renameFolderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '入力が不正です' };
  const me = await requireUser();
  const db = getDb();

  await db
    .update(schema.spotFolders)
    .set({
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.spotFolders.id, parsed.data.id),
        eq(schema.spotFolders.userId, me.id),
      ),
    );

  revalidatePath('/library');
  revalidatePath('/library/spots');
  return { ok: true };
}

const deleteFolderSchema = z.object({ id: z.string().uuid() });

export async function deleteSpotFolder(
  input: unknown,
): Promise<SpotFavActionResult> {
  const parsed = deleteFolderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  const db = getDb();

  // ON DELETE SET NULL でフォルダ内のブックマーク自体は残る
  await db
    .delete(schema.spotFolders)
    .where(
      and(
        eq(schema.spotFolders.id, parsed.data.id),
        eq(schema.spotFolders.userId, me.id),
      ),
    );

  revalidatePath('/library');
  revalidatePath('/library/spots');
  return { ok: true };
}

// =============================================================================
// スポットお気に入り
// =============================================================================

const bookmarkSpotSchema = z.object({
  spotId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export async function bookmarkSpot(
  input: unknown,
): Promise<SpotFavActionResult> {
  const parsed = bookmarkSpotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '入力が不正です' };
  const me = await requireUser();
  const db = getDb();

  await db
    .insert(schema.spotBookmarks)
    .values({
      userId: me.id,
      spotId: parsed.data.spotId,
      folderId: parsed.data.folderId ?? null,
      notes: parsed.data.notes ?? null,
    })
    .onConflictDoUpdate({
      target: [schema.spotBookmarks.userId, schema.spotBookmarks.spotId],
      set: {
        folderId: parsed.data.folderId ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

  revalidatePath('/library/spots');
  return { ok: true };
}

const unbookmarkSpotSchema = z.object({ spotId: z.string().uuid() });

export async function unbookmarkSpot(
  input: unknown,
): Promise<SpotFavActionResult> {
  const parsed = unbookmarkSpotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  const db = getDb();

  await db
    .delete(schema.spotBookmarks)
    .where(
      and(
        eq(schema.spotBookmarks.spotId, parsed.data.spotId),
        eq(schema.spotBookmarks.userId, me.id),
      ),
    );

  revalidatePath('/library/spots');
  return { ok: true };
}

// =============================================================================
// 取得系
// =============================================================================

export type FolderSummary = {
  id: string;
  name: string;
  color: string | null;
  count: number;
};

/** フォルダ一覧 + 各フォルダのブックマーク件数。SpotFavoriteButton の popover で使う */
export async function listMyFolders(): Promise<{
  folders: FolderSummary[];
  unfiledCount: number;
}> {
  const me = await getCurrentUser();
  if (!me) return { folders: [], unfiledCount: 0 };
  const db = getDb();

  const [folders, counts] = await Promise.all([
    db
      .select({
        id: schema.spotFolders.id,
        name: schema.spotFolders.name,
        color: schema.spotFolders.color,
      })
      .from(schema.spotFolders)
      .where(eq(schema.spotFolders.userId, me.id))
      .orderBy(asc(schema.spotFolders.position)),
    db
      .select({
        folderId: schema.spotBookmarks.folderId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(schema.spotBookmarks)
      .where(eq(schema.spotBookmarks.userId, me.id))
      .groupBy(schema.spotBookmarks.folderId),
  ]);

  const countByFolder = new Map<string | null, number>();
  for (const c of counts) countByFolder.set(c.folderId, c.cnt);

  return {
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      count: countByFolder.get(f.id) ?? 0,
    })),
    unfiledCount: countByFolder.get(null) ?? 0,
  };
}

/** 自分が登録した spot id の Set（SpotsCardList で「お気に入り済み」表示用） */
export async function listMyBookmarkedSpotIds(): Promise<Set<string>> {
  const me = await getCurrentUser();
  if (!me) return new Set();
  try {
    const db = getDb();
    const rows = await db
      .select({ spotId: schema.spotBookmarks.spotId })
      .from(schema.spotBookmarks)
      .where(eq(schema.spotBookmarks.userId, me.id));
    return new Set(rows.map((r) => r.spotId));
  } catch {
    return new Set();
  }
}

/** 各フォルダ + 未分類のスポット詳細。/library/spots ページ用。 */
export type LibrarySpot = {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  articleId: string;
  folderId: string | null;
  notes: string | null;
  bookmarkedAt: string;
};

export async function listMyBookmarkedSpotsDetailed(): Promise<LibrarySpot[]> {
  const me = await getCurrentUser();
  if (!me) return [];
  try {
    const db = getDb();
    const rows = await db
      .select({
        spotId: schema.spotBookmarks.spotId,
        folderId: schema.spotBookmarks.folderId,
        notes: schema.spotBookmarks.notes,
        createdAt: schema.spotBookmarks.createdAt,
        name: schema.spots.name,
        address: schema.spots.address,
        category: schema.spots.category,
        articleId: schema.spots.articleId,
      })
      .from(schema.spotBookmarks)
      .leftJoin(schema.spots, eq(schema.spots.id, schema.spotBookmarks.spotId))
      .where(eq(schema.spotBookmarks.userId, me.id))
      .orderBy(desc(schema.spotBookmarks.createdAt));
    return rows.map(
      (r): LibrarySpot => ({
        id: r.spotId,
        name: r.name ?? '（削除済み）',
        address: r.address,
        category: r.category,
        articleId: r.articleId ?? '',
        folderId: r.folderId,
        notes: r.notes,
        bookmarkedAt: r.createdAt.toISOString(),
      }),
    );
  } catch {
    return [];
  }
}
