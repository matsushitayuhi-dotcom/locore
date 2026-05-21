import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Clock,
  Wifi,
  Coffee,
  Tag,
  ImageIcon,
} from 'lucide-react';
import { CommunityNav } from '@/components/community/CommunityNav';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { AudienceBadge } from '@/components/community/AudienceBadge';
import { type CommunityView } from '@/components/community/ViewToggle';
import { CompactFilterBar } from '@/components/community/CompactFilterBar';
import { FilterSheet } from '@/components/community/FilterSheet';
import { PostFab } from '@/components/community/PostFab';
import { listCommunityPosts, type CommunityPostListItem } from '@/lib/community/db';
import { resolveCommunityRegion } from '@/lib/community/region-filter';
import {
  COMMUNITY_AUDIENCES,
  type CommunityAudience,
} from '@/lib/community/constants';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '教えます・習います — Locore',
  description:
    'フランス在住の駐在員コミュニティのレッスン掲示板。日本語、フランス語、料理、楽器、勉強の家庭教師など。',
};

type Side = 'teach' | 'learn';
const SIDE_LABEL: Record<Side, string> = {
  teach: '教えます',
  learn: '習いたい',
};

type Format = 'in_person' | 'online' | 'both';
const FORMAT_LABEL: Record<Format, string> = {
  in_person: '対面',
  online: 'オンライン',
  both: '対面 / オンライン',
};

type LessonCategory =
  | 'language'
  | 'music'
  | 'cooking'
  | 'art'
  | 'sport'
  | 'study_aid'
  | 'other';
const LESSON_CATEGORIES: LessonCategory[] = [
  'language',
  'music',
  'cooking',
  'art',
  'sport',
  'study_aid',
  'other',
];
const LESSON_CATEGORY_LABEL: Record<LessonCategory, string> = {
  language: '語学',
  music: '音楽',
  cooking: '料理',
  art: 'アート',
  sport: 'スポーツ',
  study_aid: '勉強サポート',
  other: 'その他',
};

