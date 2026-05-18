import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Bed,
  Maximize,
  MapPin,
  Calendar,
  Sofa,
  PawPrint,
  Camera,
  Home as HomeIcon,
} from 'lucide-react';
import { listCommunityPosts } from '@/lib/community/db';
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
import { CommunityRegionPicker } from '@/components/community/CommunityRegionPicker';
import { AudienceChips } from '@/components/community/AudienceChips';
import { AudienceBadge } from '@/components/community/AudienceBadge';
import { resolveCommunityRegion } from '@/lib/community/region-filter';

export const dynamic = 'force-dynamic';

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
  };
};

// 入力値を配列に正規化
function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.split(',').filter(Boolean);
}

export default async function ApartmentsIndexPage({ searchParams }: Props) {
  // -------------------------------------------------------------------------
  // クエリパース
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // データ取得（active のみ）
  // -------------------------------------------------------------------------
  const allPosts = await listCommunityPosts({
    kind: 'apartment',
    limit: 120,
    cityId: regionFilter.cityId,
  });

  // -------------------------------------------------------------------------
  // クライアントサイド相当のフィルタ（メタが JSONB なので SQL でやらず JS で簡潔に）
  // -------------------------------------------------------------------------
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
      // audience が無い投稿は both 扱い (フィルタを通す)
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
    // recent
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // -------------------------------------------------------------------------
  // URL ビルダ（フィルタの toggle）
  // -------------------------------------------------------------------------
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
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === null || v === '') sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    return qs ? `/apartments?${qs}` : '/apartments';
  };

  const toggleType = (t: ApartmentListingType) => {
    const next = selectedTypes.includes(t)
      ? selectedTypes.filter((x) => x !== t)
      : [...selectedTypes, t];
    return buildHref({ type: next.length ? next.join(',') : undefined });
  };

  return (
    <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-12">
      <CommunityNav active="apartment" />

      <div className="mt-3">
        <CommunityRegionPicker
          basePath="/apartments"
          activeSlug={regionFilter.slug}
          preserveQuery={{
            type: selectedTypes.length > 0 ? selectedTypes.join(',') : undefined,
            rent: rentBucket,
            bedrooms: bedroomFilter,
            arr: arrFilter || undefined,
            furnished: furnishedOnly ? '1' : undefined,
            pets: petsOnly ? '1' : undefined,
            sort: sort !== 'recent' ? sort : undefined,
            audience: activeAudience,
          }}
        />
      </div>

      <div className="mt-3">
        <AudienceChips
          active={activeAudience}
          buildHref={(a) => buildHref({ audience: a ?? undefined })}
        />
      </div>

      {/* ヘッダ */}
      <header className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            <HomeIcon className="h-3 w-3" />
            アパート
          </p>
          <h1
            className="mt-2 text-[30px] font-bold leading-tight tracking-tight"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            {regionFilter.active ? regionFilter.nameJa : 'フランス'}で暮らす
          </h1>
          <p className="mt-2 max-w-prose text-[14px] leading-[1.9] text-foreground/70">
            駐在員と長期滞在者のための物件掲示板。長期賃貸 / 短期 / シェア /
            サブレを、Locore メッセージ経由で問い合わせできます。
          </p>
        </div>

        <Link
          href="/apartments/new"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
        >
          <Plus className="h-4 w-4" />
          物件を出す
        </Link>
      </header>

      <div className="mt-6">
        <CommunityDisclaimer kind="apartment" />
      </div>

      {/* フィルタ（プルダウン式 / SUUMO 風）--------------------------------- */}
      <form
        action="/apartments"
        method="GET"
        className="mt-6 flex flex-wrap items-end gap-2 rounded-xl bg-card p-3 ring-1 ring-border sm:p-4"
      >
        {regionFilter.active ? (
          <input type="hidden" name="region" value={regionFilter.slug} />
        ) : null}
        {activeAudience ? (
          <input type="hidden" name="audience" value={activeAudience} />
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
          label="家賃帯"
          defaultValue={rentBucket ?? ''}
          options={[
            { value: '', label: '指定なし' },
            ...RENT_BUCKETS.map((b) => ({ value: b.id, label: b.label })),
          ]}
        />
        <FilterSelect
          name="bedrooms"
          label="寝室"
          defaultValue={bedroomFilter ?? ''}
          options={[
            { value: '', label: '指定なし' },
            ...BEDROOM_OPTIONS.map((b) => ({ value: b.id, label: b.label })),
          ]}
        />
        <FilterSelect
          name="furnished"
          label="家具"
          defaultValue={furnishedOnly ? '1' : ''}
          options={[
            { value: '', label: '指定なし' },
            { value: '1', label: '家具付きのみ' },
          ]}
        />
        <FilterSelect
          name="pets"
          label="ペット"
          defaultValue={petsOnly ? '1' : ''}
          options={[
            { value: '', label: '指定なし' },
            { value: '1', label: 'ペット可' },
          ]}
        />
        <FilterSelect
          name="sort"
          label="並び順"
          defaultValue={sort}
          options={SORT_OPTIONS.map((s) => ({ value: s.id, label: s.label }))}
        />
        <div className="flex flex-1 items-end gap-2">
          <div className="min-w-[80px] flex-1">
            <label
              htmlFor="arr"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-foreground/55"
            >
              区
            </label>
            <input
              id="arr"
              name="arr"
              defaultValue={arrFilter}
              placeholder="11e"
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-[12px] focus:border-2 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-md bg-primary-500 px-4 text-[12px] font-bold text-neutral-950 hover:bg-primary-300"
          >
            適用
          </button>
          {(selectedTypes.length > 0 ||
            rentBucket ||
            bedroomFilter ||
            arrFilter ||
            furnishedOnly ||
            petsOnly ||
            sort !== 'recent') ? (
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
              className="h-9 shrink-0 inline-flex items-center rounded-md bg-card px-3 text-[11px] font-medium text-foreground/65 ring-1 ring-border hover:bg-muted"
            >
              リセット
            </Link>
          ) : null}
        </div>
      </form>

      {/* 旧 UI の section（ピル並びのフィルタ）は廃止 */}
      <section className="mt-6 hidden space-y-3 rounded-xl bg-card p-4 ring-1 ring-border">
        {/* 形態 */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
            形態
          </p>
          <div className="flex flex-wrap gap-1.5">
            {APARTMENT_LISTING_TYPES.map((t) => {
              const on = selectedTypes.includes(t);
              return (
                <Link
                  key={t}
                  href={toggleType(t)}
                  aria-pressed={on}
                  className={
                    'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                    (on
                      ? 'bg-primary-500 text-neutral-950'
                      : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
                  }
                >
                  {APARTMENT_LISTING_TYPE_LABEL[t]}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 家賃帯 */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
            家賃帯（月額）
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={buildHref({ rent: undefined })}
              aria-pressed={!rentBucket}
              className={
                'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                (!rentBucket
                  ? 'bg-foreground text-background'
                  : 'border border-border bg-background text-foreground/70 hover:border-foreground/30')
              }
            >
              指定なし
            </Link>
            {RENT_BUCKETS.map((b) => {
              const on = rentBucket === b.id;
              return (
                <Link
                  key={b.id}
                  href={buildHref({ rent: on ? undefined : b.id })}
                  aria-pressed={on}
                  className={
                    'rounded-full px-3 py-1 text-[11px] font-semibold transition tabular ' +
                    (on
                      ? 'bg-foreground text-background'
                      : 'border border-border bg-background text-foreground/70 hover:border-foreground/30')
                  }
                >
                  {b.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 寝室数 */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
            寝室数
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={buildHref({ bedrooms: undefined })}
              aria-pressed={!bedroomFilter}
              className={
                'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                (!bedroomFilter
                  ? 'bg-foreground text-background'
                  : 'border border-border bg-background text-foreground/70 hover:border-foreground/30')
              }
            >
              指定なし
            </Link>
            {BEDROOM_OPTIONS.map((b) => {
              const on = bedroomFilter === b.id;
              return (
                <Link
                  key={b.id}
                  href={buildHref({ bedrooms: on ? undefined : b.id })}
                  aria-pressed={on}
                  className={
                    'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                    (on
                      ? 'bg-foreground text-background'
                      : 'border border-border bg-background text-foreground/70 hover:border-foreground/30')
                  }
                >
                  {b.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 区 + フラグ + 並び順 */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <form
            action="/apartments"
            method="get"
            className="flex items-center gap-1"
          >
            {/* 既存フィルタを hidden で保持 */}
            {regionFilter.active ? (
              <input type="hidden" name="region" value={regionFilter.slug} />
            ) : null}
            {selectedTypes.length > 0 ? (
              <input type="hidden" name="type" value={selectedTypes.join(',')} />
            ) : null}
            {rentBucket ? <input type="hidden" name="rent" value={rentBucket} /> : null}
            {bedroomFilter ? (
              <input type="hidden" name="bedrooms" value={bedroomFilter} />
            ) : null}
            {furnishedOnly ? <input type="hidden" name="furnished" value="1" /> : null}
            {petsOnly ? <input type="hidden" name="pets" value="1" /> : null}
            {sort !== 'recent' ? <input type="hidden" name="sort" value={sort} /> : null}
            <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
              区
            </label>
            <input
              name="arr"
              defaultValue={arrFilter}
              placeholder="例: 11e"
              className="w-24 rounded-md border border-border bg-background px-2 py-1 text-[12px] focus:border-2 focus:border-primary-500 focus:px-[7px] focus:py-[3px] focus:outline-none"
            />
          </form>

          <Link
            href={buildHref({ furnished: furnishedOnly ? undefined : '1' })}
            aria-pressed={furnishedOnly}
            className={
              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
              (furnishedOnly
                ? 'bg-foreground text-background'
                : 'border border-border bg-background text-foreground/70 hover:border-foreground/30')
            }
          >
            <Sofa className="h-3 w-3" />
            家具付きのみ
          </Link>

          <Link
            href={buildHref({ pets: petsOnly ? undefined : '1' })}
            aria-pressed={petsOnly}
            className={
              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
              (petsOnly
                ? 'bg-foreground text-background'
                : 'border border-border bg-background text-foreground/70 hover:border-foreground/30')
            }
          >
            <PawPrint className="h-3 w-3" />
            ペット可
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
              並び順
            </span>
            {SORT_OPTIONS.map((s) => {
              const on = sort === s.id;
              return (
                <Link
                  key={s.id}
                  href={buildHref({ sort: s.id === 'recent' ? undefined : s.id })}
                  aria-pressed={on}
                  className={
                    'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                    (on
                      ? 'bg-primary-500 text-neutral-950'
                      : 'text-foreground/65 hover:bg-primary-500/10 hover:text-primary-300')
                  }
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* リスト ----------------------------------------------------------- */}
      <p className="mt-6 mb-3 text-[12px] text-foreground/55 tabular">
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
                  {/* 写真エリア (4:3) */}
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
                      <AudienceBadge audience={meta.audience} />
                    </div>
                  </div>

                  {/* 本文 */}
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

                    {/* スペックバッジ */}
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

                    {/* 場所 */}
                    {meta.arrondissement || meta.nearest_station || p.locationText ? (
                      <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-foreground/60">
                        <MapPin className="h-3 w-3" />
                        {[meta.arrondissement, meta.nearest_station, p.locationText]
                          .filter(Boolean)
                          .join(' / ')}
                      </p>
                    ) : null}

                    {/* 入居可能日 */}
                    {meta.available_from ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-foreground/60">
                        <Calendar className="h-3 w-3" />
                        {formatAvailableFrom(meta.available_from)}
                      </p>
                    ) : null}

                    {/* 投稿日 / 期限 */}
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
    </main>
  );
}

// =============================================================================
// 日付フォーマッタ
// =============================================================================

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
    <div className="min-w-[110px] flex-1 sm:flex-none">
      <label
        htmlFor={`f-${name}`}
        className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-foreground/55"
      >
        {label}
      </label>
      <select
        id={`f-${name}`}
        name={name}
        defaultValue={defaultValue}
        className="h-9 w-full rounded-md border border-border bg-background px-2 text-[12px] focus:border-2 focus:border-primary-500 focus:outline-none"
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
