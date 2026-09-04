import 'server-only';
import { desc, inArray } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';

/**
 * 居住認証の共通判定。
 *
 * 「residency_verifications の最新申請（submitted_at 降順）が approved」を
 * 認証済みとみなす。getResidentProfile / listExperts / 記事詳細の著者バッジで
 * 同じルールを重複実装していたのをここに集約する。
 * DB 失敗時（未接続・マイグレーション未適用）は未認証扱いにフォールバック。
 */

/** userIds のうち、最新申請が approved のユーザー id 集合を返す。 */
export async function getVerifiedUserIds(
  userIds: string[],
): Promise<Set<string>> {
  const set = new Set<string>();
  if (userIds.length === 0) return set;
  try {
    const db = getDb();
    const rows = await db
      .selectDistinctOn([schema.residencyVerifications.userId], {
        userId: schema.residencyVerifications.userId,
        status: schema.residencyVerifications.status,
      })
      .from(schema.residencyVerifications)
      .where(inArray(schema.residencyVerifications.userId, userIds))
      .orderBy(
        schema.residencyVerifications.userId,
        desc(schema.residencyVerifications.submittedAt),
      );
    for (const r of rows) {
      if (r.status === 'approved') set.add(r.userId);
    }
  } catch (err) {
    console.warn('[getVerifiedUserIds] residency_verifications fetch failed:', err);
  }
  return set;
}

/** 単一ユーザー版。 */
export async function isUserVerified(userId: string): Promise<boolean> {
  if (!userId) return false;
  const verified = await getVerifiedUserIds([userId]);
  return verified.has(userId);
}