type Props = {
  searchParams?: {
    side?: string;
    cat?: string;
    fmt?: string;
    trial?: string;
    region?: string;
    audience?: string;
    view?: string;
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

function formatLessonPrice(post: CommunityPostListItem): string | null {
  if (!post.priceAmount) {
    if (post.priceUnit === 'negotiable') return '応相談';
    return null;
  }
  const currencySym = post.priceCurrency === 'JPY' ? '¥' : '€';
  const num = new Intl.NumberFormat('fr-FR').format(post.priceAmount);
  const suffix =
    post.priceUnit === 'monthly'
      ? ' / 月'
      : post.priceUnit === 'per_session'
        ? ' / 1回'
        : post.priceUnit === 'hourly'
          ? ' / 時'
          : '';
  return `${currencySym}${num}${suffix}`;
}

export default async function LessonsIndexPage({ searchParams }: Props) {
  const activeSide = ((): Side | undefined => {
    if (searchParams?.side === 'teach' || searchParams?.side === 'learn') {
      return searchParams.side;
    }
    return undefined;
  })();
  const activeCat =
    searchParams?.cat &&
    (LESSON_CATEGORIES as string[]).includes(searchParams.cat)
      ? (searchParams.cat as LessonCategory)
      : undefined;
  const activeFormat = ((): Format | undefined => {
    if (
      searchParams?.fmt === 'in_person' ||
      searchParams?.fmt === 'online' ||
      searchParams?.fmt === 'both'
    )
      return searchParams.fmt;
    return undefined;
  })();
  const trialOnly = searchParams?.trial === '1';
  const regionFilter = await resolveCommunityRegion(searchParams?.region);
  const activeAudience: CommunityAudience | undefined =
    searchParams?.audience &&
    (COMMUNITY_AUDIENCES as readonly string[]).includes(searchParams.audience)
      ? (searchParams.audience as CommunityAudience)
      : undefined;
  const currentView: CommunityView = searchParams?.view === 'list' ? 'list' : 'card';

  const rawPosts = await listCommunityPosts({
    kind: 'lesson',
    limit: 80,
    cityId: regionFilter.cityId,
  });

  const filtered = rawPosts.filter((p) => {
    const meta = p.metadata as {
      side?: Side;
      category?: LessonCategory;
      format?: Format;
      trial_available?: boolean;
      audience?: CommunityAudience;
    };
    if (activeSide && meta.side !== activeSide) return false;
    if (activeCat && meta.category !== activeCat) return false;
    if (activeFormat && meta.format !== activeFormat) return false;
    if (trialOnly && !meta.trial_available) return false;
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
    if (activeFormat) params.set('fmt', activeFormat);
    if (trialOnly) params.set('trial', '1');
    if (regionFilter.active) params.set('region', regionFilter.slug);
    if (activeAudience) params.set('audience', activeAudience);
    if (currentView !== 'card') params.set('view', currentView);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/lessons?${qs}` : '/lessons';
  };

  const sheetFilterCount =
    (activeSide ? 1 : 0) +
    (activeCat ? 1 : 0) +
    (activeFormat ? 1 : 0) +
    (trialOnly ? 1 : 0);

  return (
    <main className="mx-auto max-w-screen-lg px-4 pb-12 pt-4 sm:px-6">
      <CommunityNav active="lesson" />

      <div className="mt-3">
        <CompactFilterBar
          basePath="/lessons"
          activeRegionSlug={regionFilter.slug}
          activeRegionNameJa={regionFilter.nameJa}
          preserveQuery={{
            side: activeSide,
            cat: activeCat,
            fmt: activeFormat,
            trial: trialOnly ? '1' : undefined,
            audience: activeAudience,
            view: currentView !== 'card' ? currentView : undefined,
          }}
          activeAudience={activeAudience}
          buildAudienceHref={(a) => buildHref({ audience: a ?? null })}
          currentView={currentView}
          buildViewHref={(v) => buildHref({ view: v === 'card' ? null : v })}
          sheetTrigger={
            <FilterSheet activeCount={sheetFilterCount}>
              <form action="/lessons" method="GET" className="space-y-4">
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
                  label="教える / 習う"
                  defaultValue={activeSide ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    { value: 'teach', label: SIDE_LABEL.teach },
                    { value: 'learn', label: SIDE_LABEL.learn },
                  ]}
                />
                <FilterSelect
                  name="cat"
                  label="ジャンル"
                  defaultValue={activeCat ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    ...LESSON_CATEGORIES.map((c) => ({
                      value: c,
                      label: LESSON_CATEGORY_LABEL[c],
                    })),
                  ]}
                />
                <FilterSelect
                  name="fmt"
                  label="形式"
                  defaultValue={activeFormat ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    { value: 'in_person', label: FORMAT_LABEL.in_person },
                    { value: 'online', label: FORMAT_LABEL.online },
                    { value: 'both', label: FORMAT_LABEL.both },
                  ]}
                />
                <label className="inline-flex items-center gap-2 text-[13px] text-foreground/80">
                  <input
                    type="checkbox"
                    name="trial"
                    value="1"
                    defaultChecked={trialOnly}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Coffee className="h-3.5 w-3.5" />
                  体験ありのみ
                </label>

                <div className="sticky bottom-0 -mx-4 mt-4 flex items-center gap-2 border-t border-border bg-background px-4 pb-1 pt-3">
                  <Link
                    href={buildHref({
                      side: null,
                      cat: null,
                      fmt: null,
                      trial: null,
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
        <div className="rounded-xl border border-border bg-card p-10 text-center text-[13px] text-foreground/55">
          条件に合うレッスンはまだありません。
          <br />
          フィルタを緩めて再度お試しください。
        </div>
      ) : currentView === 'list' ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg bg-card ring-1 ring-border">
          {filtered.map((p) => (
            <LessonListItem key={p.id} post={p} />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <LessonCard key={p.id} post={p} />
          ))}
        </ul>
      )}

      <details className="mt-8 rounded-lg border border-border bg-card text-[12px] text-foreground/65">
        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-foreground/55">
          ⚠️ ご利用上の注意
        </summary>
        <div className="border-t border-border p-3">
          <CommunityDisclaimer kind="lesson" />
        </div>
      </details>

      <PostFab href="/lessons/new" label="投稿する" />
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

function LessonListItem({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    side?: Side;
    category?: LessonCategory;
    format?: Format;
    trial_available?: boolean;
    audience?: CommunityAudience;
  };
  const price = formatLessonPrice(post);
  const hero = post.photos?.[0];

  return (
    <li>
      <Link
        href={`/lessons/${post.id}`}
        className="flex gap-3 p-3 transition hover:bg-primary-500/5"
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:h-28 sm:w-28">
          {hero ? (
            <Image
              src={hero}
              alt=""
              fill
              sizes="128px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/30">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            {meta.side ? (
              <span
                className={
                  'rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' +
                  (meta.side === 'teach'
                    ? 'bg-primary-500 text-neutral-950'
                    : 'bg-accent-500 text-neutral-950')
                }
              >
                {SIDE_LABEL[meta.side]}
              </span>
            ) : null}
            {meta.category ? (
              <span className="rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/65">
                {LESSON_CATEGORY_LABEL[meta.category]}
              </span>
            ) : null}
            {meta.format ? (
              <span className="inline-flex items-center gap-0.5 rounded-sm bg-primary-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-300">
                {meta.format === 'online' ? <Wifi className="h-2.5 w-2.5" /> : null}
                {FORMAT_LABEL[meta.format]}
              </span>
            ) : null}
            <AudienceBadge audience={meta.audience} />
          </div>
          <h2 className="mt-1 line-clamp-2 text-[14px] font-bold leading-snug text-foreground">
            {post.title}
          </h2>
          <dl className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/65">
            {price ? (
              <div className="inline-flex items-center gap-0.5 font-semibold text-primary-300">
                <Tag className="h-3 w-3" />
                {price}
              </div>
            ) : null}
            {post.locationText ? (
              <div className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {post.locationText}
              </div>
            ) : null}
            <div className="inline-flex items-center gap-0.5 text-foreground/45">
              <Clock className="h-2.5 w-2.5" />
              {formatPostedAt(post.createdAt)}
            </div>
          </dl>
        </div>
      </Link>
    </li>
  );
}

function LessonCard({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    side?: Side;
    category?: LessonCategory;
    format?: Format;
    trial_available?: boolean;
    audience?: CommunityAudience;
  };
  const price = formatLessonPrice(post);
  const photos = post.photos ?? [];
  const cover = photos[0];

  return (
    <li>
      <Link
        href={`/lessons/${post.id}`}
        className="group block overflow-hidden rounded-xl bg-card ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-primary-300"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {cover ? (
            <Image
              src={cover}
              alt={post.title}
              fill
              sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition group-hover:scale-[1.02]"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-foreground/40">
              <span className="inline-flex flex-col items-center gap-1">
                <ImageIcon className="h-5 w-5" />
                写真なし
              </span>
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1">
            {meta.side ? (
              <span
                className={
                  'rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm ' +
                  (meta.side === 'teach'
                    ? 'bg-primary-500 text-neutral-950'
                    : 'bg-accent-500 text-neutral-950')
                }
              >
                {SIDE_LABEL[meta.side]}
              </span>
            ) : null}
            {meta.category ? (
              <span className="rounded-sm bg-card/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/75 shadow-sm ring-1 ring-border/60 backdrop-blur">
                {LESSON_CATEGORY_LABEL[meta.category]}
              </span>
            ) : null}
            {meta.trial_available ? (
              <span className="inline-flex items-center gap-0.5 rounded-sm bg-accent-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-950 shadow-sm">
                <Coffee className="h-2.5 w-2.5" />
                体験
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
            {meta.format ? (
              <li className="inline-flex items-center gap-0.5">
                {meta.format === 'online' ? <Wifi className="h-3 w-3" /> : null}
                {FORMAT_LABEL[meta.format]}
              </li>
            ) : null}
            {!price && (
              <li className="inline-flex items-center gap-0.5 text-foreground/45">
                <Tag className="h-3 w-3" />
                料金応相談
              </li>
            )}
            {post.locationText ? (
              <li className="inline-flex items-center gap-0.5 text-foreground/55">
                <MapPin className="h-3 w-3" />
                {post.locationText}
              </li>
            ) : null}
          </ul>

          <div className="mt-2 flex items-center justify-between gap-1">
            <AudienceBadge audience={meta.audience} />
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
