import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { BadgeCheck, MapPin, Calendar, Home as HomeIcon } from 'lucide-react';
import {
  RESIDENCE_COUNTRY_BY_CODE,
  residenceYearsLabel,
} from '@/lib/resident/masters';
import type { ResidentProfileBundle } from '@/lib/residents/byId';

/**
 * /residents/[id] のハブ ヘッダー (Hero)。
 *
 * - Avatar (大) + 表示名
 * - 在住都市・在住年数
 * - 在住確認バッジ (residency_verifications.status='approved')
 * - writer_profiles.tier (S/A/B)
 *
 * タブ内で再利用される情報 (bio や言語など) はタブ本体側で出すため、
 * ここはあくまで Hero に集中させる。
 */

type Props = {
  resident: ResidentProfileBundle;
};

const TIER_LABEL: Record<'S' | 'A' | 'B', string> = {
  S: '駐在員 S',
  A: '駐在員 A',
  B: '駐在員 B',
};

export function ResidentHeader({ resident: r }: Props) {
  const countryLabel = r.residencyCountry
    ? RESIDENCE_COUNTRY_BY_CODE[r.residencyCountry] ?? r.residencyCountry
    : null;
  const yearsLabel =
    r.writerResidencyYears != null && r.writerResidencyYears > 0
      ? `在住 ${r.writerResidencyYears} 年`
      : residenceYearsLabel(r.arrivalYear);

  return (
    <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      <div className="relative h-28 bg-gradient-to-br from-primary-500/40 via-primary-300/20 to-card sm:h-36">
        <div className="absolute inset-x-6 -bottom-12 sm:inset-x-8">
          <Avatar
            size="xl"
            className="ring-4 ring-card"
            style={{ height: 112, width: 112 }}
          >
            {r.avatarUrl ? <AvatarImage src={r.avatarUrl} alt="" /> : null}
            <AvatarFallback>
              {r.displayName[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="px-6 pb-6 pt-16 sm:px-8 sm:pb-8">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">
            {r.displayName}
          </h1>
          {r.isVerified ? (
            <span
              title="在住確認済み"
              aria-label="在住確認済み"
              className="inline-flex items-center gap-1 rounded-full bg-success-500/10 px-2 py-0.5 text-[10px] font-bold text-success-500 ring-1 ring-success-500/30"
            >
              <BadgeCheck
                className="h-3.5 w-3.5"
                fill="currentColor"
                stroke="white"
                strokeWidth={2}
              />
              <span>在住確認済み</span>
            </span>
          ) : null}
          {r.tier ? (
            <span
              title={`tier ${r.tier}`}
              className="inline-flex items-center rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300"
            >
              {TIER_LABEL[r.tier]}
            </span>
          ) : null}
        </div>

        {/* メタ行 (在住都市 / 在住年数 / 出身) */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-foreground/65">
          {countryLabel || r.residencyCity ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {r.residencyCity ?? ''}
              {r.residencyCity && countryLabel ? '、' : ''}
              {countryLabel ?? ''}
            </span>
          ) : null}
          {yearsLabel ? (
            <span className="inline-flex items-center gap-1 tabular">
              <Calendar className="h-3.5 w-3.5" />
              {yearsLabel}
            </span>
          ) : null}
          {r.homeRegion ? (
            <span className="inline-flex items-center gap-1">
              <HomeIcon className="h-3.5 w-3.5" />
              出身: {r.homeRegion}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
