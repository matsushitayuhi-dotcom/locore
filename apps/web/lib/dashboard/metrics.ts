import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { CONSULTATION_TAG } from '@/lib/experts/constants';

/**
 * エキスパートのダッシュボード（/dashboard）の指標。docs/expert-dashboard-design.md §3。
 *
 * すべて「いまの DB から計算」。未適用のテーブル（0090 の profile_view_daily 等）は
 * try/catch で 0 に落とし、ページは必ず描画できるようにする。
 * 集計の基準:
 *   - 月: UTC ではなく日本時間（Asia/Tokyo）の月初〜今日。エキスパートは海外在住だが、
 *     表示は「日本時間」で統一している（空き枠と同じ）。
 *   - 相談件数（確定）= status ∈ {accepted, paid, completed}
 *   - 売上 確定 = completed（＋ paid）の price_jpy、見込み = accepted（未実施）の price_jpy
 *              ＋ active な継続プランの当月分 monthly_price_jpy
 */

export type DailyPoint = { day: string; value: number };

export type ExpertMetrics = {
  now: string;
  /** 今やること */
  todo: {
    pendingRequests: number;
    /** 最古の未返答リクエストからの経過時間（時間・小数）。無ければ null */
    oldestPendingHours: number | null;
    unreadMessages: number;
    /** 今日から 7 日間の未予約スロット数 */
    openSlots7d: number;
    /** 今日から 7 日間の予定数（確定） */
    upcoming7d: number;
  };
  /** 今月の数字（先月同期間比つき） */
  month: {
    bookings: number;
    bookingsPrevSame: number;
    revenueConfirmedJpy: number;
    revenueExpectedJpy: number;
    revenuePrevSameJpy: number;
    views: number;
    viewsPrevSame: number;
    favorites: number;
    favoritesPrevSame: number;
  };
  /** 直近 30 日の日次推移（スパークライン） */
  series30d: {
    bookings: DailyPoint[];
    revenue: DailyPoint[];
    views: DailyPoint[];
    favorites: DailyPoint[];
  };
  /** 累計 */
  total: {
    bookings: number;
    completed: number;
    favorites: number;
    reviews: number;
    avgStars: number | null;
    /** 直近 5 件がすべて ★5 か */
    recentAllFive: boolean;
    /** 返答（承諾 or 辞退）までの平均時間（時間）。無ければ null */
    avgResponseHours: number | null;
    /** 24 時間以内に返答した件数 */
    fastResponses: number;
    /** 承諾率 0-100。無ければ null */
    acceptRate: number | null;
    declined: number;
    /** 継続プランの契約数（active 以上を経験） */
    planEnrollments: number;
    activePlans: number;
    isVerified: boolean;
    hasFiveStar: boolean;
  };
  /** 比較: 同じ国のエキスパートの返答時間中央値（時間）。無ければ null */
  peers: { countryCode: string | null; medianResponseHours: number | null };
  upcoming: Array<{
    id: string;
    startAt: string;
    durationMinutes: number;
    serviceTitle: string;
    requesterName: string;
    status: string;
    hasMessage: boolean;
    isPlan: boolean;
  }>;
  recentReviews: Array<{ id: string; stars: number; body: string | null; createdAt: string }>;
  goal: number | null;
  profilePublished: boolean;
};

const CONFIRMED = ['accepted', 'paid', 'completed'] as const;

/** 日本時間の「今日」の 00:00 を UTC Date で返す */
function jstStartOfDay(d: Date): Date {
  const jst = new Date(d.getTime() + 9 * 3600_000);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()) - 9 * 3600_000);
}
function jstStartOfMonth(d: Date): Date {
  const jst = new Date(d.getTime() + 9 * 3600_000);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1) - 9 * 3600_000);
}
function addMonths(d: Date, n: number): Date {
  const jst = new Date(d.getTime() + 9 * 3600_000);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() + n, jst.getUTCDate()) - 9 * 3600_000);
}
/** YYYY-MM-DD（日本時間） */
function jstDayKey(d: Date): string {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

function emptySeries(from: Date, days: number): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < days; i++) m.set(jstDayKey(new Date(from.getTime() + i * 86400_000)), 0);
  return m;
}
function toPoints(m: Map<string, number>): DailyPoint[] {
  return Array.from(m.entries()).map(([day, value]) => ({ day, value }));
}

async function safe<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/does not exist/i.test(msg)) console.warn(`[dashboard] ${label} failed:`, msg);
    return fallback;
  }
}

