import 'server-only';
import { and, desc, eq, lt, or } from 'drizzle-orm';
import { schema, type ConsultationBookingStatus } from '@locore/db';
import { getDb } from '@/lib/db/client';

/**
 * /bookings（マイ相談）用の読み取りクエリ。
 * 0061 未適用環境では空配列フォールバック（ページは空状態を出す）。
 */

export type BookingView = {
  id: string;
  status: ConsultationBookingStatus;
  /**
   * 表示用ステータス。requested のまま開始時刻を過ぎたものは 'expired' に
   * 遅延遷移して見せる（DB 遷移は accept 時 / expireStaleBookings() に委ねる）
   */
  displayStatus: ConsultationBookingStatus;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  serviceTitle: string;
  priceJpy: number;
  requestMessage: string | null;
  chatThreadId: string | null;
  /** 参加リンク（承諾時の自動コピー or setBookingMeetUrl）。未設定は null */
  meetUrl: string | null;
  /** 継続プラン契約 id（0083）。null = 単発。表示は「プラン内」バッジ */
  enrollmentId: string | null;
  createdAt: Date;
  /** 相手（依頼側から見ればエキスパート、受け側から見れば相談者） */
  counterpart: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    /** ISO alpha-2 大文字（国旗絵文字用）。相談者側は通常 null */
    countryCode: string | null;
    cityName: string | null;
  };
  /** エキスパート本人の現地 TZ（受信箱の現地時間主表示用）。無ければ null */
  expertTimezone: string | null;
};

function displayStatusOf(
  status: string,
  startAt: Date,
): ConsultationBookingStatus {
  if (status === 'requested' && startAt.getTime() < Date.now()) {
    return 'expired';
  }
  return status as ConsultationBookingStatus;
}

/** ステータス表示順（返答待ち→確定→その他）＋ 開始日時昇順 */
function sortBookings(rows: BookingView[]): BookingView[] {
  const rank = (s: ConsultationBookingStatus) =>
    s === 'requested' ? 0 : s === 'accepted' || s === 'paid' ? 1 : 2;
  return rows.sort((a, b) => {
    const r = rank(a.displayStatus) - rank(b.displayStatus);
    if (r !== 0) return r;
    return a.startAt.getTime() - b.startAt.getTime();
  });
}

/** 自分が依頼した相談（requester = userId）。相手 = エキスパート */
export async function listMyBookings(userId: string): Promise<BookingView[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.consultationBookings.id,
        status: schema.consultationBookings.status,
        startAt: schema.consultationBookings.startAt,
        endAt: schema.consultationBookings.endAt,
        durationMinutes: schema.consultationBookings.durationMinutes,
        serviceTitle: schema.consultationBookings.serviceTitle,
        priceJpy: schema.consultationBookings.priceJpy,
        requestMessage: schema.consultationBookings.requestMessage,
        chatThreadId: schema.consultationBookings.chatThreadId,
        meetUrl: schema.consultationBookings.meetUrl,
        enrollmentId: schema.consultationBookings.enrollmentId,
        createdAt: schema.consultationBookings.createdAt,
        otherId: schema.users.id,
        otherName: schema.users.displayName,
        otherAvatar: schema.users.avatarUrl,
        otherCountry: schema.users.residencyCountry,
        otherCity: schema.users.residencyCity,
        expertTimezone: schema.users.timezone,
      })
      .from(schema.consultationBookings)
      .leftJoin(
        schema.users,
        eq(schema.users.id, schema.consultationBookings.expertId),
      )
      .where(eq(schema.consultationBookings.requesterId, userId))
      .orderBy(desc(schema.consultationBookings.createdAt))
      .limit(100);
    return sortBookings(
      rows.map((r) => ({
        id: r.id,
        status: r.status as ConsultationBookingStatus,
        displayStatus: displayStatusOf(r.status, r.startAt),
        startAt: r.startAt,
        endAt: r.endAt,
        durationMinutes: r.durationMinutes,
        serviceTitle: r.serviceTitle,
        priceJpy: r.priceJpy,
        requestMessage: r.requestMessage,
        chatThreadId: r.chatThreadId,
        meetUrl: r.meetUrl,
        enrollmentId: r.enrollmentId,
        createdAt: r.createdAt,
        counterpart: {
          id: r.otherId ?? '',
          displayName: r.otherName ?? '退会したユーザー',
          avatarUrl: r.otherAvatar,
          countryCode: r.otherCountry,
          cityName: r.otherCity,
        },
        expertTimezone: r.expertTimezone,
      })),
    );
  } catch (err) {
    console.warn('[listMyBookings] failed (0061 未適用?):', err);
    return [];
  }
}

