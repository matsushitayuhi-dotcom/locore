import Link from 'next/link';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import type { CountryListItem } from '@/lib/geo/countries';

const CONTINENT_LABEL: Record<string, { label: string; order: number }> = {
  europe: { label: 'ヨーロッパ', order: 1 },
  asia: { label: 'アジア', order: 2 },
  north_america: { label: '北米', order: 3 },
  oceania: { label: 'オセアニア', order: 4 },
  south_america: { label: '南米', order: 5 },
  middle_east_africa: { label: '中東・アフリカ', order: 6 },
};

/**
 * 世界ピッカー — 大陸ごとに国カードを並べる。
 *
 * - status='active' な国はクリックで `/region/<primaryRegionSlug>` に遷移
 * - status='coming_soon' は薄く + Lock アイコン、クリック不可
 * - レイアウト: モバイル 2 列、sm 3 列、md 4 列、lg 5 列
 */
export function WorldPicker({ countries }: { countries: CountryListItem[] }) {
  if (countries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center text-[13px] text-foreground/55">
        国マスタが空です。マイグレーション 0029 を適用してください。
      </div>
    );
  }

  const byContinent = new Map<string, CountryListItem[]>();
  for (const c of countries) {
    const arr = byContinent.get(c.continent) ?? [];
    arr.push(c);
    byContinent.set(c.continent, arr);
  }

  const continents = Array.from(byContinent.entries()).sort(
    (a, b) =>
      (CONTINENT_LABEL[a[0]]?.order ?? 99) -
      (CONTINENT_LABEL[b[0]]?.order ?? 99),
  );

  return (
    <div className="space-y-10">
      {continents.map(([continent, list]) => (
        <section key={continent}>
          <h2 className="mb-3 text-[14px] font-bold uppercase tracking-[0.18em] text-foreground/55">
            {CONTINENT_LABEL[continent]?.label ?? continent}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {list.map((c) => (
              <li key={c.code}>
                <CountryCard country={c} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CountryCard({ country }: { country: CountryListItem }) {
  const active = country.status === 'active' && !!country.primaryRegionSlug;
  const inner = (
    <div
      className={
        'relative flex h-full flex-col items-start justify-between gap-2 rounded-xl bg-card p-4 ring-1 ring-border transition ' +
        (active
          ? 'hover:bg-primary-500/10 hover:ring-primary-300 cursor-pointer'
          : 'opacity-70 cursor-not-allowed')
      }
    >
      <div>
        <p className="text-[28px] leading-none">{country.emoji ?? '🌐'}</p>
        <p className="mt-2 text-[15px] font-bold leading-tight tracking-tight text-foreground">
          {country.nameJa}
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-foreground/45">
          {country.code}
        </p>
        {country.shortDescription ? (
          <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-foreground/65">
            {country.shortDescription}
          </p>
        ) : null}
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold">
        {active ? (
          <span className="inline-flex items-center gap-1 text-primary-300">
            <Sparkles className="h-3 w-3" />
            旅する
            <ArrowRight className="h-3 w-3" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-foreground/45">
            <Lock className="h-3 w-3" />
            Coming Soon
          </span>
        )}
      </div>
    </div>
  );

  if (active) {
    return (
      <Link href={`/region/${country.primaryRegionSlug}`} className="block h-full">
        {inner}
      </Link>
    );
  }
  return (
    <div aria-disabled className="block h-full">
      {inner}
    </div>
  );
}
