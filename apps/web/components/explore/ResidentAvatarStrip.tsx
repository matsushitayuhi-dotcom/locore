import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { ArrowRight, MapPin } from 'lucide-react';
import type { FeaturedResident } from '@/lib/residents/featured';

/**
 * /explore ホーム用「現地に住む人たち」カルーセル。
 *
 * - 横スクロール、駐在員アバター + 名前 + 都市 + 在住年数 + occupation
 * - 末尾に「すべて見る」カード → /residents
 *
 * Locore の他サービスとの最大の差別化要素 = 「顔出しの実在駐在員」 を
 * ホームのファーストビュー級の高さで見せるのが狙い。
 */
function residencyYears(arrivalYear: number | null | undefined): string | null {
  if (!arrivalYear) return null;
  const now = new Date().getFullYear();
  const y = now - arrivalYear;
  if (y <= 0) return '在住 1 年目';
  return `在住 ${y} 年`;
}

export function ResidentAvatarStrip({
  residents,
}: {
  residents: FeaturedResident[];
}) {
  if (residents.length === 0) return null;
  return (
    <ul
      className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      style={{ touchAction: 'pan-x' }}
      aria-label="駐在員ピックアップ"
    >
      {residents.map((r) => {
        const years = residencyYears(r.arrivalYear);
        const tierLabel =
          r.tier === 'S'
            ? 'Tier S'
            : r.tier === 'A'
              ? 'Tier A'
              : null;
        return (
          <li key={r.id} className="shrink-0 snap-start">
            <Link
              href={`/users/${r.id}`}
              className="flex h-full w-[200px] flex-col items-center rounded-2xl bg-card px-4 py-5 text-center ring-1 ring-border transition hover:bg-primary-500/5 hover:ring-primary-300"
            >
              <Avatar size="lg" className="h-20 w-20 shrink-0">
                {r.avatarUrl ? (
                  <AvatarImage src={r.avatarUrl} alt={r.displayName} />
                ) : null}
                <AvatarFallback>
                  {r.displayName?.[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <p className="mt-3 line-clamp-1 text-[14px] font-bold tracking-tight">
                {r.displayName}
              </p>
              {r.residencyCity || r.residencyCountry ? (
                <p className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-foreground/60">
                  <MapPin className="h-2.5 w-2.5" />
                  {r.residencyCity ?? r.residencyCountry}
                </p>
              ) : null}
              {years ? (
                <p className="mt-0.5 text-[10px] tabular text-foreground/45">
                  {years}
                </p>
              ) : null}
              {r.occupation ? (
                <p className="mt-2 line-clamp-2 text-[11px] leading-[1.5] text-foreground/65">
                  {r.occupation}
                </p>
              ) : null}
              {tierLabel ? (
                <span className="mt-2 inline-flex items-center rounded-full bg-primary-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary-300">
                  {tierLabel}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
      {/* 末尾「すべて見る」カード */}
      <li className="shrink-0 snap-start">
        <Link
          href="/users"
          aria-label="駐在員をすべて見る"
          className="flex h-full w-[140px] flex-col items-center justify-center rounded-2xl bg-primary-500/10 px-4 py-5 text-center text-primary-300 ring-1 ring-primary-300/30 transition hover:bg-primary-500/15"
        >
          <ArrowRight className="h-5 w-5" />
          <span className="mt-2 text-[12px] font-bold">すべて見る</span>
        </Link>
      </li>
    </ul>
  );
}
