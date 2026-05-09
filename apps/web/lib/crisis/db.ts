import 'server-only';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { CrisisEvent } from '@/lib/mock';

/**
 * 公開済みのクライシス事象を新しい順に取得（mock の CrisisEvent 互換）。
 */
export async function listCrisisEvents(limit = 20): Promise<CrisisEvent[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.crisisEvents.id,
        cityId: schema.crisisEvents.cityId,
        severity: schema.crisisEvents.severity,
        title: schema.crisisEvents.title,
        description: schema.crisisEvents.description,
        japaneseSummary: schema.crisisEvents.japaneseSummary,
        affectedLines: schema.crisisEvents.affectedLines,
        startsAt: schema.crisisEvents.startsAt,
        endsAt: schema.crisisEvents.endsAt,
      })
      .from(schema.crisisEvents)
      .where(eq(schema.crisisEvents.status, 'published'))
      .orderBy(desc(schema.crisisEvents.startsAt))
      .limit(limit);
    return rows.map(
      (r): CrisisEvent => ({
        id: r.id,
        cityId: 'paris', // 単一都市プロト
        severity: Math.max(1, Math.min(5, r.severity)) as
          | 1
          | 2
          | 3
          | 4
          | 5,
        title: r.title,
        summary: r.japaneseSummary ?? r.description ?? '',
        affectedRoutes: r.affectedLines ?? undefined,
        startsAt: r.startsAt.toISOString(),
        endsAt: (r.endsAt ?? r.startsAt).toISOString(),
      }),
    );
  } catch {
    return [];
  }
}
