import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { ExpertMetrics } from '@/lib/dashboard/metrics';

/**
 * マイルストーン（ゲーミフィケーション）。docs/expert-dashboard-design.md §1-3'。
 *
 * 定義はここが正（マスタ）。判定は ExpertMetrics だけから行う純粋関数にし、
 * 達成の永続化（expert_milestones・0090）は syncMilestones が初回達成時に 1 行入れる。
 * 進捗（あと N）は target と current から出す。順序は「近いものから達成しやすい」並び。
 *
 * publicBadge が付いた達成は公開プロフィールにバッジとして出す（返答が早い など）。
 */

export type MilestoneDef = {
  code: string;
  label: string;
  /** 短い説明（未達成のときの「あと N」の単位を含む） */
  unit: string;
  /** バッジに出す記号・数字 */
  glyph: string;
  target: number;
  current: (m: ExpertMetrics) => number;
  /** 公開プロフィールに出すバッジ文言（任意） */
  publicBadge?: string;
};

export const MILESTONES: MilestoneDef[] = [
  { code: 'verified', label: '在籍確認済み', unit: '', glyph: '✓', target: 1, current: (m) => (m.total.isVerified ? 1 : 0) },
  { code: 'first_booking', label: '初めての相談', unit: '件', glyph: '1', target: 1, current: (m) => m.total.bookings },
  { code: 'first_five_star', label: '初レビュー ★5', unit: '件', glyph: '★', target: 1, current: (m) => (m.total.hasFiveStar ? 1 : 0) },
  { code: 'bookings_10', label: '相談 10 件', unit: '件', glyph: '10', target: 10, current: (m) => m.total.bookings },
  { code: 'bookings_25', label: '相談 25 件', unit: '件', glyph: '25', target: 25, current: (m) => m.total.bookings },
  { code: 'fast_reply_10', label: '返答 24h 以内 ×10', unit: '回', glyph: '◎', target: 10, current: (m) => m.total.fastResponses, publicBadge: '返答が早い' },
  { code: 'favorites_50', label: 'お気に入り 50 人', unit: '人', glyph: '♥', target: 50, current: (m) => m.total.favorites },
  { code: 'first_plan', label: '継続プラン初契約', unit: '件', glyph: '∞', target: 1, current: (m) => m.total.planEnrollments },
  { code: 'bookings_100', label: '相談 100 件', unit: '件', glyph: '100', target: 100, current: (m) => m.total.bookings, publicBadge: '相談 100 件' },
];

export type MilestoneState = MilestoneDef & {
  achieved: boolean;
  /** 初回達成日（永続化済みのもの。今回初めて達成した場合は now） */
  achievedAt: string | null;
  /** あと N（未達成のみ） */
  remaining: number;
  /** 今回の同期で初めて達成した（トースト用） */
  justAchieved: boolean;
};

export function evaluateMilestones(m: ExpertMetrics, achievedMap: Map<string, string>): MilestoneState[] {
  return MILESTONES.map((d) => {
    const cur = d.current(m);
    const achieved = cur >= d.target;
    const at = achievedMap.get(d.code) ?? null;
    return {
      ...d,
      achieved,
      achievedAt: achieved ? (at ?? m.now) : null,
      remaining: Math.max(0, d.target - cur),
      justAchieved: achieved && !at,
    };
  });
}

/** 「次の一歩」: 未達成のうち残りが最も少ないもの（同点は定義順） */
export function nextMilestone(states: MilestoneState[]): MilestoneState | null {
  const pending = states.filter((s) => !s.achieved);
  if (pending.length === 0) return null;
  return pending.reduce((best, s) => (s.remaining / s.target < best.remaining / best.target ? s : best), pending[0]!);
}

/** 達成済みを読み、今回初めて達成したものを永続化して返す（0090 未適用なら永続化はスキップ） */
export async function syncMilestones(userId: string, m: ExpertMetrics): Promise<MilestoneState[]> {
  const db = getDb();
  let achievedMap = new Map<string, string>();
  try {
    const rows = await db
      .select({ code: schema.expertMilestones.code, at: schema.expertMilestones.achievedAt })
      .from(schema.expertMilestones)
      .where(eq(schema.expertMilestones.userId, userId));
    achievedMap = new Map(rows.map((r) => [r.code, r.at.toISOString()]));
  } catch {
    /* 0090 未適用 */
  }
  const states = evaluateMilestones(m, achievedMap);
  const fresh = states.filter((s) => s.justAchieved);
  if (fresh.length > 0) {
    try {
      await db
        .insert(schema.expertMilestones)
        .values(fresh.map((s) => ({ userId, code: s.code })))
        .onConflictDoNothing();
    } catch {
      /* 0090 未適用 */
    }
  }
  return states;
}

/** 公開プロフィール用: 達成済みのうち publicBadge を持つものの文言 */
export async function getPublicBadges(userId: string): Promise<string[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({ code: schema.expertMilestones.code })
      .from(schema.expertMilestones)
      .where(eq(schema.expertMilestones.userId, userId));
    const codes = new Set(rows.map((r) => r.code));
    return MILESTONES.filter((d) => d.publicBadge && codes.has(d.code)).map((d) => d.publicBadge!);
  } catch {
    return [];
  }
}
