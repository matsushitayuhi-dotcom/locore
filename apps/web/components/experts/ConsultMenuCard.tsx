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
        'rounded-2xl border bg-white p-[22px] transition ' +
        (recommended
          ? 'border-[#EBC0AD] shadow-[0_6px_16px_rgba(24,24,27,.08)]'
          : 'border-[#E7E5E0] shadow-[0_1px_2px_rgba(24,24,27,.04)]')
      }
    >
      <div className="flex items-baseline gap-2">
        <b className="text-[15.5px] font-bold text-[#18181B]">{service.title}</b>
        {recommended ? (
          <span className="ml-auto rounded-full border border-[#F4DACE] bg-[#FAF1ED] px-2.5 py-0.5 text-[10.5px] font-bold text-[#A84A35]">
            はじめての方に
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        {service.priceJpy != null ? (
          <>
            <b className="text-[26px] font-bold tabular-nums text-[#18181B]">
              ¥{service.priceJpy.toLocaleString()}
            </b>
            {service.priceUnit ? (
              <span className="text-[12px] text-[#71717A]">
                / {service.priceUnit}
              </span>
            ) : null}
          </>
        ) : (
          <b className="text-[18px] font-bold text-[#3F3F46]">応相談</b>
        )}
      </div>
      {service.description ? (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#71717A]">
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
          buttonClassName="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D4634A] px-6 py-3 text-[14.5px] font-bold text-white shadow-[0_2px_6px_rgba(24,24,27,.06)] transition hover:bg-[#A84A35]"
        />
      </div>
    </div>
  );
}
