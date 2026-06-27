import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  MapPin,
  Clock,
  Camera,
  Tag,
  Inbox,
} from 'lucide-react';
import { CommunityNav } from '@/components/community/CommunityNav';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { type CommunityView } from '@/components/community/ViewToggle';
import { CompactFilterBar } from '@/components/community/CompactFilterBar';
import { FilterSheet } from '@/components/community/FilterSheet';
import { PostFab } from '@/components/community/PostFab';
import { listCommunityPosts, type CommunityPostListItem } from '@/lib/community/db';
import {
  resolveCountryCode,
  SUPPORTED_COUNTRIES,
} from '@/lib/geo/countrySlug';
import { CommunityCountrySelect } from '@/components/community/CommunityCountrySelect';
import { resolveCommunityRegion } from '@/lib/community/region-filter';
import {
  MARKETPLACE_CONDITIONS,
  MARKETPLACE_CONDITION_LABEL,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CATEGORY_LABEL,
  COMMUNITY_AUDIENCES,
  type MarketplaceCondition,
  type MarketplaceCategory,
  type CommunityAudience,
} from '@/lib/community/constants';

export const revalidate = 300;

export const metadata = {
  title: '売ります・買います — Locore',
  description:
    'フランス在住の駐在員コミュニティのフリマ。帰任セール、家具家電、子供用品、自転車など。',
};

type Side = 'sell' | 'buy';
const SIDE_LABEL: Record<Side, string> = {
  sell: '売ります',
  buy: '買います',
};

type PriceBucketId = 'lt50' | '50-200' | '200-500' | 'gte500';
const PRICE_BUCKETS: Array<{
  id: PriceBucketId;
  label: string;
  min: number;
  max: number;
}> = [
  { id: 'lt50', label: '〜€50', min: 0, max: 49 },
  { id: '50-200', label: '€50〜200', min: 50, max: 200 },
  { id: '200-500', label: '€200〜500', min: 201, max: 500 },
  { id: 'gte500', label: '€500〜', min: 501, max: Number.POSITIVE_INFINITY },
];

type Props = {
  searchParams?: {
    side?: string;
    cat?: string;
    cond?: string;
    price?: string;
    region?: string;
    audience?: string;
    view?: string;
    country?: string;
  };
};

