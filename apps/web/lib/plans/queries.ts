import 'server-only';
import { and, desc, eq, gte, inArray, isNotNull, lt, or, sql } from 'drizzle-orm';
import { schema, type PlanEnrollmentStatus } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { localToUtc, wallPartsInTz } from '@/lib/bookings/time';

/**
 * 継続プラン（伴走）契約の読み取りクエリ。
 * 0083 未適用環境では空配列 / null フォールバック（ページは空状態を出す）。
 *
 * 残回数のルール: JST の暦月単位。当月に start_at がある enrollment_id 付き
 * bookings（requested/accepted/paid/completed）を数え、sessions_per_month から
 * 引く。繰越なし。declined/cancelled/expired のセッションは枠を消費しない。
 */

export type EnrollmentView = {
  id: string;
  status: PlanEnrollmentStatus;
  planTitle: string;
  monthlyPriceJpy: number;
  sessionsPerMonth: number;
  durationMinutes: number;
  requestMessage: string | null;
  chatThreadId: string | null;
  serviceId: string | null;
  expertId: string;
  memberId: string;
  createdAt: Date;
  /** 相手（member 側から見ればエキスパート、expert 側から見れば相談者） */
  counterpart: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  /** 当月に消費したセッション数（active のみ算出。それ以外は 0） */
  usedThisMonth: number;
  /** 当月の残りセッション数（active のみ。それ以外は 0） */
  remainingThisMonth: number;
};

/** JST 暦月の [当月1日 0:00, 翌月1日 0:00) を UTC で返す */
export function currentMonthWindowJst(): { from: Date; to: Date } {
  const w = wallPartsInTz(new Date(), 'Asia/Tokyo');
  const pad = (n: number) => String(n).padStart(2, '0');
  const from = localToUtc('Asia/Tokyo', `${w.year}-${pad(w.month)}-01`, '00:00');
  const nextY = w.month === 12 ? w.year + 1 : w.year;
  const nextM = w.month === 12 ? 1 : w.month + 1;
  const to = localToUtc('Asia/Tokyo', `${nextY}-${pad(nextM)}-01`, '00:00');
  return { from, to };
}

/** 枠を消費する予約ステータス（辞退・取り下げ・期限切れは返却） */
const CONSUMING_STATUSES = ['requested', 'accepted', 'paid', 'completed'] as const;

