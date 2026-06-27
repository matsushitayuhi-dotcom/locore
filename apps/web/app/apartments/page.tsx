import Link from 'next/link';
import Image from 'next/image';
import {
  Bed,
  Maximize,
  MapPin,
  Calendar,
  Sofa,
  PawPrint,
  Camera,
} from 'lucide-react';
import { listCommunityPosts } from '@/lib/community/db';
import {
  resolveCountryCode,
  SUPPORTED_COUNTRIES,
} from '@/lib/geo/countrySlug';
import { CommunityCountrySelect } from '@/components/community/CommunityCountrySelect';
import {
  APARTMENT_LISTING_TYPES,
  APARTMENT_LISTING_TYPE_LABEL,
  COMMUNITY_AUDIENCES,
  type ApartmentListingType,
  type ApartmentMetadata,
  type CommunityAudience,
} from '@/lib/community/constants';
import { CommunityNav } from '@/components/community/CommunityNav';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { type CommunityView } from '@/components/community/ViewToggle';
import { CompactFilterBar } from '@/components/community/CompactFilterBar';
import { FilterSheet } from '@/components/community/FilterSheet';
import { PostFab } from '@/components/community/PostFab';
import { resolveCommunityRegion } from '@/lib/community/region-filter';

export const revalidate = 300;

export const metadata = {
  title: 'アパート — パリの物件掲示板',
  description:
    '在パリ駐在員向けの物件掲示板。長期賃貸 / 短期 / シェア / サブレ。日本人歓迎の物件を Locore メッセージ経由で安全に問い合わせできます。',
};

// =============================================================================
// フィルタ定義
// =============================================================================

const RENT_BUCKETS = [
  { id: 'lt800', label: '〜€800', min: 0, max: 799 },
  { id: '800-1500', label: '€800〜1,500', min: 800, max: 1500 },
  { id: '1500-2500', label: '€1,500〜2,500', min: 1501, max: 2500 },
  { id: 'gte2500', label: '€2,500〜', min: 2501, max: Infinity },
] as const;
type RentBucketId = (typeof RENT_BUCKETS)[number]['id'];

const BEDROOM_OPTIONS = [
  { id: '0', label: 'スタジオ', match: (n: number) => n === 0 },
  { id: '1', label: '1', match: (n: number) => n === 1 },
  { id: '2', label: '2', match: (n: number) => n === 2 },
  { id: '3plus', label: '3+', match: (n: number) => n >= 3 },
] as const;
type BedroomId = (typeof BEDROOM_OPTIONS)[number]['id'];

const SORT_OPTIONS = [
  { id: 'recent', label: '新着' },
  { id: 'cheap', label: '家賃が安い' },
  { id: 'bedroom', label: '寝室が多い' },
] as const;
type SortId = (typeof SORT_OPTIONS)[number]['id'];

const LISTING_TYPE_BADGE: Record<ApartmentListingType, string> = {
  long_term: 'bg-primary-500/10 text-primary-300',
  short_term: 'bg-amber-500/10 text-amber-700',
  shared: 'bg-purple-500/10 text-purple-600',
  sublet: 'bg-blue-500/10 text-blue-600',
};

type Props = {
  searchParams?: {
    type?: string | string[];
    rent?: string;
    bedrooms?: string;
    arr?: string;
    furnished?: string;
    pets?: string;
    sort?: string;
    region?: string;
    audience?: string;
    view?: string;
    country?: string;
  };
};

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.split(',').filter(Boolean);
}

