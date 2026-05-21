import Link from 'next/link';
import Image from 'next/image';
import { Lock } from 'lucide-react';
import type { CountryListItem } from '@/lib/geo/countries';

/**
 * 国を大陸別にグルーピングして、タイルのグリッドで美しく見せる。
 *
 * - 大陸セクション (ヨーロッパ / アジア / アメリカ / ...) ごとに見出し
 * - レスポンシブグリッド (sm:3列 / md:4 / lg:5 / xl:6)
 * - active 国はクリックで /country/<code>、coming_soon はグレーアウト
 * - 各タイルは aspect-[3/4] の写真 + 下端に名前 (overlay)。
 *   タイル下の余計な空白は出さない (タイル = アスペクト固定の image のみ)
 */

const CONTINENT_LABEL: Record<string, string> = {
  europe: 'ヨーロッパ',
  asia: 'アジア',
  americas: 'アメリカ',
  oceania: 'オセアニア',
  middle_east: '中東',
  africa: 'アフリカ',
};

const CONTINENT_ORDER = [
  'europe',
  'asia',
  'americas',
  'oceania',
  'middle_east',
  'africa',
];

function fallbackImage(slug: string): string {
  return `https://picsum.photos/seed/${slug}/600/800`;
}

export function CountryGridByContinent({
  countries,
}: {
  countries: CountryListItem[];
}) {
  if (countries.length === 0) return null;

  const byContinent: Record<string, CountryListItem[]> = {};
  for (const c of countries) {
    const key = c.continent ?? 'other';
    (byContinent[key] ??= []).push(c);
  }

  // 既知の大陸を先頭に並べ、未知の大陸を末尾に
  const orderedKeys = [
    ...CONTINENT_ORDER.filter((k) => byContinent[k]?.length),
    ...Object.keys(byContinent).filter((k) => !CONTINENT_ORDER.includes(k)),
  ];

  return (
    <div className="space-y-10 sm:space-y-12">
      {orderedKeys.map((continent) => {
        const list = byContinent[continent];
        if (!list || list.length === 0) return null;
        // 各大陸内では active 先頭 → coming_soon 末尾。元順序は維持
        const active = list.filter((c) => c.status === 'active');
        const coming = list.filter((c) => c.status !== 'active');
        const ordered = [...active, ...coming];
        return (
          <section key={continent} aria-label={CONTINENT_LABEL[continent] ?? continent}>
            <h3 className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/55 sm:text-[13px]">
              {CONTINENT_LABEL[continent] ?? continent}
            </h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {ordered.map((c) => (
                <li key={c.code}>
                  <CountryTile country={c} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function CountryTile({ country }: { country: CountryListItem }) {
  const active = country.status === 'active';

  const inner = (
    <div
      className={
        'group relative block overflow-hidden rounded-xl ring-1 transition ' +
        (active
          ? 'ring-border hover:shadow-md hover:ring-primary-300'
          : 'cursor-not-allowed ring-border opacity-70')
      }
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        <Image
          src={country.heroImageUrl ?? fallbackImage(country.code)}
          alt={country.nameJa}
          fill
          sizes="(min-width: 1280px) 14vw, (min-width: 1024px) 18vw, (min-width: 768px) 23vw, (min-width: 640px) 30vw, 45vw"
          className={
            'object-cover transition duration-500 ' +
            (active ? 'group-hover:scale-[1.04]' : 'grayscale')
          }
          unoptimized
        />
        {/* 写真全体に薄暗 tint。文字は加工なしの白で乗せる (h1/h3 等は
            globals.css の h color が直接効くので !text-white で override) */}
        <div
          aria-hidden
          className={
            'absolute inset-0 ' + (active ? 'bg-black/30' : 'bg-black/45')
          }
        />
        {!active ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-neutral-50/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/55 backdrop-blur">
            <Lock className="h-2.5 w-2.5" />
            準備中
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 px-3 py-3 text-white">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/90">
            {country.nameEn}
          </p>
          <h3
            className="!text-white mt-0.5 truncate text-[14px] font-bold leading-tight tracking-tight sm:text-[15px]"
          >
            {country.nameJa}
          </h3>
        </div>
      </div>
    </div>
  );

  if (!active) {
    return (
      <div aria-disabled title="準備中" className="block">
        {inner}
      </div>
    );
  }
  return (
    <Link href={`/country/${country.code}`} className="block">
      {inner}
    </Link>
  );
}