/** enrollment_id ごとの当月消費数をまとめて引く */
async function countUsedByEnrollment(
  enrollmentIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (enrollmentIds.length === 0) return map;
  try {
    const db = getDb();
    const { from, to } = currentMonthWindowJst();
    const rows = await db
      .select({
        enrollmentId: schema.consultationBookings.enrollmentId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(schema.consultationBookings)
      .where(
        and(
          isNotNull(schema.consultationBookings.enrollmentId),
          inArray(schema.consultationBookings.enrollmentId, enrollmentIds),
          inArray(schema.consultationBookings.status, [...CONSUMING_STATUSES]),
          gte(schema.consultationBookings.startAt, from),
          lt(schema.consultationBookings.startAt, to),
        ),
      )
      .groupBy(schema.consultationBookings.enrollmentId);
    for (const r of rows) {
      if (r.enrollmentId) map.set(r.enrollmentId, r.cnt);
    }
  } catch (err) {
    console.warn('[countUsedByEnrollment] failed (0083 未適用?):', err);
  }
  return map;
}

/** 1 契約の当月消費数（requestBooking の残回数チェックにも使う） */
export async function countUsedSessionsThisMonth(
  enrollmentId: string,
): Promise<number> {
  const map = await countUsedByEnrollment([enrollmentId]);
  return map.get(enrollmentId) ?? 0;
}

type RawRow = {
  id: string;
  status: string;
  planTitle: string;
  monthlyPriceJpy: number;
  sessionsPerMonth: number;
  durationMinutes: number;
  requestMessage: string | null;
  chatThreadId: string | null;
  serviceId: string | null;
  expertId: string;
  memberId: string;
  createdAt: Date;
  otherId: string | null;
  otherName: string | null;
  otherAvatar: string | null;
};

async function toViews(rows: RawRow[]): Promise<EnrollmentView[]> {
  const activeIds = rows.filter((r) => r.status === 'active').map((r) => r.id);
  const used = await countUsedByEnrollment(activeIds);
  return rows.map((r) => {
    const u = r.status === 'active' ? (used.get(r.id) ?? 0) : 0;
    return {
      id: r.id,
      status: r.status as PlanEnrollmentStatus,
      planTitle: r.planTitle,
      monthlyPriceJpy: r.monthlyPriceJpy,
      sessionsPerMonth: r.sessionsPerMonth,
      durationMinutes: r.durationMinutes,
      requestMessage: r.requestMessage,
      chatThreadId: r.chatThreadId,
      serviceId: r.serviceId,
      expertId: r.expertId,
      memberId: r.memberId,
      createdAt: r.createdAt,
      counterpart: {
        id: r.otherId ?? '',
        displayName: r.otherName ?? '退会したユーザー',
        avatarUrl: r.otherAvatar,
      },
      usedThisMonth: u,
      remainingThisMonth:
        r.status === 'active' ? Math.max(0, r.sessionsPerMonth - u) : 0,
    };
  });
}

/** ステータス表示順（申込中→伴走中→その他）＋新しい順 */
function sortEnrollments(rows: EnrollmentView[]): EnrollmentView[] {
  const rank = (s: PlanEnrollmentStatus) =>
    s === 'requested' ? 0 : s === 'active' || s === 'past_due' ? 1 : 2;
  return rows.sort((a, b) => {
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

const baseSelect = {
  id: schema.planEnrollments.id,
  status: schema.planEnrollments.status,
  planTitle: schema.planEnrollments.planTitle,
  monthlyPriceJpy: schema.planEnrollments.monthlyPriceJpy,
  sessionsPerMonth: schema.planEnrollments.sessionsPerMonth,
  durationMinutes: schema.planEnrollments.durationMinutes,
  requestMessage: schema.planEnrollments.requestMessage,
  chatThreadId: schema.planEnrollments.chatThreadId,
  serviceId: schema.planEnrollments.serviceId,
  expertId: schema.planEnrollments.expertId,
  memberId: schema.planEnrollments.memberId,
  createdAt: schema.planEnrollments.createdAt,
  otherId: schema.users.id,
  otherName: schema.users.displayName,
  otherAvatar: schema.users.avatarUrl,
};

/** 自分が申し込んだ契約（member = userId）。相手 = エキスパート */
export async function listMyEnrollments(
  userId: string,
): Promise<EnrollmentView[]> {
  try {
    const db = getDb();
    const rows = await db
      .select(baseSelect)
      .from(schema.planEnrollments)
      .leftJoin(
        schema.users,
        eq(schema.users.id, schema.planEnrollments.expertId),
      )
      .where(eq(schema.planEnrollments.memberId, userId))
      .orderBy(desc(schema.planEnrollments.createdAt))
      .limit(50);
    return sortEnrollments(await toViews(rows));
  } catch (err) {
    console.warn('[listMyEnrollments] failed (0083 未適用?):', err);
    return [];
  }
}

/** 自分が受けた申し込み（expert = userId）。相手 = 相談者 */
export async function listReceivedEnrollments(
  userId: string,
): Promise<EnrollmentView[]> {
  try {
    const db = getDb();
    const rows = await db
      .select(baseSelect)
      .from(schema.planEnrollments)
      .leftJoin(
        schema.users,
        eq(schema.users.id, schema.planEnrollments.memberId),
      )
      .where(eq(schema.planEnrollments.expertId, userId))
      .orderBy(desc(schema.planEnrollments.createdAt))
      .limit(50);
    return sortEnrollments(await toViews(rows));
  } catch (err) {
    console.warn('[listReceivedEnrollments] failed (0083 未適用?):', err);
    return [];
  }
}

/** 単一契約（viewer が当事者のときだけ返す） */
export async function getEnrollment(
  id: string,
  viewerId: string,
): Promise<EnrollmentView | null> {
  try {
    const db = getDb();
    const rows = await db
      .select(baseSelect)
      .from(schema.planEnrollments)
      .leftJoin(
        schema.users,
        eq(schema.users.id, schema.planEnrollments.expertId),
      )
      .where(
        and(
          eq(schema.planEnrollments.id, id),
          or(
            eq(schema.planEnrollments.memberId, viewerId),
            eq(schema.planEnrollments.expertId, viewerId),
          ),
        ),
      )
      .limit(1);
    const views = await toViews(rows);
    return views[0] ?? null;
  } catch (err) {
    console.warn('[getEnrollment] failed (0083 未適用?):', err);
    return null;
  }
}
