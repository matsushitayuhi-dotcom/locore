import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { and, eq, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { listOpenStartTimes } from '@/lib/bookings/availability';
import { countryFlagEmoji } from '@/lib/experts/list';
import { CONSULTATION_TAG } from '@/lib/experts/constants';
import { RequestForm } from './RequestForm';

export const metadata = {
  title: '予約リクエスト',
};

export const dynamic = 'force-dynamic';

const uuidPat =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * /experts/[id]/request?service= — 予約リクエストページ（booking-slice モック 3/5）。
 *
 * 1カラム1本道: メニュー確認 → 開始時刻チップ（すべて日本時間）→ 相談内容 →
 * サマリー復唱 → 送信 → /bookings。要ログイン。
 */
export default async function BookingRequestPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { service?: string | string[] };
}) {
  if (!uuidPat.test(params.id)) return notFound();
  const serviceId = Array.isArray(searchParams?.service)
    ? searchParams?.service[0]
    : searchParams?.service;
  if (!serviceId || !uuidPat.test(serviceId)) {
    redirect(`/experts/${params.id}`);
  }

  // ログイン後に選択中メニューへ戻れるよう service クエリごと redirect_to に含める
  const me = await requireUser(
    `/experts/${params.id}/request?service=${serviceId}`,
  );
  if (me.id === params.id) redirect(`/experts/${params.id}`);

  const db = getDb();
  const svcRows = await db
    .select({
      id: schema.userServices.id,
      title: schema.userServices.title,
      priceJpy: schema.userServices.priceJpy,
      priceUnit: schema.userServices.priceUnit,
      durationMinutes: schema.userServices.durationMinutes,
      ownerName: schema.users.displayName,
      ownerAvatarUrl: schema.users.avatarUrl,
      ownerCountry: schema.users.residencyCountry,
      ownerCity: schema.users.residencyCity,
    })
    .from(schema.userServices)
    .innerJoin(schema.users, eq(schema.users.id, schema.userServices.userId))
    .where(
      and(
        eq(schema.userServices.id, serviceId),
        eq(schema.userServices.userId, params.id),
        eq(schema.userServices.isActive, true),
        // 外部サイト申し込みのメニューは内部予約の対象外（requestBooking と同一ルール）
        eq(schema.userServices.contactMethod, 'chat'),
        sql`${schema.userServices.tags} && ARRAY[${CONSULTATION_TAG}]::text[]`,
      ),
    )
    .limit(1);
  const service = svcRows[0];
  if (!service) redirect(`/experts/${params.id}`);

  // 所要時間・価格が確定していないメニューは予約不可（チャットで相談のフロー。
  // 30 分フォールバックは実所要より短くカレンダーを塞ぎ二重予約を生むため廃止）
  if (service.durationMinutes == null || service.priceJpy == null) {
    redirect(`/experts/${params.id}`);
  }
  const duration = service.durationMinutes;

  // 週グリッド（booking-slice モック 3/5）は client 側で曜日×時刻に組み立てる
  const openStarts = await listOpenStartTimes(params.id, duration);
  const slotIsos = openStarts.map((d) => d.toISOString());

  const flag = countryFlagEmoji(service.ownerCountry);

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-[640px] px-6 pb-16 pt-8">
        <Link
          href={`/experts/${params.id}`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-neutral-500 hover:text-primary-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {service.ownerName}さんのページに戻る
        </Link>
        <h1 className="mt-3 text-[20px] font-bold">予約リクエスト</h1>
        <p className="mt-1 text-[12.5px] text-neutral-500">
          希望の枠を選んで送信すると、エキスパートに承諾の依頼が届きます。
        </p>

        {/* メニュー概要 */}
        <div className="mt-[18px] flex items-center gap-3.5 rounded-2xl border border-border bg-muted px-[18px] py-3.5">
          {service.ownerAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={service.ownerAvatarUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-100 text-[16px] font-bold text-primary-900">
              {service.ownerName.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <b className="block text-[14.5px] font-bold">{service.title}</b>
            <span className="text-[11.5px] text-neutral-500">
              {service.ownerName}
              {service.ownerCity ? ` ・ ${flag ? `${flag} ` : ''}${service.ownerCity}` : ''}
            </span>
          </div>
          <div className="ml-auto text-right leading-snug">
            <b className="block text-[19px] font-bold tabular-nums">
              {service.priceJpy != null
                ? `¥${service.priceJpy.toLocaleString('ja-JP')}`
                : '応相談'}
            </b>
            <span className="text-[10.5px] text-neutral-500">
              / {service.priceUnit ?? `${duration}分`}
            </span>
          </div>
        </div>

        {slotIsos.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border-strong bg-muted px-6 py-10 text-center text-[13px] text-neutral-500">
            いま選べる空き枠がありません。
            <br />
            チャットで相談内容と日程をすり合わせてください。
            <div className="mt-4">
              <Link
                href={`/experts/${params.id}`}
                className="inline-flex rounded-full border border-border-strong bg-card px-5 py-2 text-[13.5px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground"
              >
                エキスパートのページに戻る
              </Link>
            </div>
          </div>
        ) : (
          <RequestForm
            serviceId={service.id}
            serviceTitle={service.title}
            expertName={service.ownerName}
            priceJpy={service.priceJpy}
            durationMinutes={duration}
            slotIsos={slotIsos}
          />
        )}
      </div>
    </main>
  );
}
