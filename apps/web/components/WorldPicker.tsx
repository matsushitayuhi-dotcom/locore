import Link from 'next/link';
import Image from 'next/image';
import { Lock, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import type { CountryListItem } from '@/lib/geo/countries';

/**
 * 世界ピッカー v2 — Airbnb／Booking 風の画像ファーストレイアウト。
 *
 * 構成:
 *   1. Hero band（タイトル + サブコピー、背景に大きい blob 系装飾）
 *   2. 「今すぐ旅できる」セクション — active 国を大判カードで横並び
 *   3. 「もうすぐ会える街」 — coming_soon 国を大陸ごとに中判で
 *
 * 操作モデル:
 *   - active 国カード → /country/<code>（その国の地域一覧へ）
 *   - locked 国カード → クリックでは何も起きない（カードに「準備中」を明示）
 *
 * 画像:
 *   - countries.hero_image_url を使用（Unsplash 安定 URL を seed しておく）
 *   - 無ければ picsum フォールバック
 */

const CONTINENT_LABEL: Record<string, { label: string; order: number }> = {
  europe: { label: 'ヨーロッパ', order: 1 },
  asia: { label: 'アジア', order: 2 },
  north_america: { label: '北米', order: 3 },
  oceania: { label: 'オセアニア', order: 4 },
  south_america: { label: '南米', order: 5 },
  middle_east_africa: { label: '中東・アフリカ', order: 6 },
};

function fallbackImage(slug: string): string {
  return `https://picsum.photos/seed/${slug}/1200/800`;
}

export function WorldPicker({ countries }: { countries: CountryListItem[] }) {
  if (countries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center text-[13px] text-foreground/55">
        国マスタが空です。マイグレーション 0029 / 0030 を Supabase で実行してください。
      </div>
    );
  }

  const active = countries.filter((c) => c.status === 'active');
  const coming = countries.filter((c) => c.status === 'coming_soon');

  // 大陸ごとにグルーピング（coming_soon のみ）
  const byContinent = new Map<string, CountryListItem[]>();
  for (const c of coming) {
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
    <div className="space-y-14">
      {/* 1. 「今すぐ旅できる」 — 大判 hero カード */}
      <section>
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
              <Sparkles className="h-3 w-3" />
              いま読める
            </p>
            <h2
              className="mt-2 text-[24px] font-bold leading-tight tracking-tight sm:text-[28px]"
            >
              この国には、書き手がいます
            </h2>
            <p className="mt-1 text-[13px] text-foreground/65">
              タップで、その国の地域一覧へ。地域を選ぶと、現地ライターの記事が並びます。
            </p>
          </div>
        </header>

        {active.length === 0 ? (
          <p className="rounded-lg bg-card px-4 py-6 text-center text-[13px] text-foreground/55 ring-1 ring-border">
            準備中です
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((c) => (
              <ActiveCountryCard key={c.code} country={c} />
            ))}
          </div>
        )}
      </section>

      {/* 2. 「これから開く街」 — 大陸ごと */}
      {continents.map(([continent, list]) => (
        <section key={continent}>
          <header className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[14px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              {CONTINENT_LABEL[continent]?.label ?? continent}
            </h2>
            <span className="text-[10px] text-foreground/40">
              {list.length} カ国・準備中
            </span>
          </header>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {list.map((c) => (
              <li key={c.code}>
                <ComingSoonCard country={c} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Active 国カード — 大判、画像メイン、CTA 強調。
 * クリックで /country/<code> へ。
 */
function ActiveCountryCard({ country }: { country: CountryListItem }) {
  return (
    <Link
      href={`/country/${country.code}`}
      className="group relative block overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border transition hover:shadow-md hover:ring-primary-300"
    >
      <div className="relative aspect-[5/4] w-full overflow-hidden bg-muted">
        <Image
          src={country.heroImageUrl ?? fallbackImage(country.code)}
          alt={country.nameJa}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-[1.04]"
          unoptimized
        />
        {/* 写真全体にフラット tint + 加工なしの白文字 */}
        <div aria-hidden className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-300">
            {country.nameEn}
          </p>
          <h3
            className="!text-white mt-1 text-[26px] font-bold leading-tight tracking-tight"
          >
            {country.nameJa}
          </h3>
          {country.shortDescription ? (
            <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-white/85">
              {country.shortDescription}
            </p>
          ) : null}
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] text-white/85">
              <MapPin className="h-3 w-3" />
              {country.activeRegionCount} 地域で公開中
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-500 px-3 py-1 text-[11px] font-bold text-neutral-950 transition group-hover:bg-primary-300">
              旅する
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * Coming Soon カード — タイル全体をグレーアウト（フルグレースケール画像 +
 * 灰色オーバーレイ + 文字も muted）。タップ不可。
 */
function ComingSoonCard({ country }: { country: CountryListItem }) {
  return (
    <div
      aria-disabled
      title="準備中"
      className="group relative block cursor-not-allowed overflow-hidden rounded-xl bg-neutral-100 opacity-70 ring-1 ring-border"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        <Image
          src={country.heroImageUrl ?? fallbackImage(country.code)}
          alt={country.nameJa}
          fill
          sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover grayscale"
          unoptimized
        />
        {/* タイル全体に灰色 wash */}
        <div
          aria-hidden
          className="absolute inset-0 bg-neutral-100/45"
        />
        {/* Lock バッジ */}
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-neutral-50/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/55 backdrop-blur">
          <Lock className="h-2.5 w-2.5" />
          準備中
        </span>
        {/* Coming Soon カードも同様にフラット tint */}
        <div aria-hidden className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-x-0 bottom-0 p-3 text-white/95">
          <h3
            className="!text-white truncate text-[14px] font-bold leading-tight tracking-tight"
          >
            {country.nameJa}
          </h3>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/55">
            {country.nameEn}
          </p>
        </div>
      </div>
    </div>
  );
}
