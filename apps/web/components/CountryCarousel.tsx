import Link from 'next/link';
import Image from 'next/image';
import { Lock } from 'lucide-react';
import type { CountryListItem } from '@/lib/geo/countries';

/**
 * トップページ用、国を 1 行で流すカルーセル。
 *
 * - active 国 → /country/<code> へ
 * - coming_soon 国 → タイル全体グレーアウト、タップ不可
 * - モバイルは横スクロール、PC は 5〜7 列のグリッド
 */

function fallbackImage(slug: string): string {
  return `https://picsum.photos/seed/${slug}/600/800`;
}

export function CountryCarousel({ countries }: { countries: CountryListItem[] }) {
  if (countries.length === 0) return null;
  return (
    <div
      className={
        'flex snap-x snap-mandatory gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-thin ' +
        'sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 ' +
        'md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
      }
    >
      {countries.map((c) => (
        <div
          key={c.code}
          className="w-[34vw] shrink-0 snap-start sm:w-auto sm:shrink"
        >
          <CountryTile country={c} />
        </div>
      ))}
    </div>
  );
}

function CountryTile({ country }: { country: CountryListItem }) {
  const active = country.status === 'active';

  const inner = (
    <div
      className={
        'group relative h-full overflow-hidden rounded-xl ring-1 transition ' +
        (active
          ? 'bg-card ring-border hover:shadow-md hover:ring-primary-300'
          : 'cursor-not-allowed bg-neutral-100 opacity-70 ring-border')
      }
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        <Image
          src={country.heroImageUrl ?? fallbackImage(country.code)}
          alt={country.nameJa}
          fill
          sizes="(min-width: 1280px) 14vw, (min-width: 640px) 20vw, 34vw"
          className={
            'object-cover transition duration-500 ' +
            (active ? 'group-hover:scale-[1.04]' : 'grayscale')
          }
          unoptimized
        />
        {!active ? (
          <div aria-hidden className="absolute inset-0 bg-neutral-100/45" />
        ) : null}
        <div
          aria-hidden
          className={
            'absolute inset-0 ' +
            (active
              ? 'bg-gradient-to-t from-neutral-900/85 via-neutral-900/30 to-transparent'
              : 'bg-gradient-to-t from-neutral-700/85 via-neutral-700/35 to-transparent')
          }
        />
        {!active ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-neutral-50/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/55 backdrop-blur">
            <Lock className="h-2.5 w-2.5" />
            準備中
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/70">
            {country.nameEn}
          </p>
          <h3
            className="mt-0.5 text-[15px] font-bold leading-tight tracking-tight sm:text-[16px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            {country.nameJa}
          </h3>
        </div>
      </div>
    </div>
  );

  if (!active) {
    return (
      <div aria-disabled title="準備中" className="block h-full">
        {inner}
      </div>
    );
  }
  return (
    <Link href={`/country/${country.code}`} className="block h-full">
      {inner}
    </Link>
  );
}
