import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { listAvailability } from '@/lib/bookings/availability';
import { CONSULTATION_TAG } from '@/lib/experts/constants';
import { getProfileCompleteness } from '@/lib/experts/completeness';
import { SectionProgress } from '@/components/settings/SectionProgress';
import { AvailabilityManager } from './AvailabilityManager';

export const metadata = {
  title: '空き時間管理',
};

export const dynamic = 'force-dynamic';

/**
 * /settings/availability — エキスパートの空き枠管理（booking-slice モック 1/5）。
 *
 * 入力はエキスパートの現地時間（users.timezone、初期値は相談メニュー都市の
 * cities.timezone）、相談者への表示は日本時間 — この非対称をページ冒頭で説明する。
 * フォーム・一覧は Client（AvailabilityManager）、データはここで取得。
 */
export default async function AvailabilitySettingsPage() {
  const user = await requireUser('/settings/availability');
  const isWriter = user.role === 'resident_writer' || user.role === 'editor';

  if (!isWriter) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-[13px] text-foreground/70">
        空き時間管理はエキスパート向けの機能です。まずは
        <a href="/become-writer" className="mx-1 font-bold text-primary-300 underline-offset-4 hover:underline">
          エキスパートとして登録
        </a>
        してください。
      </div>
    );
  }

  // 初期タイムゾーン: users.timezone → 相談メニュー都市の cities.timezone → Asia/Tokyo
  let initialTimezone: string | null = null;
  let meetingRoomUrl: string | null = null;
  try {
    const db = getDb();
    const meRows = await db
      .select({ timezone: schema.users.timezone })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);
    initialTimezone = meRows[0]?.timezone ?? null;
    // 相談室 URL は 0082 の列なので分離クエリ（未適用環境で TZ まで巻き込まない）
    try {
      const roomRows = await db
        .select({ meetingRoomUrl: schema.users.meetingRoomUrl })
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1);
      meetingRoomUrl = roomRows[0]?.meetingRoomUrl ?? null;
    } catch (err) {
      console.warn('[settings/availability] meeting_room_url lookup failed (0082 未適用?):', err);
    }
    if (!initialTimezone) {
      const cityTz = await db
        .select({ timezone: schema.cities.timezone })
        .from(schema.userServices)
        .innerJoin(
          schema.cities,
          eq(schema.cities.id, schema.userServices.cityId),
        )
        .where(
          and(
            eq(schema.userServices.userId, user.id),
            eq(schema.userServices.isActive, true),
            isNotNull(schema.userServices.cityId),
            sql`${schema.userServices.tags} && ARRAY[${CONSULTATION_TAG}]::text[]`,
          ),
        )
        .limit(1);
      initialTimezone = cityTz[0]?.timezone ?? null;
    }
  } catch (err) {
    console.warn('[settings/availability] timezone lookup failed:', err);
  }

  const [slots, completeness] = await Promise.all([
    listAvailability(user.id),
    getProfileCompleteness(user.id),
  ]);

  return (
    <div>
      <SectionProgress
        title="このセクションの進捗"
        section={completeness.sections.availability}
      />
      <AvailabilityManager
        initialTimezone={initialTimezone ?? 'Asia/Tokyo'}
        initialMeetingRoomUrl={meetingRoomUrl}
        slots={slots.map((s) => ({
          id: s.id,
          startIso: s.startAt.toISOString(),
          endIso: s.endAt.toISOString(),
          hasBooking: s.hasBooking,
        }))}
      />
    </div>
  );
}
