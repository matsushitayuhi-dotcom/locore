import 'server-only';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { LightDiary } from '@/lib/mock';

/**
 * 公開済みライト旅行記を新しい順に取得（mock の LightDiary 互換）。
 */
export async function listLightDiaries(limit = 30): Promise<LightDiary[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.lightDiaries.id,
        title: schema.lightDiaries.title,
        body: schema.lightDiaries.body,
        cityId: schema.lightDiaries.cityId,
        visitedAt: schema.lightDiaries.visitedAt,
        authorId: schema.lightDiaries.authorId,
        authorName: schema.users.displayName,
        authorAvatar: schema.users.avatarUrl,
      })
      .from(schema.lightDiaries)
      .leftJoin(schema.users, eq(schema.users.id, schema.lightDiaries.authorId))
      .where(eq(schema.lightDiaries.status, 'published'))
      .orderBy(desc(schema.lightDiaries.visitedAt))
      .limit(limit);
    return rows.map(
      (r): LightDiary => ({
        id: r.id,
        authorName: r.authorName ?? '匿名',
        avatarUrl:
          r.authorAvatar ??
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            r.authorName ?? 'L',
          )}`,
        title: r.title,
        body: r.body,
        cityId: 'paris',
        visitedAt: (r.visitedAt ?? new Date()).toISOString().slice(0, 10),
        likes: 0, // 集計未実装
      }),
    );
  } catch {
    return [];
  }
}
