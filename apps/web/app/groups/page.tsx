import Link from 'next/link';
import Image from 'next/image';
import {
  Clock,
  Repeat,
  UserCheck,
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

export const revalidate = 300;

export const metadata = {
  title: 'イベント — Locore',
  description:
    'フランス在住の駐在員コミュニティのイベント。ママ友会、テニス・ランニング仲間、勉強会、言語交換など。',
};

type GroupCategory =
  | 'sport'
  | 'study'
  | 'hobby'
  | 'parenting'
  | 'language'
  | 'other';
const GROUP_CATEGORIES: GroupCategory[] = [
  'sport',
  'study',
  'hobby',
  'parenting',
  'language',
  'other',
];
const GROUP_CATEGORY_LABEL: Record<GroupCategory, string> = {
  sport: 'スポーツ',
  study: '勉強会',
  hobby: '趣味',
  parenting: '子育て',
  language: '言語交換',
  other: 'その他',
};

type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'one_off' | 'flexible';
const FREQUENCIES: Frequency[] = [
  'weekly',
  'biweekly',
  'monthly',
  'one_off',
  'flexible',
];
const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: '毎週',
  biweekly: '隔週',
  monthly: '月 1 回',
  one_off: '単発',
  flexible: '随時',
};

type Props = {
  searchParams?: {
    cat?: string;
    freq?: string;
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

export default async function GroupsIndexPage({ searchParams }: Props) {
  const activeCat =
    searchParams?.cat && (GROUP_CATEGORIES as string[]).includes(searchParams.cat)
      ? (searchParams.cat as GroupCategory)
      : undefined;
  const activeFreq =
    searchParams?.freq && (FREQUENCIES as string[]).includes(searchParams.freq)
      ? (searchParams.freq as Frequency)
      : undefined;
  const activeAudience: CommunityAudience | undefined =
    searchParams?.audience &&
    (COMMUNITY_AUDIENCES as readonly string[]).includes(searchParams.audience)
      ? (searchParams.audience as CommunityAudience)
      : undefined;
  const currentView: CommunityView = searchParams?.view === 'list' ? 'list' : 'card';

  const regionFilter = await resolveCommunityRegion(searchParams?.region);

  const rawPosts = await listCommunityPosts({
    kind: 'group',
    limit: 30,
    cityId: regionFilter.cityId,
  });

  const filtered = rawPosts.filter((p) => {
    const meta = p.metadata as {
      category?: GroupCategory;
      meeting_frequency?: Frequency;
      audience?: CommunityAudience;
    };
    if (activeCat && meta.category !== activeCat) return false;
    if (activeFreq && meta.meeting_frequency !== activeFreq) return false;
    if (activeAudience) {
      if (meta.audience && meta.audience !== 'both' && meta.audience !== activeAudience) {
        return false;
      }
    }
    return true;
  });

  const buildHref = (overrides: Record<string, string | undefined | null>) => {
    const params = new URLSearchParams();
    if (activeCat) params.set('cat', activeCat);
    if (activeFreq) params.set('freq', activeFreq);
    if (regionFilter.active) params.set('region', regionFilter.slug);
    if (activeAudience) params.set('audience', activeAudience);
    if (currentView !== 'card') params.set('view', currentView);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/groups?${qs}` : '/groups';
  };

  const sheetFilterCount = (activeCat ? 1 : 0) + (activeFreq ? 1 : 0);

  return (
    <main className="mx-auto max-w-screen-lg px-4 pb-12 pt-4 sm:px-6">
      <CommunityNav active="group" />

      <div className="mt-3">
        <CompactFilterBar
          basePath="/groups"
          activeRegionSlug={regionFilter.slug}
          activeRegionNameJa={regionFilter.nameJa}
          preserveQuery={{
            cat: activeCat,
            freq: activeFreq,
            audience: activeAudience,
            view: currentView !== 'card' ? currentView : undefined,
          }}
          activeAudience={activeAudience}
          buildAudienceHref={(a) => buildHref({ audience: a ?? null })}
          currentView={currentView}
          buildViewHref={(v) => buildHref({ view: v === 'card' ? null : v })}
          sheetTrigger={
            <FilterSheet activeCount={sheetFilterCount}>
              <form action="/groups" method="GET" className="space-y-4">
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
                  name="cat"
                  label="カテゴリ"
                  defaultValue={activeCat ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    ...GROUP_CATEGORIES.map((c) => ({
                      value: c,
                      label: GROUP_CATEGORY_LABEL[c],
                    })),
                  ]}
                />
                <FilterSelect
                  name="freq"
                  label="頻度"
                  defaultValue={activeFreq ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    ...FREQUENCIES.map((f) => ({
                      value: f,
                      label: FREQUENCY_LABEL[f],
                    })),
                  ]}
                />

                <div className="sticky bottom-0 -mx-4 mt-4 flex items-center gap-2 border-t border-border bg-background px-4 pb-1 pt-3">
                  <Link
                    href={buildHref({ cat: null, freq: null })}
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
          条件に合う募集はまだありません。
          <br />
          フィルタを緩めて再度お試しください。
        </div>
      ) : currentView === 'list' ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg bg-card ring-1 ring-border">
          {filtered.map((p) => (
            <GroupListItem key={p.id} post={p} />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <GroupCard key={p.id} post={p} />
          ))}
        </ul>
      )}

      <details className="mt-8 rounded-lg border border-border bg-card text-[12px] text-foreground/65">
        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-foreground/55">
          ⚠️ ご利用上の注意
        </summary>
        <div className="border-t border-border p-3">
          <CommunityDisclaimer kind="group" />
        </div>
      </details>

      <PostFab href="/groups/new" label="募集する" />
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

function GroupListItem({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    category?: GroupCategory;
    meeting_frequency?: Frequency;
    group_size?: number;
    age_range?: string;
    skill_level?: string;
    audience?: CommunityAudience;
  };
  const hero = post.photos?.[0];

  return (
    <li>
      <Link
        href={`/groups/${post.id}`}
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
            {meta.category ? (
              <span className="rounded-sm bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-300">
                {GROUP_CATEGORY_LABEL[meta.category]}
              </span>
            ) : null}
            {meta.meeting_frequency ? (
              <span className="inline-flex items-center gap-0.5 rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/65">
                <Repeat className="h-2.5 w-2.5" />
                {FREQUENCY_LABEL[meta.meeting_frequency]}
              </span>
            ) : null}
            <AudienceBadge audience={meta.audience} />
          </div>
          <h2 className="mt-1 line-clamp-2 text-[14px] font-bold leading-snug text-foreground">
            {post.title}
          </h2>
          <dl className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/65">
            {meta.group_size ? (
              <div className="inline-flex items-center gap-0.5">
                <UserCheck className="h-3 w-3" />
                {meta.group_size} 名
              </div>
            ) : null}
            {post.locationText ? (
              <div className="text-foreground/55">{post.locationText}</div>
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

function GroupCard({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    category?: GroupCategory;
    meeting_frequency?: Frequency;
    group_size?: number;
    age_range?: string;
    skill_level?: string;
    audience?: CommunityAudience;
  };
  const photos = post.photos ?? [];
  const cover = photos[0];

  return (
    <li>
      <Link
        href={`/groups/${post.id}`}
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
            {meta.category ? (
              <span className="rounded-sm bg-primary-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-950 shadow-sm">
                {GROUP_CATEGORY_LABEL[meta.category]}
              </span>
            ) : null}
            {meta.meeting_frequency ? (
              <span className="inline-flex items-center gap-0.5 rounded-sm bg-card/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/75 shadow-sm ring-1 ring-border/60 backdrop-blur">
                <Repeat className="h-2.5 w-2.5" />
                {FREQUENCY_LABEL[meta.meeting_frequency]}
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-3">
          <h2 className="line-clamp-2 text-[14px] font-bold leading-snug text-foreground">
            {post.title}
          </h2>

          <ul className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/65">
            {meta.group_size ? (
              <li className="inline-flex items-center gap-0.5">
                <UserCheck className="h-3 w-3" />
                {meta.group_size} 名規模
              </li>
            ) : null}
            {meta.age_range ? (
              <li className="text-foreground/55">対象: {meta.age_range}</li>
            ) : null}
            {post.locationText ? (
              <li className="inline-flex items-center gap-0.5 text-foreground/55">
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
