import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { isExpertUser, countryFlagEmoji } from '@/lib/experts/list';
import {
  listMyBookings,
  listReceivedBookings,
  type BookingView,
} from '@/lib/bookings/queries';
import { BookingCard, type BookingCardData } from './BookingCard';

export const metadata = {
  title: 'マイ相談',
};

export const dynamic = 'force-dynamic';

/**
 * /bookings — マイ相談（booking-slice モック 4/5）。
 *
 * タブ2枚: 「依頼した相談」（全員）/「受けたリクエスト」（エキスパートのみ、
 * ?tab=received）。ステータスは3色に集約（リクエスト中=warning / 確定=ライム /
 * それ以外=neutral+薄表示）。受け側は本人の現地時間を主表示、日本時間を併記。
 */
export default async function BookingsPage({
  searchParams,
}: {
  searchParams?: { tab?: string | string[] };
}) {
  const me = await requireUser('/bookings');
  const isExpert = await isExpertUser(me.id);

  const tabParam = Array.isArray(searchParams?.tab)
    ? searchParams?.tab[0]
    : searchParams?.tab;
  const tab: 'mine' | 'received' =
    tabParam === 'received' && isExpert ? 'received' : 'mine';

  // 受け側の主表示 TZ（users.timezone。未設定なら日本時間のみ）
  let myTimezone: string | null = null;
  if (isExpert) {
    try {
      const db = getDb();
      const rows = await db
        .select({ timezone: schema.users.timezone })
        .from(schema.users)
        .where(eq(schema.users.id, me.id))
        .limit(1);
      myTimezone = rows[0]?.timezone ?? null;
    } catch {
      myTimezone = null;
    }
  }

  const [mine, received] = await Promise.all([
    listMyBookings(me.id),
    isExpert ? listReceivedBookings(me.id) : Promise.resolve([]),
  ]);

  const toCard = (b: BookingView): BookingCardData => ({
    id: b.id,
    displayStatus: b.displayStatus,
    startIso: b.startAt.toISOString(),
    endIso: b.endAt.toISOString(),
    serviceTitle: b.serviceTitle,
    priceJpy: b.priceJpy,
    requestMessage: b.requestMessage,
    chatThreadId: b.chatThreadId,
    meetUrl: b.meetUrl,
    counterpartId: b.counterpart.id,
    counterpartName: b.counterpart.displayName,
    counterpartAvatarUrl: b.counterpart.avatarUrl,
    counterpartFlag: countryFlagEmoji(b.counterpart.countryCode),
    counterpartCity: b.counterpart.cityName,
  });

  const rows = tab === 'mine' ? mine : received;

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-[760px] px-6 pb-20 pt-9">
        <h1 className="text-[21px] font-bold">マイ相談</h1>

        {/* tabs */}
        <nav className="mt-4 flex gap-6 border-b border-border text-[14px]">
          <TabLink href="/bookings" active={tab === 'mine'} count={mine.length}>
            依頼した相談
          </TabLink>
          {isExpert ? (
            <TabLink
              href="/bookings?tab=received"
              active={tab === 'received'}
              count={received.length}
            >
              受けたリクエスト
            </TabLink>
          ) : null}
        </nav>

        {rows.length === 0 ? (
          tab === 'mine' ? (
            <EmptyState
              emoji="🧭"
              title="まだ相談の予定はありません"
              body="気になる街に住んでいるエキスパートを見つけて、空き枠からリクエストしてみましょう。"
              ctaHref="/experts"
              ctaLabel="エキスパートを探す"
            />
          ) : (
            <EmptyState
              emoji="🗓️"
              title="空き時間を登録すると、リクエストが届きます"
              body="空き枠がないあいだ、あなたのページには予約ボタンが表示されません。まずは週1枠から。"
              ctaHref="/settings/availability"
              ctaLabel="空き時間を登録する"
            />
          )
        ) : (
          <div>
            {rows.map((b) => (
              <BookingCard
                key={b.id}
                side={tab}
                viewerTz={tab === 'received' ? myTimezone : null}
                booking={toCard(b)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function TabLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={
        '-mb-px inline-flex items-center gap-1.5 border-b-2 px-0.5 pb-2.5 transition ' +
        (active
          ? 'border-primary-500 font-bold text-foreground'
          : 'border-transparent font-medium text-neutral-500 hover:text-foreground')
      }
    >
      {children}
      <span
        className={
          'rounded-full px-2 py-px text-[11px] font-semibold tabular-nums ' +
          (active
            ? 'bg-primary-100 text-primary-900'
            : 'bg-muted text-neutral-500')
        }
      >
        {count}
      </span>
    </Link>
  );
}

function EmptyState({
  emoji,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  emoji: string;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="px-7 py-12 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-primary-100 bg-primary-50 text-[26px]">
        {emoji}
      </span>
      <b className="mt-3.5 block text-[15px]">{title}</b>
      <p className="mx-auto mt-1.5 max-w-[30em] text-[12.5px] leading-relaxed text-neutral-500">
        {body}
      </p>
      <Link
        href={ctaHref}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-500 px-[26px] py-2.5 text-[13.5px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