export async function getExpertMetrics(userId: string, opts: { unreadMessages?: number } = {}): Promise<ExpertMetrics> {
  const db = getDb();
  const now = new Date();
  const today = jstStartOfDay(now);
  const monthStart = jstStartOfMonth(now);
  const prevMonthStart = addMonths(monthStart, -1);
  const prevSameEnd = addMonths(now, -1);
  const d30 = new Date(today.getTime() - 29 * 86400_000);
  const in7d = new Date(today.getTime() + 7 * 86400_000);

  // ---- 予約（全件・過去 13 か月ぶんで十分） ----
  const bookings = await safe('bookings', [] as Array<{
    id: string; status: string; startAt: Date; durationMinutes: number; priceJpy: number; serviceTitle: string;
    requesterId: string; createdAt: Date; respondedAt: Date | null; requestMessage: string | null; enrollmentId: string | null;
  }>, async () =>
    db
      .select({
        id: schema.consultationBookings.id,
        status: schema.consultationBookings.status,
        startAt: schema.consultationBookings.startAt,
        durationMinutes: schema.consultationBookings.durationMinutes,
        priceJpy: schema.consultationBookings.priceJpy,
        serviceTitle: schema.consultationBookings.serviceTitle,
        requesterId: schema.consultationBookings.requesterId,
        createdAt: schema.consultationBookings.createdAt,
        respondedAt: schema.consultationBookings.respondedAt,
        requestMessage: schema.consultationBookings.requestMessage,
        enrollmentId: schema.consultationBookings.enrollmentId,
      })
      .from(schema.consultationBookings)
      .where(eq(schema.consultationBookings.expertId, userId))
      .orderBy(asc(schema.consultationBookings.startAt)),
  );

  const isConfirmed = (s: string) => (CONFIRMED as readonly string[]).includes(s);
  const inRange = (d: Date, from: Date, to: Date) => d >= from && d < to;

  const pending = bookings.filter((b) => b.status === 'requested');
  const oldestPending = pending.reduce<Date | null>((min, b) => (!min || b.createdAt < min ? b.createdAt : min), null);

  const monthConfirmed = bookings.filter((b) => isConfirmed(b.status) && inRange(b.startAt, monthStart, addMonths(monthStart, 1)));
  const prevSameConfirmed = bookings.filter((b) => isConfirmed(b.status) && inRange(b.startAt, prevMonthStart, prevSameEnd));
  const revenueConfirmed = monthConfirmed.filter((b) => b.status === 'completed' || b.status === 'paid').reduce((n, b) => n + b.priceJpy, 0);
  const revenueExpectedBookings = monthConfirmed.filter((b) => b.status === 'accepted').reduce((n, b) => n + b.priceJpy, 0);
  const revenuePrevSame = prevSameConfirmed.reduce((n, b) => n + b.priceJpy, 0);

  // 返答時間・承諾率
  const responded = bookings.filter((b) => b.respondedAt && (b.status !== 'requested'));
  const responseHours = responded.map((b) => (b.respondedAt!.getTime() - b.createdAt.getTime()) / 3600_000);
  const avgResponseHours = responseHours.length ? responseHours.reduce((a, b) => a + b, 0) / responseHours.length : null;
  const fastResponses = responseHours.filter((h) => h <= 24).length;
  const declined = bookings.filter((b) => b.status === 'declined').length;
  const acceptedEver = bookings.filter((b) => isConfirmed(b.status)).length;
  const acceptRate = acceptedEver + declined > 0 ? Math.round((acceptedEver / (acceptedEver + declined)) * 100) : null;

  // ---- 継続プラン ----
  const plans = await safe('plans', [] as Array<{ status: string; monthlyPriceJpy: number }>, async () =>
    db
      .select({ status: schema.planEnrollments.status, monthlyPriceJpy: schema.planEnrollments.monthlyPriceJpy })
      .from(schema.planEnrollments)
      .where(eq(schema.planEnrollments.expertId, userId)),
  );
  const activePlans = plans.filter((p) => p.status === 'active' || p.status === 'past_due');
  const planMonthly = activePlans.reduce((n, p) => n + p.monthlyPriceJpy, 0);
  const planEnrollments = plans.filter((p) => p.status !== 'requested' && p.status !== 'declined').length;

  // ---- 空き枠（今日〜7 日）: 確定予約と重なるスロットを除く ----
  const slots = await safe('availability', [] as Array<{ startAt: Date; endAt: Date }>, async () =>
    db
      .select({ startAt: schema.expertAvailability.startAt, endAt: schema.expertAvailability.endAt })
      .from(schema.expertAvailability)
      .where(and(eq(schema.expertAvailability.userId, userId), gte(schema.expertAvailability.startAt, now), lt(schema.expertAvailability.startAt, in7d))),
  );
  const busy = bookings.filter((b) => isConfirmed(b.status) && b.startAt < in7d && b.startAt >= today);
  const openSlots7d = slots.filter((s) => !busy.some((b) => b.startAt < s.endAt && new Date(b.startAt.getTime() + b.durationMinutes * 60_000) > s.startAt)).length;

  // ---- お気に入り（フォロワー） ----
  const follows = await safe('follows', [] as Array<{ createdAt: Date }>, async () =>
    db.select({ createdAt: schema.userFollows.createdAt }).from(schema.userFollows).where(eq(schema.userFollows.followeeId, userId)),
  );

  // ---- 閲覧（0090） ----
  const views = await safe('views', [] as Array<{ day: string; views: number }>, async () =>
    db
      .select({ day: schema.profileViewDaily.day, views: schema.profileViewDaily.views })
      .from(schema.profileViewDaily)
      .where(and(eq(schema.profileViewDaily.userId, userId), gte(schema.profileViewDaily.day, jstDayKey(prevMonthStart)))),
  );
  const viewsIn = (from: Date, to: Date) => {
    const a = jstDayKey(from);
    const b = jstDayKey(to);
    return views.filter((v) => v.day >= a && v.day < b).reduce((n, v) => n + v.views, 0);
  };

  // ---- レビュー（記事購入ベースの既存 reviews を著者で引く） ----
  const reviews = await safe('reviews', [] as Array<{ id: string; stars: number; body: string | null; createdAt: Date }>, async () =>
    db
      .select({ id: schema.reviews.id, stars: schema.reviews.satisfactionStars, body: schema.reviews.body, createdAt: schema.reviews.createdAt })
      .from(schema.reviews)
      .innerJoin(schema.purchases, eq(schema.purchases.id, schema.reviews.purchaseId))
      .innerJoin(schema.articles, eq(schema.articles.id, schema.purchases.articleId))
      .where(eq(schema.articles.writerId, userId))
      .orderBy(desc(schema.reviews.createdAt))
      .limit(50),
  );
  const avgStars = reviews.length ? Math.round((reviews.reduce((n, r) => n + r.stars, 0) / reviews.length) * 10) / 10 : null;
  const recent5 = reviews.slice(0, 5);
  const recentAllFive = recent5.length >= 3 && recent5.every((r) => r.stars === 5);

  // ---- 本人情報 ----
  const meRow = await safe('me', null as null | { goal: number | null; published: boolean; country: string | null }, async () => {
    const rows = await db
      .select({ goal: schema.users.monthlyGoalBookings, published: schema.users.profilePublished, country: schema.users.residencyCountry })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return rows[0] ?? null;
  });
  const isVerified = await safe('verified', false, async () => {
    const rows = await db
      .select({ status: schema.residencyVerifications.status })
      .from(schema.residencyVerifications)
      .where(eq(schema.residencyVerifications.userId, userId))
      .orderBy(desc(schema.residencyVerifications.submittedAt))
      .limit(1);
    return rows[0]?.status === 'approved';
  });

  // ---- 同じ国のエキスパートの返答時間中央値（個人は出さない） ----
  const peers = await safe('peers', { countryCode: meRow?.country ?? null, medianResponseHours: null as number | null }, async () => {
    const country = meRow?.country ?? null;
    if (!country) return { countryCode: null, medianResponseHours: null };
    const rows = await db
      .select({
        h: sql<number>`percentile_cont(0.5) within group (order by extract(epoch from (${schema.consultationBookings.respondedAt} - ${schema.consultationBookings.createdAt})) / 3600.0)`,
      })
      .from(schema.consultationBookings)
      .innerJoin(schema.users, eq(schema.users.id, schema.consultationBookings.expertId))
      .where(and(eq(schema.users.residencyCountry, country), sql`${schema.consultationBookings.respondedAt} is not null`));
    const h = rows[0]?.h;
    return { countryCode: country, medianResponseHours: h != null && Number.isFinite(Number(h)) ? Math.round(Number(h) * 10) / 10 : null };
  });

  // ---- 予定（今後・確定 or 要返答）と申込者名 ----
  const upcomingRaw = bookings.filter((b) => (isConfirmed(b.status) || b.status === 'requested') && b.startAt >= now).slice(0, 5);
  const requesterIds = Array.from(new Set(upcomingRaw.map((b) => b.requesterId)));
  const names = await safe('names', new Map<string, string>(), async () => {
    if (requesterIds.length === 0) return new Map<string, string>();
    const rows = await db
      .select({ id: schema.users.id, name: schema.users.displayName })
      .from(schema.users)
      .where(inArray(schema.users.id, requesterIds));
    return new Map(rows.map((r) => [r.id, r.name]));
  });

  // ---- 30 日系列 ----
  const sBookings = emptySeries(d30, 30);
  const sRevenue = emptySeries(d30, 30);
  const sViews = emptySeries(d30, 30);
  const sFav = emptySeries(d30, 30);
  for (const b of bookings) {
    if (!isConfirmed(b.status)) continue;
    const k = jstDayKey(b.startAt);
    if (sBookings.has(k)) sBookings.set(k, (sBookings.get(k) ?? 0) + 1);
    if (sRevenue.has(k)) sRevenue.set(k, (sRevenue.get(k) ?? 0) + b.priceJpy);
  }
  for (const v of views) if (sViews.has(v.day)) sViews.set(v.day, (sViews.get(v.day) ?? 0) + v.views);
  for (const f of follows) {
    const k = jstDayKey(f.createdAt);
    if (sFav.has(k)) sFav.set(k, (sFav.get(k) ?? 0) + 1);
  }

  return {
    now: now.toISOString(),
    todo: {
      pendingRequests: pending.length,
      oldestPendingHours: oldestPending ? Math.round(((now.getTime() - oldestPending.getTime()) / 3600_000) * 10) / 10 : null,
      unreadMessages: opts.unreadMessages ?? 0,
      openSlots7d,
      upcoming7d: busy.length,
    },
    month: {
      bookings: monthConfirmed.length,
      bookingsPrevSame: prevSameConfirmed.length,
      revenueConfirmedJpy: revenueConfirmed,
      revenueExpectedJpy: revenueExpectedBookings + planMonthly,
      revenuePrevSameJpy: revenuePrevSame,
      views: viewsIn(monthStart, new Date(now.getTime() + 86400_000)),
      viewsPrevSame: viewsIn(prevMonthStart, prevSameEnd),
      favorites: follows.filter((f) => f.createdAt >= monthStart).length,
      favoritesPrevSame: follows.filter((f) => inRange(f.createdAt, prevMonthStart, prevSameEnd)).length,
    },
    series30d: { bookings: toPoints(sBookings), revenue: toPoints(sRevenue), views: toPoints(sViews), favorites: toPoints(sFav) },
    total: {
      bookings: acceptedEver,
      completed: bookings.filter((b) => b.status === 'completed').length,
      favorites: follows.length,
      reviews: reviews.length,
      avgStars,
      recentAllFive,
      avgResponseHours: avgResponseHours != null ? Math.round(avgResponseHours * 10) / 10 : null,
      fastResponses,
      acceptRate,
      declined,
      planEnrollments,
      activePlans: activePlans.length,
      isVerified,
      hasFiveStar: reviews.some((r) => r.stars === 5),
    },
    peers,
    upcoming: upcomingRaw.map((b) => ({
      id: b.id,
      startAt: b.startAt.toISOString(),
      durationMinutes: b.durationMinutes,
      serviceTitle: b.serviceTitle,
      requesterName: names.get(b.requesterId) ?? '相談者',
      status: b.status,
      hasMessage: !!b.requestMessage,
      isPlan: !!b.enrollmentId,
    })),
    recentReviews: reviews.slice(0, 3).map((r) => ({ id: r.id, stars: r.stars, body: r.body, createdAt: r.createdAt.toISOString() })),
    goal: meRow?.goal ?? null,
    profilePublished: meRow?.published ?? false,
  };
}

/** エキスパートかどうか（相談メニューを 1 つ以上持つ）。/dashboard のガード用 */
export async function hasConsultationMenu(userId: string): Promise<boolean> {
  return safe('hasMenu', false, async () => {
    const db = getDb();
    const rows = await db
      .select({ id: schema.userServices.id })
      .from(schema.userServices)
      .where(sql`${schema.userServices.userId} = ${userId} AND ${schema.userServices.tags} && ARRAY[${CONSULTATION_TAG}]::text[]`)
      .limit(1);
    return rows.length > 0;
  });
}
