import 'server-only';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';

/**
 * 資格・試験スコア（0086）の読み取りヘルパ。
 * - listQualificationMaster: 登録フォームの選択肢（category 順 → sort_order）
 * - getUserQualifications: 本人の設定画面用（全ステータス）
 * - getApprovedQualificationsByUser: 公開プロフィール用（approved のみ）
 * カラム未適用・DB 未接続でも空配列で続行する。
 */

export const QUALIFICATION_CATEGORIES = [
  { code: 'language_test', label: '語学試験' },
  { code: 'admission_test', label: '出願用テスト' },
  { code: 'professional', label: '職業資格' },
  { code: 'other', label: 'その他' },
] as const;

export type QualificationCategory = (typeof QUALIFICATION_CATEGORIES)[number]['code'];

export function qualificationCategoryLabel(code: string): string {
  return QUALIFICATION_CATEGORIES.find((c) => c.code === code)?.label ?? code;
}

export type QualificationMasterRow = {
  id: string;
  code: string;
  nameJa: string;
  nameEn: string | null;
  category: string;
  hasScore: boolean;
  scoreHint: string | null;
};

export async function listQualificationMaster(): Promise<QualificationMasterRow[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.qualifications.id,
        code: schema.qualifications.code,
        nameJa: schema.qualifications.nameJa,
        nameEn: schema.qualifications.nameEn,
        category: schema.qualifications.category,
        hasScore: schema.qualifications.hasScore,
        scoreHint: schema.qualifications.scoreHint,
      })
      .from(schema.qualifications)
      .where(eq(schema.qualifications.isActive, true))
      .orderBy(asc(schema.qualifications.category), asc(schema.qualifications.sortOrder));
    // category の並びは QUALIFICATION_CATEGORIES 順に揃える
    const order = new Map<string, number>(QUALIFICATION_CATEGORIES.map((c, i) => [c.code, i]));
    return rows.sort(
      (a, b) => (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99),
    );
  } catch (err) {
    console.warn('[qualifications] master fetch failed (0086 未適用?):', err);
    return [];
  }
}

export type UserQualificationRow = {
  id: string;
  qualificationId: string;
  code: string;
  nameJa: string;
  nameEn: string | null;
  category: string;
  customName: string | null;
  score: string | null;
  acquiredYear: number | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectedReason: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  proofCount: number;
  filesDeletedAt: Date | null;
};

/** 表示名（other は custom_name、それ以外はマスタ名） */
export function qualificationDisplayName(q: {
  code: string;
  nameJa: string;
  customName: string | null;
}): string {
  if (q.code === 'other' && q.customName?.trim()) return q.customName.trim();
  return q.nameJa;
}

async function fetchUserQualifications(
  userIds: string[],
  approvedOnly: boolean,
): Promise<Map<string, UserQualificationRow[]>> {
  const map = new Map<string, UserQualificationRow[]>();
  if (userIds.length === 0) return map;
  try {
    const db = getDb();
    const where = approvedOnly
      ? and(
          inArray(schema.userQualifications.userId, userIds),
          eq(schema.userQualifications.status, 'approved'),
        )
      : inArray(schema.userQualifications.userId, userIds);
    const rows = await db
      .select({
        userId: schema.userQualifications.userId,
        id: schema.userQualifications.id,
        qualificationId: schema.userQualifications.qualificationId,
        code: schema.qualifications.code,
        nameJa: schema.qualifications.nameJa,
        nameEn: schema.qualifications.nameEn,
        category: schema.qualifications.category,
        customName: schema.userQualifications.customName,
        score: schema.userQualifications.score,
        acquiredYear: schema.userQualifications.acquiredYear,
        status: schema.userQualifications.status,
        rejectedReason: schema.userQualifications.rejectedReason,
        submittedAt: schema.userQualifications.submittedAt,
        reviewedAt: schema.userQualifications.reviewedAt,
        proofPaths: schema.userQualifications.proofPaths,
        filesDeletedAt: schema.userQualifications.filesDeletedAt,
      })
      .from(schema.userQualifications)
      .innerJoin(
        schema.qualifications,
        eq(schema.qualifications.id, schema.userQualifications.qualificationId),
      )
      .where(where)
      .orderBy(desc(schema.userQualifications.submittedAt));
    for (const r of rows) {
      const list = map.get(r.userId) ?? [];
      list.push({
        id: r.id,
        qualificationId: r.qualificationId,
        code: r.code,
        nameJa: r.nameJa,
        nameEn: r.nameEn,
        category: r.category,
        customName: r.customName,
        score: r.score,
        acquiredYear: r.acquiredYear,
        status: r.status,
        rejectedReason: r.rejectedReason,
        submittedAt: r.submittedAt,
        reviewedAt: r.reviewedAt,
        proofCount: Array.isArray(r.proofPaths) ? r.proofPaths.length : 0,
        filesDeletedAt: r.filesDeletedAt,
      });
      map.set(r.userId, list);
    }
  } catch (err) {
    console.warn('[qualifications] user fetch failed (0086 未適用?):', err);
  }
  return map;
}

/** 本人の設定画面用（pending / rejected 含む） */
export async function getUserQualifications(userId: string): Promise<UserQualificationRow[]> {
  const map = await fetchUserQualifications([userId], false);
  return map.get(userId) ?? [];
}

/** 公開プロフィール用（approved のみ） */
export async function getApprovedQualificationsByUser(
  userIds: string[],
): Promise<Map<string, UserQualificationRow[]>> {
  return fetchUserQualifications(userIds, true);
}
