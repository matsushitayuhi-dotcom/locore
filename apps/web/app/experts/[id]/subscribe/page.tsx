import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Repeat } from 'lucide-react';
import { and, eq, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { countryFlagEmoji } from '@/lib/experts/list';
import { CONSULTATION_TAG } from '@/lib/experts/constants';
import { isProfilePublished } from '@/lib/experts/completeness';
import { SubscribeForm } from './SubscribeForm';

export const metadata = {
  title: '継続プランに申し込む',
};

export const dynamic = 'force-dynamic';

const uuidPat =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * /experts/[id]/subscribe?service= — 継続プラン（伴走）申し込みページ（0083）。
 *
 * 1 カラム 1 本道: プラン概要 → メッセージ（必須）→ applyToPlan → /bookings。
 * 枠選択なし（セッションは承諾後にプラン内予約で取る）。要ログイン。
 */
export default async function PlanSubscribePage({
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

  const me = await requireUser(
    `/experts/${params.id}/subscribe?service=${serviceId}`,
  );
  if (me.id === params.id) redirect(`/experts/${params.id}`);

  const db = getDb();
  const svcRows = await db
    .select({
      id: schema.userServices.id,
      title: schema.userServices.title,
      description: schema.userServices.description,
      priceJpy: schema.userServices.priceJpy,
      sessionsPerMonth: schema.userServices.sessionsPerMonth,
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
        eq(schema.userServices.planKind, 'monthly'),
        sql`${schema.userServices.tags} && ARRAY[${CONSULTATION_TAG}]::text[]`,
      ),
    )
    .limit(1);
  const plan = svcRows[0];
  if (
    !plan ||
    plan.priceJpy == null ||
    plan.sessionsPerMonth == null ||
    plan.durationMinutes == null
  ) {
    redirect(`/experts/${params.id}`);
  }
  // 公開関門（0084）: 未公開エキスパートへの直 URL 申込を塞ぐ
  if (!(await isProfilePublished(params.id))) {
    redirect(`/experts/${params.id}`);
  }

  const flag = countryFlagEmoji(plan.ownerCountry);

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-[640px] px-6 pb-16 pt-8">
        <Link
          href={`/experts/${params.id}`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-neutral-500 hover:text-primary-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {plan.ownerName}さんのページに戻る
        </Link>
        <h1 className="mt-3 text-[20px] font-bold">継続プランに申し込む</h1>
        <p className="mt-1 text-[12.5px] text-neutral-500">
          メッセージを添えて送信すると、{plan.ownerName}
          さんに承諾の依頼が届きます。承諾後、月{plan.sessionsPerMonth}
          回のセッションを空き枠から予約できます。
        </p>

        {/* プラン概要 */}
        <div className="mt-[18px] rounded-2xl border border-primary-200 bg-card px-[18px] py-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            {plan.ownerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={plan.ownerAvatarUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-100 text-[16px] font-bold text-primary-900">
                {plan.ownerName.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <b className="block text-[14.5px] font-bold">{plan.title}</b>
              <span className="text-[11.5px] text-neutral-500">
                {plan.ownerName}
                {plan.ownerCity
                  ? ` ・ ${flag ? `${flag} ` : ''}${plan.ownerCity}`
                  : ''}
              </span>
            </div>
            <div className="ml-auto text-right leading-snug">
              <b className="block text-[19px] font-bold tabular-nums">
                ¥{plan.priceJpy.toLocaleString('ja-JP')}
              </b>
              <span className="text-[10.5px] text-neutral-500">/ 月・税込</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[12px] text-neutral-700">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 font-bold text-primary-900">
              <Repeat className="h-3 w-3 text-primary-700" aria-hidden />
              月{plan.sessionsPerMonth}回 × {plan.durationMinutes}分
            </span>
            <span className="text-neutral-500">
              チャットでの質問はいつでも（回数無制限）
            </span>
          </div>
          {plan.description ? (
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-neutral-500">
              {plan.description}
            </p>
          ) : null}
        </div>

        <SubscribeForm
          serviceId={plan.id}
          planTitle={plan.title}
          expertName={plan.ownerName}
        />
      </div>
    </main>
  );
}
