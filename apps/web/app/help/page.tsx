import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Clock,
  Zap,
  Gift,
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
  title: '助け合い — Locore',
  description:
    'フランス在住の駐在員コミュニティの相互扶助掲示板。空港送迎、書類翻訳、子供の一時預かりなど。',
};

type RequestType = 'offer' | 'need';
const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  offer: '申し出ます',
  need: 'お願いしたい',
};

type Urgency = 'now' | 'this_week' | 'flexible';
const URGENCY_LABEL: Record<Urgency, string> = {
  now: '今すぐ',
  this_week: '今週中',
  flexible: '日程相談',
};

type Compensation = 'none' | 'small_thanks' | 'negotiable';
const COMPENSATION_LABEL: Record<Compensation, string> = {
  none: 'お礼不要',
  small_thanks: 'ちょっとしたお礼',
  negotiable: '相談',
};

type Category =
  | 'transport'
  | 'translation'
  | 'childcare'
  | 'pet_care'
  | 'admin_help'
  | 'moving_help'
  | 'other';
const CATEGORIES: Category[] = [
  'transport',
  'translation',
  'childcare',
  'pet_care',
  'admin_help',
  'moving_help',
  'other',
];
const CATEGORY_LABEL: Record<Category, string> = {
  transport: '送迎',
  translation: '翻訳',
  childcare: '子育て',
  pet_care: 'ペット',
  admin_help: '行政書類',
  moving_help: '引越し',
  other: 'その他',
};