/** 自分が受けたリクエスト（expert = userId）。相手 = 相談者 */
export async function listReceivedBookings(
  userId: string,
): Promise<BookingView[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.consultationBookings.id,
        status: schema.consultationBookings.status,
        startAt: schema.consultationBookings.startAt,
        endAt: schema.consultationBookings.endAt,
        durationMinutes: schema.consultationBookings.durationMinutes,
        serviceTitle: schema.consultationBookings.serviceTitle,
        priceJpy: schema.consultationBookings.priceJpy,
        requestMessage: schema.consultationBookings.requestMessage,
        chatThreadId: schema.consultationBookings.chatThreadId,
        meetUrl: schema.consultationBookings.meetUrl,
        enrollmentId: schema.consultationBookings.enrollmentId,
        createdAt: schema.consultationBookings.createdAt,
        otherId: schema.users.id,
        otherName: schema.users.displayName,
        otherAvatar: schema.users.avatarUrl,
      })
      .from(schema.consultationBookings)
      .leftJoin(
        schema.users,
        eq(schema.users.id, schema.consultationBookings.requesterId),
      )
      .where(eq(schema.consultationBookings.expertId, userId))
      .orderBy(desc(schema.consultationBookings.createdAt))
      .limit(100);
    return sortBookings(
      rows.map((r) => ({
        id: r.id,
        status: r.status as ConsultationBookingStatus,
        displayStatus: displayStatusOf(r.status, r.startAt),
        startAt: r.startAt,
        endAt: r.endAt,
        durationMinutes: r.durationMinutes,
        serviceTitle: r.serviceTitle,
        priceJpy: r.priceJpy,
        requestMessage: r.requestMessage,
        chatThreadId: r.chatThreadId,
        meetUrl: r.meetUrl,
        enrollmentId: r.enrollmentId,
        createdAt: r.createdAt,
        counterpart: {
          id: r.otherId ?? '',
          displayName: r.otherName ?? '退会したユーザー',
          avatarUrl: r.otherAvatar,
          countryCode: null,
          cityName: null,
        },
        expertTimezone: null, // 受信箱では viewer 自身の TZ をページ側で使う
      })),
    );
  } catch (err) {
    console.warn('[listReceivedBookings] failed (0061 未適用?):', err);
    return [];
  }
}

/**
 * 開始時刻を過ぎた requested を expired に一括遷移させる。
 *
 * サーバーアクションではなく server-only の関数（'use server' に置くと無認証の
 * POST でテーブル全体を UPDATE できてしまう）。現状は accept 時の個別遷移 +
 * 表示側の遅延判定で足りており未使用 — 将来 cron（/api/cron/...）から
 * 認可付きで呼ぶためのシームとして置いておく。
 */
export async function expireStaleBookings(): Promise<number> {
  try {
    const db = getDb();
    const updated = await db
      .update(schema.consultationBookings)
      .set({ status: 'expired' })
      .where(
        and(
          eq(schema.consultationBookings.status, 'requested'),
          lt(schema.consultationBookings.startAt, new Date()),
        ),
      )
      .returning({ id: schema.consultationBookings.id });
    return updated.length;
  } catch (err) {
    console.error('[expireStaleBookings] failed:', err);
    return 0;
  }
}

/** 単一予約（viewer が当事者のときだけ返す） */
export async function getBooking(
  id: string,
  viewerId: string,
): Promise<BookingView | null> {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.consultationBookings)
      .where(
        and(
          eq(schema.consultationBookings.id, id),
          or(
            eq(schema.consultationBookings.requesterId, viewerId),
            eq(schema.consultationBookings.expertId, viewerId),
          ),
        ),
      )
      .limit(1);
    const b = rows[0];
    if (!b) return null;
    return {
      id: b.id,
      status: b.status as ConsultationBookingStatus,
      displayStatus: displayStatusOf(b.status, b.startAt),
      startAt: b.startAt,
      endAt: b.endAt,
      durationMinutes: b.durationMinutes,
      serviceTitle: b.serviceTitle,
      priceJpy: b.priceJpy,
      requestMessage: b.requestMessage,
      chatThreadId: b.chatThreadId,
      meetUrl: b.meetUrl,
      enrollmentId: b.enrollmentId,
      createdAt: b.createdAt,
      counterpart: {
        id: b.requesterId === viewerId ? b.expertId : b.requesterId,
        displayName: '',
        avatarUrl: null,
        countryCode: null,
        cityName: null,
      },
      expertTimezone: null,
    };
  } catch (err) {
    console.warn('[getBooking] failed (0061 未適用?):', err);
    return null;
  }
}
