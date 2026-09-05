import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { FeaturedService } from '@/lib/services/featured';
import { ServiceInquiryButton } from '@/components/services/ServiceInquiryButton';

/**
 * /experts/[id] の相談メニューカード（Intro 型: 左上に黒タブ、枠線 1px、角丸小さめ）。
 * mockups/v2/expert-detail-intro.html の .bk を実装。
 *
 * variant='primary'（最安 = はじめての方に）: ライムのタブ + 大きな料金 + 直近の空き +
 *   [チャット][空き枠を選ぶ] の 2 分割 CTA。
 * variant='secondary'（60 分など）: 黒タブ + 小さめの料金 + アウトラインの「空き枠を選ぶ」。
 *
 * 空き枠が無い（requestHref=null）ときは、どちらもチャットが主 CTA（従来どおり）。
 */
export function ConsultMenuCard({
  service,
  ownerName,
  viewerUserId,
  expertId,
  variant = 'secondary',
  tabLabel,
  requestHref = null,
  nextSlotLabel = null,
}: {
  service: FeaturedService;
  ownerName: string;
  viewerUserId: string | null;
  expertId: string;
  variant?: 'primary' | 'secondary';
  /** 左上の黒タブの文言。未指定は所要時間 or「相談メニュー」 */
  tabLabel?: string;
  /** 空き枠がある場合の予約リクエストページ URL。null = チャット CTA のみ */
  requestHref?: string | null;
  /** 直近の空き枠（日本時間の整形済み文字列）。primary のときだけ表示 */
  nextSlotLabel?: string | null;
}) {
  const primary = variant === 'primary';
  const chatCls =
    'inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-4 text-[14px] font-bold transition ';

  return (
    <div className="relative rounded-[6px] border border-neutral-900 bg-card px-4 pb-[18px] pt-[26px]">
      <span
        className={
          'absolute -left-px -top-[14px] rounded-[4px_4px_4px_0] px-3 py-1 text-[12.5px] font-bold ' +
          (primary ? 'bg-primary-500 text-neutral-950' : 'bg-neutral-900 text-white')
        }
      >
        {tabLabel ?? (service.priceUnit ? `${service.priceUnit}` : '相談メニュー')}
      </span>

      <h3
        className={
          'mt-1 font-semibold leading-[1.35] text-foreground ' +
          (primary ? 'text-[21px]' : 'text-[18px]')
        }
      >
        {service.title}
      </h3>
      {service.description ? (
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-neutral-700">
          {service.description}
        </p>
      ) : null}

      <div className="mt-4 flex items-baseline gap-2">
        {service.priceJpy != null ? (
          <>
            <b
              className={
                'font-semibold tabular-nums text-foreground ' +
                (primary ? 'text-[24px]' : 'text-[20px]')
              }
            >
              ¥{service.priceJpy.toLocaleString()}
            </b>
            <span className="text-[12.5px] text-neutral-400">
              / {service.priceUnit ?? '1回'}
            </span>
          </>
        ) : (
          <b className="text-[18px] font-semibold text-neutral-700">応相談</b>
        )}
      </div>

      {primary ? (
        <p className="mt-0.5 text-[13px] text-neutral-700">
          直近の空き —{' '}
          {nextSlotLabel && requestHref ? (
            <Link
              href={requestHref}
              className="text-primary-700 underline underline-offset-4"
            >
              {nextSlotLabel}〜
            </Link>
          ) : (
            <span className="text-neutral-500">
              空き枠は準備中。チャットで日程をすり合わせてください
            </span>
          )}
          {nextSlotLabel && requestHref ? (
            <span className="ml-1 text-[11.5px] text-neutral-500">日本時間</span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-4">
        {requestHref && primary ? (
          <div className="grid grid-cols-[54px_1fr] gap-3">
            <ServiceInquiryButton
              serviceId={service.id}
              serviceTitle={service.title}
              ownerId={service.ownerId}
              ownerName={ownerName}
              viewerUserId={viewerUserId}
              contactMethod={service.contactMethod}
              externalUrl={service.externalUrl}
              ctaLabel=""
              redirectPath={`/experts/${expertId}`}
              buttonClassName={
                chatCls +
                'h-[54px] border border-border-strong bg-card text-neutral-700 hover:border-foreground hover:text-foreground'
              }
            />
            <Link
              href={requestHref}
              className="grid h-[54px] place-items-center rounded-[8px] bg-primary-500 text-[16px] font-bold text-neutral-950 transition hover:bg-primary-300"
            >
              空き枠を選ぶ
            </Link>
          </div>
        ) : requestHref ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={requestHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-[18px] py-2.5 text-[13.5px] font-semibold transition hover:border-foreground"
            >
              空き枠を選ぶ
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <ServiceInquiryButton
              serviceId={service.id}
              serviceTitle={service.title}
              ownerId={service.ownerId}
              ownerName={ownerName}
              viewerUserId={viewerUserId}
              contactMethod={service.contactMethod}
              externalUrl={service.externalUrl}
              ctaLabel="チャットで相談"
              redirectPath={`/experts/${expertId}`}
              buttonClassName="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-[13px] font-semibold text-neutral-500 transition hover:text-foreground"
            />
          </div>
        ) : (
          <ServiceInquiryButton
            serviceId={service.id}
            serviceTitle={service.title}
            ownerId={service.ownerId}
            ownerName={ownerName}
            viewerUserId={viewerUserId}
            contactMethod={service.contactMethod}
            externalUrl={service.externalUrl}
            ctaLabel="チャットで相談する"
            redirectPath={`/experts/${expertId}`}
            buttonClassName={
              chatCls +
              (primary
                ? 'h-[54px] bg-primary-500 text-[16px] text-neutral-950 hover:bg-primary-300'
                : 'h-[46px] border border-border-strong bg-card text-neutral-700 hover:border-foreground hover:text-foreground')
            }
          />
        )}
      </div>
    </div>
  );
}
