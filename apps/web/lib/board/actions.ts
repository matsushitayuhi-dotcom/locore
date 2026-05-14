'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import {
  BOARD_CATEGORIES,
  BOARD_AUDIENCES,
  isAudienceAllowed,
  type BoardCategory,
  type BoardAudience,
} from './constants';

/**
 * 掲示板の手動投稿。AI 投稿は別経路（/api/cron/ai-paris-events）から
 * service-role で挿入する。
 */

export type BoardActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const createPostSchema = z.object({
  title: z.string().trim().min(2).max(140),
  body: z.string().trim().min(1).max(8000),
  category: z.enum(BOARD_CATEGORIES).optional(),
  audience: z.enum(BOARD_AUDIENCES).optional(),
  eventDate: z.string().optional().nullable(),
  eventLocation: z.string().trim().max(140).optional().nullable(),
  cityId: z.string().uuid().nullable().optional(),
  sourceUrls: z
    .array(
      z.object({
        name: z.string().trim().max(80),
        url: z.string().url(),
      }),
    )
    .max(8)
    .optional(),
});

export async function createBoardPost(
  input: unknown,
): Promise<BoardActionResult<{ id: string }>> {
  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '入力が不正です' };
  const me = await requireUser();
  const db = getDb();

  // カテゴリと対象の整合性を強制
  //   - event 以外は audience を 'resident' に固定
  const category: BoardCategory = parsed.data.category ?? 'event';
  let audience: BoardAudience = parsed.data.audience ?? 'both';
  if (!isAudienceAllowed(category, audience)) {
    audience = 'resident';
  }

  const inserted = await db
    .insert(schema.boardPosts)
    .values({
      authorId: me.id,
      title: parsed.data.title,
      body: parsed.data.body,
      category,
      audience,
      eventDate: parsed.data.eventDate ?? null,
      eventLocation: parsed.data.eventLocation ?? null,
      cityId: parsed.data.cityId ?? null,
      sourceUrls: parsed.data.sourceUrls ?? null,
      source: 'manual',
      status: 'published',
      publishedAt: new Date(),
    })
    .returning({ id: schema.boardPosts.id });

  revalidatePath('/board');
  revalidatePath('/');
  return { ok: true, data: { id: inserted[0]!.id } };
}
