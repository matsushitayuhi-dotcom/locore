import Link from 'next/link';
import { Globe, ShieldCheck } from 'lucide-react';
import type { ExpertCard as ExpertCardData } from '@/lib/experts/list';
import { countryFlagEmoji } from '@/lib/experts/list';
import { topicLabel } from '@/lib/experts/constants';

/**
 * /experts 一覧・トップの「注目エキスパート」で使うカード。
 * mockups/v2/experts-list.html の .ex カードを再現（cream/terracotta トークン）。
 */
export function ExpertCard({ expert }: { expert: ExpertCardData }) {
  const flag = countryFlagEmoji(expert.countryCode);
  return (
    <Link
      href={`/experts/${expert.userId}`}
      className="flex flex-col rounded-2xl border border-[#E7E5E0] bg-white p-[22px] shadow-[0_1px_2px_rgba(24,24,27,.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[#DD9477] hover:shadow-[0_6px_16px_rgba(24,24,27,.08)]"
    >
      <div className="flex items-center gap-3.5">
        {expert.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={expert.avatarUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#F4DACE] text-[20px] font-bold text-[#6E2F1F]">
            {expert.displayName.charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[16px] font-bold leading-tight text-[#18181B]">
            {expert.displayName}
            {expert.isVerified ? (
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#F4DACE] bg-[#FAF1ED] px-2.5 py-0.5 text-[11px] font-bold text-[#A84A35]">
                <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
                認証済み
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-[12.5px] text-[#71717A]">
            {flag ? `${flag} ` : ''}
            {expert.cityNameJa ?? '—'}在住{' '}
            {expert.yearsInCity != null ? (
              <b className="font-medium text-[#3F3F46]">
                {expert.yearsInCity}年
              </b>
            ) : null}
          </div>
        </div>
      </div>

      {expert.bio ? (
        <p className="mt-3.5 line-clamp-2 text-[13px] leading-relaxed text-[#3F3F46]">
          {expert.bio}
        </p>
      ) : null}

      {expert.topics.length > 0 ? (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {expert.topics.map((t) => (
            <span
              key={t}
              className="rounded-full bg-[#F4F2EC] px-2.5 py-1 text-[11px] font-medium text-[#3F3F46]"
            >
              {topicLabel(t)}
            </span>
          ))}
        </div>
      ) : null}

      {expert.languages.length > 0 ? (
        <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#71717A]">
          <Globe className="h-3.5 w-3.5 shrink-0 text-[#837F78]" aria-hidden />
          {expert.languages.join('・')}
        </div>
      ) : null}

      <div className="flex-1" aria-hidden />
      <div className="mt-4 flex items-baseline gap-1.5 border-t border-[#E7E5E0] pt-3.5">
        {expert.minPriceJpy != null ? (
          <>
            <span className="text-[18px] font-bold tabular-nums text-[#18181B]">
              ¥{expert.minPriceJpy.toLocaleString()}
            </span>
            <span className="text-[11.5px] text-[#71717A]">/ 30分〜</span>
          </>
        ) : (
          <span className="text-[13px] font-bold text-[#3F3F46]">応相談</span>
        )}
        <span className="ml-auto text-[11.5px] text-[#71717A]">
          メニュー{' '}
          <b className="tabular-nums text-[#3F3F46]">{expert.menuCount}</b> 件
        </span>
      </div>
    </Link>
  );
}
