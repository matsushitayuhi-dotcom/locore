import type { FeaturedService } from '@/lib/services/featured';
import { ServiceInquiryButton } from '@/components/services/ServiceInquiryButton';

/**
 * /experts/[id] の相談メニューカード。
 * mockups/v2/expert-detail.html の .menu を再現（テラコッタトークン）。
 * CTA は既存の ServiceInquiryButton（チャットスレッド開始）を文言・配色差し替えで使う。
 */
export function ConsultMenuCard({
  service,
  ownerName,
  viewerUserId,
  expertId,
  recommended = false,
}: {
  service: FeaturedService;
  ownerName: string;
  viewerUserId: string | null;
  expertId: string;
  recommended?: boolean;
}) {
  return (
    <div
      className={
        'rounded-2xl border bg-card p-[22px] transition ' +
        (recommended
          ? 'border-primary-200 shadow-md'
          : 'border-border shadow-xs')
      }
    >
      <div className="flex items-baseline gap-2">
        <b className="text-[15.5px] font-bold text-foreground">{service.title}</b>
        {recommended ? (
          <span className="ml-auto rounded-full border border-primary-300 bg-primary-100 px-2.5 py-0.5 text-[10.5px] font-bold text-primary-900">
            はじめての方に
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        {service.priceJpy != null ? (
          <>
            <b className="text-[26px] font-bold tabular-nums text-foreground">
              ¥{service.priceJpy.toLocaleString()}
            </b>
            {service.priceUnit ? (
              <span className="text-[12px] text-neutral-500">
                / {service.priceUnit}
              </span>
            ) : null}
          </>
        ) : (
          <b className="text-[18px] font-bold text-neutral-700">応相談</b>
        )}
      </div>
      {service.description ? (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-neutral-500">
          {service.description}
        </p>
      ) : null}
      <div className="mt-4">
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
          buttonClassName="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-[14.5px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
        />
      </div>
    </div>
  );
}