type Props = {
  searchParams?: {
    type?: string;
    urg?: string;
    cat?: string;
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

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function HelpIndexPage({ searchParams }: Props) {
  const activeType = ((): RequestType | undefined => {
    if (searchParams?.type === 'offer' || searchParams?.type === 'need')
      return searchParams.type;
    return undefined;
  })();
  const activeUrg = ((): Urgency | undefined => {
    if (
      searchParams?.urg === 'now' ||
      searchParams?.urg === 'this_week' ||
      searchParams?.urg === 'flexible'
    )
      return searchParams.urg;
    return undefined;
  })();
  const activeCat =
    searchParams?.cat && (CATEGORIES as string[]).includes(searchParams.cat)
      ? (searchParams.cat as Category)
      : undefined;
  const activeAudience: CommunityAudience | undefined =
    searchParams?.audience &&
    (COMMUNITY_AUDIENCES as readonly string[]).includes(searchParams.audience)
      ? (searchParams.audience as CommunityAudience)
      : undefined;
  const currentView: CommunityView = searchParams?.view === 'list' ? 'list' : 'card';

  const regionFilter = await resolveCommunityRegion(searchParams?.region);

  const rawPosts = await listCommunityPosts({
    kind: 'mutual_aid',
    limit: 80,
    cityId: regionFilter.cityId,
  });

  const filtered = rawPosts.filter((p) => {
    const meta = p.metadata as {
      request_type?: RequestType;
      urgency?: Urgency;
      category?: Category;
      audience?: CommunityAudience;
    };
    if (activeType && meta.request_type !== activeType) return false;
    if (activeUrg && meta.urgency !== activeUrg) return false;
    if (activeCat && meta.category !== activeCat) return false;
    if (activeAudience) {
      if (meta.audience && meta.audience !== 'both' && meta.audience !== activeAudience) {
        return false;
      }
    }
    return true;
  });

  const buildHref = (overrides: Record<string, string | undefined | null>) => {
    const params = new URLSearchParams();
    if (activeType) params.set('type', activeType);
    if (activeUrg) params.set('urg', activeUrg);
    if (activeCat) params.set('cat', activeCat);
    if (regionFilter.active) params.set('region', regionFilter.slug);
    if (activeAudience) params.set('audience', activeAudience);
    if (currentView !== 'card') params.set('view', currentView);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/help?${qs}` : '/help';
  };

  const sheetFilterCount =
    (activeType ? 1 : 0) + (activeUrg ? 1 : 0) + (activeCat ? 1 : 0);

  return (
    <main className="mx-auto max-w-screen-lg px-4 pb-12 pt-4 sm:px-6">
      <CommunityNav active="mutual_aid" />

      <div className="mt-3">
        <CompactFilterBar
          basePath="/help"
          activeRegionSlug={regionFilter.slug}
          activeRegionNameJa={regionFilter.nameJa}
          preserveQuery={{
            type: activeType,
            urg: activeUrg,
            cat: activeCat,
            audience: activeAudience,
            view: currentView !== 'card' ? currentView : undefined,
          }}
          activeAudience={activeAudience}
          buildAudienceHref={(a) => buildHref({ audience: a ?? null })}
          currentView={currentView}
          buildViewHref={(v) => buildHref({ view: v === 'card' ? null : v })}
          sheetTrigger={
            <FilterSheet activeCount={sheetFilterCount}>
              <form action="/help" method="GET" className="space-y-4">
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
                  label="申し出 / 依頼"
                  defaultValue={activeType ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    { value: 'offer', label: REQUEST_TYPE_LABEL.offer },
                    { value: 'need', label: REQUEST_TYPE_LABEL.need },
                  ]}
                />
                <FilterSelect
                  name="urg"
                  label="緊急度"
                  defaultValue={activeUrg ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    { value: 'now', label: URGENCY_LABEL.now },
                    { value: 'this_week', label: URGENCY_LABEL.this_week },
                    { value: 'flexible', label: URGENCY_LABEL.flexible },
                  ]}
                />
                <FilterSelect
                  name="cat"
                  label="カテゴリ"
                  defaultValue={activeCat ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    ...CATEGORIES.map((c) => ({
                      value: c,
                      label: CATEGORY_LABEL[c],
                    })),
                  ]}
                />

                <div className="sticky bottom-0 -mx-4 mt-4 flex items-center gap-2 border-t border-border bg-background px-4 pb-1 pt-3">
                  <Link
                    href={buildHref({ type: null, urg: null, cat: null })}
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
          条件に合う投稿はまだありません。
          <br />
          フィルタを緩めて再度お試しください。
        </div>
      ) : currentView === 'list' ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg bg-card ring-1 ring-border">
          {filtered.map((p) => (
            <HelpListItem key={p.id} post={p} />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <HelpCard key={p.id} post={p} />
          ))}
        </ul>
      )}

      <details className="mt-8 rounded-lg border border-border bg-card text-[12px] text-foreground/65">
        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-foreground/55">
          ⚠️ ご利用上の注意
        </summary>
        <div className="border-t border-border p-3">
          <CommunityDisclaimer kind="mutual_aid" />
        </div>
      </details>

      <PostFab href="/help/new" label="投稿する" />
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

function HelpListItem({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    request_type?: RequestType;
    urgency?: Urgency;
    category?: Category;
    compensation?: Compensation;
    audience?: CommunityAudience;
  };
  const hero = post.photos?.[0];

  return (
    <li>
      <Link
        href={`/help/${post.id}`}
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
            {meta.request_type ? (
              <span
                className={
                  'rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' +
                  (meta.request_type === 'offer'
                    ? 'bg-primary-500 text-neutral-950'
                    : 'bg-accent-500 text-neutral-950')
                }
              >
                {REQUEST_TYPE_LABEL[meta.request_type]}
              </span>
            ) : null}
            {meta.urgency ? (
              <span
                className={
                  'inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' +
                  (meta.urgency === 'now'
                    ? 'bg-danger-500 text-white'
                    : meta.urgency === 'this_week'
                      ? 'bg-warning-500/20 text-warning-500'
                      : 'bg-foreground/10 text-foreground/65')
                }
              >
                {meta.urgency === 'now' ? <Zap className="h-2.5 w-2.5" /> : null}
                {URGENCY_LABEL[meta.urgency]}
              </span>
            ) : null}
            {meta.category ? (
              <span className="rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/65">
                {CATEGORY_LABEL[meta.category]}
              </span>
            ) : null}
            <AudienceBadge audience={meta.audience} />
          </div>
          <h2 className="mt-1 line-clamp-2 text-[14px] font-bold leading-snug text-foreground">
            {post.title}
          </h2>
          <dl className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/65">
            {meta.compensation ? (
              <div className="inline-flex items-center gap-0.5">
                <Gift className="h-3 w-3" />
                {COMPENSATION_LABEL[meta.compensation]}
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

function HelpCard({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    request_type?: RequestType;
    urgency?: Urgency;
    category?: Category;
    compensation?: Compensation;
    audience?: CommunityAudience;
  };
  const expDays = daysUntil(post.expiresAt);
  const isUrgent = meta.urgency === 'now';
  const photos = post.photos ?? [];
  const cover = photos[0];

  return (
    <li>
      <Link
        href={`/help/${post.id}`}
        className={
          'group block overflow-hidden rounded-xl ring-1 transition hover:-translate-y-0.5 ' +
          (isUrgent
            ? 'bg-danger-500/5 ring-danger-500/30 hover:ring-danger-500/60'
            : 'bg-card ring-border hover:ring-primary-300')
        }
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
            {meta.request_type ? (
              <span
                className={
                  'rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm ' +
                  (meta.request_type === 'offer'
                    ? 'bg-primary-500 text-neutral-950'
                    : 'bg-accent-500 text-neutral-950')
                }
              >
                {REQUEST_TYPE_LABEL[meta.request_type]}
              </span>
            ) : null}
            {meta.urgency ? (
              <span
                className={
                  'inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm ' +
                  (meta.urgency === 'now'
                    ? 'bg-danger-500 text-white'
                    : meta.urgency === 'this_week'
                      ? 'bg-warning-500/90 text-white'
                      : 'bg-card/95 text-foreground/75 ring-1 ring-border/60 backdrop-blur')
                }
              >
                {meta.urgency === 'now' ? <Zap className="h-2.5 w-2.5" /> : null}
                {URGENCY_LABEL[meta.urgency]}
              </span>
            ) : null}
            {meta.category ? (
              <span className="rounded-sm bg-card/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/75 shadow-sm ring-1 ring-border/60 backdrop-blur">
                {CATEGORY_LABEL[meta.category]}
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-3">
          <h2 className="line-clamp-2 text-[14px] font-bold leading-snug text-foreground">
            {post.title}
          </h2>

          <ul className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/65">
            {meta.compensation ? (
              <li className="inline-flex items-center gap-0.5">
                <Gift className="h-3 w-3" />
                {COMPENSATION_LABEL[meta.compensation]}
              </li>
            ) : null}
            {post.locationText ? (
              <li className="inline-flex items-center gap-0.5 text-foreground/55">
                <MapPin className="h-3 w-3" />
                {post.locationText}
              </li>
            ) : null}
            {expDays !== null && expDays >= 0 ? (
              <li
                className={
                  'inline-flex items-center gap-0.5 tabular ' +
                  (expDays <= 3 ? 'font-bold text-danger-500' : 'text-foreground/55')
                }
              >
                あと {expDays} 日
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
