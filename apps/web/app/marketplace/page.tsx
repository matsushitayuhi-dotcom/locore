import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Plus,
  ShoppingBag,
  MapPin,
  Clock,
  Camera,
  Tag,
  Inbox,
} from 'lucide-react';
import { CommunityNav } from '@/components/community/CommunityNav';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { CommunityRegionPicker } from '@/components/community/CommunityRegionPicker';
import { AudienceChips } from '@/components/community/AudienceChips';
import { AudienceBadge } from '@/components/community/AudienceBadge';
import { listCommunityPosts, type CommunityPostListItem } from '@/lib/community/db';
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

export const dynamic = 'force-dynamic';

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

  const rawPosts = await listCommunityPosts({
    kind: 'marketplace',
    limit: 80,
    cityId: regionFilter.cityId,
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
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/marketplace?${qs}` : '/marketplace';
  };

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ホームに戻る
      </Link>

      <div className="mt-4">
        <CommunityNav active="marketplace" />
      </div>

      <div className="mt-3">
        <CommunityRegionPicker
          basePath="/marketplace"
          activeSlug={regionFilter.slug}
          preserveQuery={{
            side: activeSide,
            cat: activeCat,
            cond: activeCond,
            price: activePrice?.id,
            audience: activeAudience,
          }}
        />
      </div>

      <div className="mt-3">
        <AudienceChips
          active={activeAudience}
          buildHref={(a) => buildHref({ audience: a ?? null })}
        />
      </div>

      <header className="mt-6 mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            <ShoppingBag className="h-3 w-3" />
            売ります・買います
          </p>
          <h1
            className="mt-2 text-[30px] font-bold leading-tight tracking-tight"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            {regionFilter.active ? regionFilter.nameJa : 'フランス'}でゆずる
          </h1>
          <p className="mt-2 text-[14px] leading-[1.9] text-foreground/70">
            帰任セール、引越し時の譲渡、家具家電、子供用品。
            駐在員同士で気軽にやり取りできる小さなフリマ。
          </p>
        </div>
        <Link
          href="/marketplace/new"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary-500 px-4 py-2 text-[12px] font-bold text-neutral-950 transition hover:bg-primary-300"
        >
          <Plus className="h-3.5 w-3.5" />
          投稿する
        </Link>
      </header>

      <div className="mb-4">
        <CommunityDisclaimer kind="marketplace" />
      </div>

      {/* side ピル */}
      <div
        role="tablist"
        aria-label="売る / 買う で絞り込み"
        className="mb-2 flex flex-wrap items-center gap-1.5"
      >
        <Link
          href={buildHref({ side: null })}
          role="tab"
          aria-selected={!activeSide}
          className={
            'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
            (!activeSide
              ? 'bg-primary-500 text-neutral-950'
              : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
          }
        >
          すべて
        </Link>
        {(['sell', 'buy'] as Side[]).map((s) => {
          const on = activeSide === s;
          return (
            <Link
              key={s}
              href={buildHref({ side: on ? null : s })}
              role="tab"
              aria-selected={on}
              className={
                'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                (on
                  ? 'bg-primary-500 text-neutral-950'
                  : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
              }
            >
              {SIDE_LABEL[s]}
            </Link>
          );
        })}
      </div>

      {/* category */}
      <div className="mb-2">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          カテゴリ
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={buildHref({ cat: null })}
            className={
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
              (!activeCat
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground/65 hover:bg-foreground/15')
            }
          >
            すべて
          </Link>
          {MARKETPLACE_CATEGORIES.map((c) => (
            <Link
              key={c}
              href={buildHref({ cat: activeCat === c ? null : c })}
              className={
                'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                (activeCat === c
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground/65 hover:bg-foreground/15')
              }
            >
              {MARKETPLACE_CATEGORY_LABEL[c]}
            </Link>
          ))}
        </div>
      </div>

      {/* condition + price */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
            状態
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={buildHref({ cond: null })}
              className={
                'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                (!activeCond
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground/65 hover:bg-foreground/15')
              }
            >
              すべて
            </Link>
            {MARKETPLACE_CONDITIONS.map((c) => (
              <Link
                key={c}
                href={buildHref({ cond: activeCond === c ? null : c })}
                className={
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                  (activeCond === c
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-foreground/65 hover:bg-foreground/15')
                }
              >
                {MARKETPLACE_CONDITION_LABEL[c]}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
            価格帯
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={buildHref({ price: null })}
              className={
                'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                (!activePrice
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground/65 hover:bg-foreground/15')
              }
            >
              すべて
            </Link>
            {PRICE_BUCKETS.map((b) => (
              <Link
                key={b.id}
                href={buildHref({ price: activePrice?.id === b.id ? null : b.id })}
                className={
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                  (activePrice?.id === b.id
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-foreground/65 hover:bg-foreground/15')
                }
              >
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

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
              className="inline-flex items-center gap-1 rounded-full bg-primary-500 px-3 py-1.5 text-[12px] font-bold text-neutral-950 hover:bg-primary-300"
            >
              <Plus className="h-3 w-3" />
              投稿する
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((p) => (
            <MarketplaceCard key={p.id} post={p} />
          ))}
        </ul>
      )}
    </main>
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
        className="block overflow-hidden rounded-lg bg-card ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
      >
        <div className="relative aspect-[4/3] w-full bg-muted">
          {hero ? (
            <Image
              src={hero}
              alt={post.title}
              fill
              sizes="(min-width: 640px) 40vw, 100vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/30">
              <Camera className="h-7 w-7" />
            </div>
          )}
          {meta.side ? (
            <span
              className={
                'absolute top-2 left-2 rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' +
                (meta.side === 'sell'
                  ? 'bg-primary-500 text-neutral-950'
                  : 'bg-accent-500 text-neutral-950')
              }
            >
              {SIDE_LABEL[meta.side]}
            </span>
          ) : null}
        </div>

        <div className="p-3">
          <div className="flex flex-wrap items-center gap-1">
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
            <AudienceBadge audience={meta.audience} />
          </div>

          <h2
            className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-foreground"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            {post.title}
          </h2>

          <p className="mt-1.5 flex items-baseline gap-1 text-[16px] font-bold tabular text-primary-300">
            <Tag className="h-3 w-3 self-center" />
            {price ?? '価格応相談'}
          </p>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-foreground/50">
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