export default async function ApartmentsIndexPage({ searchParams }: Props) {
  const selectedTypes = toArray(searchParams?.type).filter((t): t is ApartmentListingType =>
    (APARTMENT_LISTING_TYPES as readonly string[]).includes(t),
  );
  const rentBucket: RentBucketId | undefined = RENT_BUCKETS.find(
    (b) => b.id === searchParams?.rent,
  )?.id;
  const bedroomFilter: BedroomId | undefined = BEDROOM_OPTIONS.find(
    (b) => b.id === searchParams?.bedrooms,
  )?.id;
  const arrFilter = (searchParams?.arr ?? '').trim();
  const furnishedOnly = searchParams?.furnished === '1';
  const petsOnly = searchParams?.pets === '1';
  const sort: SortId =
    (SORT_OPTIONS.find((s) => s.id === searchParams?.sort)?.id as SortId) ?? 'recent';
  const regionFilter = await resolveCommunityRegion(searchParams?.region);
  const activeAudience: CommunityAudience | undefined =
    searchParams?.audience &&
    (COMMUNITY_AUDIENCES as readonly string[]).includes(searchParams.audience)
      ? (searchParams.audience as CommunityAudience)
      : undefined;
  const currentView: CommunityView = searchParams?.view === 'list' ? 'list' : 'card';

  const countryCode = resolveCountryCode(searchParams?.country);
  const allPosts = await listCommunityPosts({
    kind: 'apartment',
    limit: 30,
    cityId: regionFilter.cityId,
    countryCode,
  });

  const filtered = allPosts.filter((p) => {
    const meta = (p.metadata as ApartmentMetadata) ?? {};
    const lt = meta.listing_type;
    if (selectedTypes.length > 0 && !selectedTypes.includes(lt)) return false;

    if (rentBucket) {
      const b = RENT_BUCKETS.find((x) => x.id === rentBucket)!;
      const rent = meta.rent_monthly ?? p.priceAmount ?? null;
      if (rent == null) return false;
      if (rent < b.min || rent > b.max) return false;
    }

    if (bedroomFilter) {
      const opt = BEDROOM_OPTIONS.find((x) => x.id === bedroomFilter)!;
      if (typeof meta.bedrooms !== 'number') return false;
      if (!opt.match(meta.bedrooms)) return false;
    }

    if (arrFilter) {
      const arr = (meta.arrondissement ?? '').toLowerCase();
      if (!arr.includes(arrFilter.toLowerCase())) return false;
    }

    if (furnishedOnly && !meta.furnished) return false;
    if (petsOnly && !meta.pets_ok) return false;

    if (activeAudience) {
      if (meta.audience && meta.audience !== 'both' && meta.audience !== activeAudience) {
        return false;
      }
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const ma = (a.metadata as ApartmentMetadata) ?? {};
    const mb = (b.metadata as ApartmentMetadata) ?? {};
    if (sort === 'cheap') {
      const ra = ma.rent_monthly ?? a.priceAmount ?? Number.MAX_SAFE_INTEGER;
      const rb = mb.rent_monthly ?? b.priceAmount ?? Number.MAX_SAFE_INTEGER;
      return ra - rb;
    }
    if (sort === 'bedroom') {
      return (mb.bedrooms ?? -1) - (ma.bedrooms ?? -1);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const buildHref = (patch: Record<string, string | undefined | null>) => {
    const sp = new URLSearchParams();
    if (selectedTypes.length) sp.set('type', selectedTypes.join(','));
    if (rentBucket) sp.set('rent', rentBucket);
    if (bedroomFilter) sp.set('bedrooms', bedroomFilter);
    if (arrFilter) sp.set('arr', arrFilter);
    if (furnishedOnly) sp.set('furnished', '1');
    if (petsOnly) sp.set('pets', '1');
    if (sort !== 'recent') sp.set('sort', sort);
    if (regionFilter.active) sp.set('region', regionFilter.slug);
    if (activeAudience) sp.set('audience', activeAudience);
    if (currentView !== 'card') sp.set('view', currentView);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === null || v === '') sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    return qs ? `/apartments?${qs}` : '/apartments';
  };

  // 「絞り込み」シート内のフィルタ数 (region / audience / view 以外)
  const sheetFilterCount =
    selectedTypes.length +
    (rentBucket ? 1 : 0) +
    (bedroomFilter ? 1 : 0) +
    (arrFilter ? 1 : 0) +
    (furnishedOnly ? 1 : 0) +
    (petsOnly ? 1 : 0) +
    (sort !== 'recent' ? 1 : 0);

  return (
    <main className="mx-auto max-w-screen-lg px-4 pb-12 pt-4 sm:px-6">
      {/* カテゴリタブ (求人 / アパート / 売買 ...) */}
      <CommunityNav active="apartment" />

      {/* 国フィルタ */}
      <div className="mt-3">
        <CommunityCountrySelect
          current={countryCode}
          countries={SUPPORTED_COUNTRIES}
        />
      </div>

      {/* ミニフィルタバー (sticky) */}
      <div className="mt-2">
        <CompactFilterBar
          basePath="/apartments"
          activeRegionSlug={regionFilter.slug}
          activeRegionNameJa={regionFilter.nameJa}
          preserveQuery={{
            type: selectedTypes.length > 0 ? selectedTypes.join(',') : undefined,
            rent: rentBucket,
            bedrooms: bedroomFilter,
            arr: arrFilter || undefined,
            furnished: furnishedOnly ? '1' : undefined,
            pets: petsOnly ? '1' : undefined,
            sort: sort !== 'recent' ? sort : undefined,
            audience: activeAudience,
            view: currentView !== 'card' ? currentView : undefined,
          }}
          activeAudience={activeAudience}
          buildAudienceHref={(a) => buildHref({ audience: a ?? null })}
          currentView={currentView}
          buildViewHref={(v) => buildHref({ view: v === 'card' ? null : v })}
          sheetTrigger={
            <FilterSheet activeCount={sheetFilterCount}>
              <form action="/apartments" method="GET" className="space-y-4">
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
                  name="type"
                  label="形態"
                  defaultValue={selectedTypes[0] ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    ...APARTMENT_LISTING_TYPES.map((t) => ({
                      value: t,
                      label: APARTMENT_LISTING_TYPE_LABEL[t],
                    })),
                  ]}
                />
                <FilterSelect
                  name="rent"
                  label="家賃帯（月額）"
                  defaultValue={rentBucket ?? ''}
                  options={[
                    { value: '', label: '指定なし' },
                    ...RENT_BUCKETS.map((b) => ({ value: b.id, label: b.label })),
                  ]}
                />
                <FilterSelect
                  name="bedrooms"
                  label="寝室数"
                  defaultValue={bedroomFilter ?? ''}
                  options={[
                    { value: '', label: '指定なし' },
                    ...BEDROOM_OPTIONS.map((b) => ({ value: b.id, label: b.label })),
                  ]}
                />
                <div>
                  <label
                    htmlFor="arr"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-foreground/55"
                  >
                    区 (Arrondissement)
                  </label>
                  <input
                    id="arr"
                    name="arr"
                    defaultValue={arrFilter}
                    placeholder="11e"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-[13px] text-foreground/80">
                    <input
                      type="checkbox"
                      name="furnished"
                      value="1"
                      defaultChecked={furnishedOnly}
                      className="h-4 w-4 rounded border-border"
                    />
                    <Sofa className="h-3.5 w-3.5" />
                    家具付きのみ
                  </label>
                  <label className="inline-flex items-center gap-2 text-[13px] text-foreground/80">
                    <input
                      type="checkbox"
                      name="pets"
                      value="1"
                      defaultChecked={petsOnly}
                      className="h-4 w-4 rounded border-border"
                    />
                    <PawPrint className="h-3.5 w-3.5" />
                    ペット可
                  </label>
                </div>
                <FilterSelect
                  name="sort"
                  label="並び順"
                  defaultValue={sort}
                  options={SORT_OPTIONS.map((s) => ({ value: s.id, label: s.label }))}
                />

                <div className="sticky bottom-0 -mx-4 mt-4 flex items-center gap-2 border-t border-border bg-background px-4 pb-1 pt-3">
                  <Link
                    href={buildHref({
                      type: undefined,
                      rent: undefined,
                      bedrooms: undefined,
                      arr: undefined,
                      furnished: undefined,
                      pets: undefined,
                      sort: undefined,
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

      {/* リスト ----------------------------------------------------------- */}
      <p className="mt-4 mb-3 text-[12px] text-foreground/55 tabular">
        {sorted.length} 件
      </p>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-[13px] text-foreground/55">
          条件に合う物件はまだありません。フィルタを緩めるか、
          <Link href="/apartments" className="underline">
            すべての物件
          </Link>
          をご覧ください。
        </div>
      ) : currentView === 'list' ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg bg-card ring-1 ring-border">
          {sorted.map((p) => {
            const meta = (p.metadata as ApartmentMetadata) ?? {};
            const photos = p.photos ?? [];
            const cover = photos[0];
            const rent = meta.rent_monthly ?? p.priceAmount ?? null;
            const lt = meta.listing_type;

            return (
              <li key={p.id}>
                <Link
                  href={`/apartments/${p.id}`}
                  className="flex gap-3 p-3 transition hover:bg-primary-500/5"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:h-28 sm:w-28">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={p.title}
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
                      {lt ? (
                        <span
                          className={
                            'rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' +
                            (LISTING_TYPE_BADGE[lt] ?? 'bg-foreground/10 text-foreground/65')
                          }
                        >
                          {APARTMENT_LISTING_TYPE_LABEL[lt]}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-[15px] font-bold tracking-tight tabular">
                        {rent != null ? `€${rent.toLocaleString()}` : '応相談'}
                      </span>
                      {rent != null ? (
                        <span className="text-[10px] text-foreground/55">/ 月</span>
                      ) : null}
                    </div>
                    <h2 className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-snug">
                      {p.title}
                    </h2>
                    <ul className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-foreground/65">
                      {typeof meta.bedrooms === 'number' ? (
                        <li className="inline-flex items-center gap-0.5">
                          <Bed className="h-3 w-3" />
                          {meta.bedrooms === 0 ? 'Studio' : `${meta.bedrooms} 寝室`}
                        </li>
                      ) : null}
                      {typeof meta.size_sqm === 'number' ? (
                        <li className="inline-flex items-center gap-0.5">
                          <Maximize className="h-3 w-3" />
                          {meta.size_sqm} m²
                        </li>
                      ) : null}
                      {meta.arrondissement || p.locationText ? (
                        <li className="inline-flex items-center gap-0.5 text-foreground/55">
                          <MapPin className="h-3 w-3" />
                          {[meta.arrondissement, p.locationText].filter(Boolean).join(' / ')}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => {
            const meta = (p.metadata as ApartmentMetadata) ?? {};
            const photos = p.photos ?? [];
            const cover = photos[0];
            const rent = meta.rent_monthly ?? p.priceAmount ?? null;
            const lt = meta.listing_type;

            return (
              <li key={p.id}>
                <Link
                  href={`/apartments/${p.id}`}
                  className="group block overflow-hidden rounded-xl bg-card ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-primary-300"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    {cover ? (
                      <>
                        <Image
                          src={cover}
                          alt={p.title}
                          fill
                          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition group-hover:scale-[1.02]"
                          unoptimized
                        />
                        {photos.length > 1 ? (
                          <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-neutral-900/70 px-2 py-0.5 text-[10px] font-bold text-white">
                            <Camera className="h-3 w-3" />+{photos.length - 1}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] text-foreground/40">
                        <span className="inline-flex flex-col items-center gap-1">
                          <Camera className="h-5 w-5" />
                          写真なし
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1">
                      {lt ? (
                        <span
                          className={
                            'rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' +
                            (LISTING_TYPE_BADGE[lt] ?? 'bg-foreground/10 text-foreground/65')
                          }
                        >
                          {APARTMENT_LISTING_TYPE_LABEL[lt]}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[18px] font-bold tracking-tight text-foreground tabular">
                        {rent != null ? `€${rent.toLocaleString()}` : '応相談'}
                      </span>
                      {rent != null ? (
                        <span className="text-[11px] text-foreground/55">/ 月</span>
                      ) : null}
                      {meta.charges_monthly ? (
                        <span className="text-[10px] text-foreground/45">
                          + 管理費 €{meta.charges_monthly.toLocaleString()}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-1 line-clamp-2 text-[14px] font-bold leading-snug">
                      {p.title}
                    </h2>

                    <ul className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-foreground/65">
                      {typeof meta.bedrooms === 'number' ? (
                        <li className="inline-flex items-center gap-0.5">
                          <Bed className="h-3 w-3" />
                          {meta.bedrooms === 0 ? 'Studio' : `${meta.bedrooms} 寝室`}
                        </li>
                      ) : null}
                      {typeof meta.size_sqm === 'number' ? (
                        <li className="inline-flex items-center gap-0.5">
                          <Maximize className="h-3 w-3" />
                          {meta.size_sqm} m²
                        </li>
                      ) : null}
                      {meta.furnished ? (
                        <li className="inline-flex items-center gap-0.5">
                          <Sofa className="h-3 w-3" />
                          家具付き
                        </li>
                      ) : null}
                    </ul>

                    {meta.arrondissement || meta.nearest_station || p.locationText ? (
                      <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-foreground/60">
                        <MapPin className="h-3 w-3" />
                        {[meta.arrondissement, meta.nearest_station, p.locationText]
                          .filter(Boolean)
                          .join(' / ')}
                      </p>
                    ) : null}

                    {meta.available_from ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-foreground/60">
                        <Calendar className="h-3 w-3" />
                        {formatAvailableFrom(meta.available_from)}
                      </p>
                    ) : null}

                    <p className="mt-2 flex items-center justify-between text-[10px] text-foreground/45">
                      <span>{formatPosted(p.createdAt)}</span>
                      {p.expiresAt ? (
                        <span>掲載 〜{formatShortDate(p.expiresAt)}</span>
                      ) : null}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* 取引注意 (折りたたみで底に) */}
      <details className="mt-8 rounded-lg border border-border bg-card text-[12px] text-foreground/65">
        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-foreground/55">
          ⚠️ ご利用上の注意
        </summary>
        <div className="border-t border-border p-3">
          <CommunityDisclaimer kind="apartment" />
        </div>
      </details>

      <PostFab href="/apartments/new" label="物件を出す" />
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

function formatAvailableFrom(d: string): string {
  const date = new Date(d.length === 10 ? d + 'T00:00:00Z' : d);
  if (isNaN(date.getTime())) return d;
  if (date.getTime() <= Date.now()) return '即入居可';
  return `${date.getMonth() + 1}月${date.getDate()}日から`;
}

function formatPosted(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const h = Math.floor(diffMs / (1000 * 60 * 60));
  if (h < 1) return 'たった今';
  if (h < 24) return `${h} 時間前`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day} 日前`;
  return `${Math.floor(day / 30)} ヶ月前`;
}

function formatShortDate(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