function formatPostedAt(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const h = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (h < 1) return 'たった今';
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}日前`;
  return `${Math.floor(day / 30)}ヶ月前`;
}

function formatPrice(post: CommunityPostListItem): string | null {
  if (!post.priceAmount) {
    if (post.priceUnit === 'negotiable') return '応相談';
    return null;
  }
  const currencySym = post.priceCurrency === 'JPY' ? '¥' : '€';
  const num = new Intl.NumberFormat('fr-FR').format(post.priceAmount);
  const suffix = post.priceUnit === 'negotiable' ? '（応相談）' : '';
  return `${currencySym}${num}${suffix}`;
}

export default async function MarketplaceIndexPage({ searchParams }: Props) {
  const activeSide = ((): Side | undefined => {
    if (searchParams?.side === 'sell' || searchParams?.side === 'buy') {
      return searchParams.side;
    }
    return undefined;
  })();
  const activeCat =
    searchParams?.cat &&
    (MARKETPLACE_CATEGORIES as readonly string[]).includes(searchParams.cat)
      ? (searchParams.cat as MarketplaceCategory)
      : undefined;
  const activeCond =
    searchParams?.cond &&
    (MARKETPLACE_CONDITIONS as readonly string[]).includes(searchParams.cond)
      ? (searchParams.cond as MarketplaceCondition)
      : undefined;
  const activePrice = PRICE_BUCKETS.find((b) => b.id === searchParams?.price);
  const regionFilter = await resolveCommunityRegion(searchParams?.region);
  const activeAudience: CommunityAudience | undefined =
    searchParams?.audience &&
    (COMMUNITY_AUDIENCES as readonly string[]).includes(searchParams.audience)
      ? (searchParams.audience as CommunityAudience)
      : undefined;
  const currentView: CommunityView = searchParams?.view === 'list' ? 'list' : 'card';

  const countryCode = resolveCountryCode(searchParams?.country);
  const rawPosts = await listCommunityPosts({
    kind: 'marketplace',
    limit: 30,
    cityId: regionFilter.cityId,
    countryCode,
  });

  const filtered = rawPosts.filter((p) => {
    const meta = p.metadata as {
      side?: Side;
      category?: MarketplaceCategory;
      condition?: MarketplaceCondition;
      audience?: CommunityAudience;
    };
    if (activeSide && meta.side !== activeSide) return false;
    if (activeCat && meta.category !== activeCat) return false;
    if (activeCond && meta.condition !== activeCond) return false;
    if (activePrice) {
      const amount = p.priceAmount ?? -1;
      if (amount < activePrice.min || amount > activePrice.max) return false;
    }
    if (activeAudience) {
      if (meta.audience && meta.audience !== 'both' && meta.audience !== activeAudience) {
        return false;
      }
    }
    return true;
  });

  const buildHref = (overrides: Record<string, string | undefined | null>) => {
    const params = new URLSearchParams();
    if (activeSide) params.set('side', activeSide);
    if (activeCat) params.set('cat', activeCat);
    if (activeCond) params.set('cond', activeCond);
    if (activePrice) params.set('price', activePrice.id);
    if (regionFilter.active) params.set('region', regionFilter.slug);
    if (activeAudience) params.set('audience', activeAudience);
    if (currentView !== 'card') params.set('view', currentView);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/marketplace?${qs}` : '/marketplace';
  };

  const sheetFilterCount =
    (activeSide ? 1 : 0) +
    (activeCat ? 1 : 0) +
    (activeCond ? 1 : 0) +
    (activePrice ? 1 : 0);

  return (
    <main className="mx-auto max-w-screen-lg px-4 pb-12 pt-4 sm:px-6">
      <CommunityNav active="marketplace" />

      {/* 国フィルタ */}
      <div className="mt-3">
        <CommunityCountrySelect
          current={countryCode}
          countries={SUPPORTED_COUNTRIES}
        />
      </div>

      {/* ミニフィルタバー */}
      <div className="mt-2">
        <CompactFilterBar
          basePath="/marketplace"
          activeRegionSlug={regionFilter.slug}
          activeRegionNameJa={regionFilter.nameJa}
          preserveQuery={{
            side: activeSide,
            cat: activeCat,
            cond: activeCond,
            price: activePrice?.id,
            audience: activeAudience,
            view: currentView !== 'card' ? currentView : undefined,
          }}
          activeAudience={activeAudience}
          buildAudienceHref={(a) => buildHref({ audience: a ?? null })}
          currentView={currentView}
          buildViewHref={(v) => buildHref({ view: v === 'card' ? null : v })}
          sheetTrigger={
            <FilterSheet activeCount={sheetFilterCount}>
              <form action="/marketplace" method="GET" className="space-y-4">
                {regionFilter.active ? (
                  <input type="hidden" name="region" value={regionFilter.slug} />
                ) : null}
                {activeAudience ? (
                  <input type="hidden" name="audience" value={activeAudience} />
                ) : null}
                {currentView !== 'card' ? (
                  <input type="hidden" name="view" value={currentView} />
                ) : null}

                <FilterSelect
                  name="side"
                  label="売る / 買う"
                  defaultValue={activeSide ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    { value: 'sell', label: SIDE_LABEL.sell },
                    { value: 'buy', label: SIDE_LABEL.buy },
                  ]}
                />
                <FilterSelect
                  name="cat"
                  label="カテゴリ"
                  defaultValue={activeCat ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    ...MARKETPLACE_CATEGORIES.map((c) => ({
                      value: c,
                      label: MARKETPLACE_CATEGORY_LABEL[c],
                    })),
                  ]}
                />
                <FilterSelect
                  name="cond"
                  label="状態"
                  defaultValue={activeCond ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    ...MARKETPLACE_CONDITIONS.map((c) => ({
                      value: c,
                      label: MARKETPLACE_CONDITION_LABEL[c],
                    })),
                  ]}
                />
                <FilterSelect
                  name="price"
                  label="価格帯"
                  defaultValue={activePrice?.id ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    ...PRICE_BUCKETS.map((b) => ({ value: b.id, label: b.label })),
                  ]}
                />

                <div className="sticky bottom-0 -mx-4 mt-4 flex items-center gap-2 border-t border-border bg-background px-4 pb-1 pt-3">
                  <Link
                    href={buildHref({
                      side: null,
                      cat: null,
                      cond: null,
                      price: null,
                    })}
                    className="inline-flex h-10 items-center rounded-md bg-card px-4 text-[12px] font-medium text-foreground/70 ring-1 ring-border hover:bg-muted"
                  >
                    リセット
                  </Link>
                  <button
                    type="submit"
                    className="ml-auto inline-flex h-10 items-center rounded-md bg-primary-500 px-6 text-[13px] font-bold text-neutral-950 hover:bg-primary-300"
                  >
                    適用
                  </button>
                </div>
              </form>
            </FilterSheet>
          }
        />
      </div>

      <p className="mt-4 mb-3 text-[12px] text-foreground/55 tabular">
        {filtered.length} 件
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center text-[13px] text-foreground/65">
          <Inbox className="h-8 w-8 text-foreground/35" />
          <p className="text-[14px] font-medium text-foreground/75">
            ぴったりの出品はまだ見つかりませんでした
          </p>
          <p className="text-[12px] text-foreground/55">
            条件を緩めるか、譲りたいものがあれば自分で出品してみてください。
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/marketplace"
              className="rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
            >
              条件を変えてもう一度
            </Link>
            <Link
              href="/marketplace/new"
              className="inline-flex items-center gap-1 rounded-full border-2 border-primary-700 bg-primary-700 px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition hover:border-primary-500 hover:bg-primary-500"
            >
              <Plus className="h-3 w-3" />
              投稿する
            </Link>
          </div>
        </div>
      ) : currentView === 'list' ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg bg-card ring-1 ring-border">
          {filtered.map((p) => (
            <MarketplaceListItem key={p.id} post={p} />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <MarketplaceCard key={p.id} post={p} />
          ))}
        </ul>
      )}

      <details className="mt-8 rounded-lg border border-border bg-card text-[12px] text-foreground/65">
        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-foreground/55">
          ⚠️ ご利用上の注意
        </summary>
        <div className="border-t border-border p-3">
          <CommunityDisclaimer kind="marketplace" />
        </div>
      </details>

      <PostFab href="/marketplace/new" label="投稿する" />
    </main>
  );
}

function FilterSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label
        htmlFor={`f-${name}`}
        className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-foreground/55"
      >
        {label}
      </label>
      <select
        id={`f-${name}`}
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function MarketplaceListItem({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    side?: Side;
    category?: MarketplaceCategory;
    condition?: MarketplaceCondition;
    audience?: CommunityAudience;
  };
  const price = formatPrice(post);
  const hero = post.photos?.[0];

  return (
    <li>
      <Link
        href={`/marketplace/${post.id}`}
        className="flex gap-3 p-3 transition hover:bg-primary-500/5"
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:h-28 sm:w-28">
          {hero ? (
            <Image
              src={hero}
              alt={post.title}
              fill
              sizes="128px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/30">
              <Camera className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            {meta.side ? (
              <span
                className={
                  'rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' +
                  (meta.side === 'sell'
                    ? 'bg-primary-500 text-neutral-950'
                    : 'bg-accent-500 text-neutral-950')
                }
              >
                {SIDE_LABEL[meta.side]}
              </span>
            ) : null}
            {meta.category ? (
              <span className="rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/65">
                {MARKETPLACE_CATEGORY_LABEL[meta.category]}
              </span>
            ) : null}
            {meta.condition ? (
              <span className="rounded-sm bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-300">
                {MARKETPLACE_CONDITION_LABEL[meta.condition]}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug">
            {post.title}
          </h2>
          <p className="mt-0.5 inline-flex items-baseline gap-1 text-[14px] font-bold tabular text-primary-300">
            <Tag className="h-3 w-3 self-center" />
            {price ?? '価格応相談'}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-foreground/50">
            {post.locationText ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" />
                {post.locationText}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {formatPostedAt(post.createdAt)}
            </span>
          </p>
        </div>
      </Link>
    </li>
  );
}

function MarketplaceCard({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    side?: Side;
    category?: MarketplaceCategory;
    condition?: MarketplaceCondition;
    audience?: CommunityAudience;
  };
  const price = formatPrice(post);
  const hero = post.photos[0];

  return (
    <li>
      <Link
        href={`/marketplace/${post.id}`}
        className="group block overflow-hidden rounded-xl bg-card ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-primary-300"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {hero ? (
            <Image
              src={hero}
              alt={post.title}
              fill
              sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition group-hover:scale-[1.02]"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/30">
              <Camera className="h-7 w-7" />
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1">
            {meta.side ? (
              <span
                className={
                  'rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm ' +
                  (meta.side === 'sell'
                    ? 'bg-primary-500 text-neutral-950'
                    : 'bg-accent-500 text-neutral-950')
                }
              >
                {SIDE_LABEL[meta.side]}
              </span>
            ) : null}
            {meta.condition ? (
              <span className="rounded-sm bg-card/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/75 shadow-sm ring-1 ring-border/60 backdrop-blur">
                {MARKETPLACE_CONDITION_LABEL[meta.condition]}
              </span>
            ) : null}
          </div>

          {price ? (
            <span className="absolute right-2 top-2 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold tabular text-background shadow-sm">
              {price}
            </span>
          ) : null}
        </div>

        <div className="p-3">
          <h2 className="line-clamp-2 text-[14px] font-bold leading-snug text-foreground">
            {post.title}
          </h2>

          <ul className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/65">
            {meta.category ? (
              <li className="inline-flex items-center gap-0.5">
                {MARKETPLACE_CATEGORY_LABEL[meta.category]}
              </li>
            ) : null}
            {!price ? (
              <li className="inline-flex items-center gap-0.5 text-foreground/55">
                <Tag className="h-3 w-3" />
                価格応相談
              </li>
            ) : null}
            {post.locationText ? (
              <li className="inline-flex items-center gap-0.5 text-foreground/55">
                <MapPin className="h-3 w-3" />
                {post.locationText}
              </li>
            ) : null}
          </ul>

          <div className="mt-2 flex items-center justify-between gap-1">
            <span className="inline-flex items-center gap-0.5 text-[10px] text-foreground/45">
              <Clock className="h-2.5 w-2.5" />
              {formatPostedAt(post.createdAt)}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}
