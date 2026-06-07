import Link from 'next/link';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import {
  MapPin,
  Clock,
  Wifi,
  Plus,
  Inbox,
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
  JOB_EMPLOYMENT_TYPES,
  JOB_EMPLOYMENT_TYPE_LABEL,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABEL,
  PRICE_UNIT_LABEL,
  COMMUNITY_AUDIENCES,
  type JobEmploymentType,
  type JobCategory,
  type CommunityAudience,
} from '@/lib/community/constants';

export const revalidate = 300;

export const metadata = {
  title: '求人 — Locore',
  description:
    '在パリ駐在員コミュニティの求人掲示板。日系企業のオフィスワーク、飲食、翻訳、教育、IT などの募集を集めています。',
};

type Lang = 'ja' | 'fr' | 'en';
const LANG_LABEL: Record<Lang, string> = {
  ja: '日本語',
  fr: 'フランス語',
  en: '英語',
};
const ALL_LANGS: Lang[] = ['ja', 'fr', 'en'];

type Sort = 'new' | 'salary';

type Props = {
  searchParams?: {
    type?: string | string[];
    cat?: string;
    lang?: string | string[];
    remote?: string;
    min?: string;
    sort?: string;
    region?: string;
    audience?: string;
    view?: string;
  };
};

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : v.split(',').filter(Boolean);
}

function annualizedSalary(post: CommunityPostListItem): number | null {
  const amount = post.priceAmount;
  if (!amount) return null;
  const meta = post.metadata as { salary_period?: string };
  const period = meta.salary_period ?? post.priceUnit;
  switch (period) {
    case 'annual':
      return amount;
    case 'monthly':
      return amount * 12;
    case 'hourly':
      return Math.round(amount * 35 * 52);
    default:
      return null;
  }
}

function formatSalary(post: CommunityPostListItem): string | null {
  if (!post.priceAmount) {
    const meta = post.metadata as { salary_period?: string };
    if (meta.salary_period === 'negotiable') return '応相談';
    return null;
  }
  const meta = post.metadata as { salary_period?: string };
  const period = meta.salary_period ?? post.priceUnit ?? 'monthly';
  const unitLabel =
    period === 'annual'
      ? '年収'
      : period === 'monthly'
        ? '月給'
        : period === 'hourly'
          ? '時給'
          : '';
  const currencySym = post.priceCurrency === 'JPY' ? '¥' : '€';
  const num = new Intl.NumberFormat('fr-FR').format(post.priceAmount);
  return `${unitLabel} ${currencySym}${num}`;
}

function formatPostedAt(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const h = Math.floor(diffMs / (1000 * 60 * 60));
  if (h < 1) return 'たった今';
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}日前`;
  const m = Math.floor(day / 30);
  return `${m}ヶ月前`;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// 既知の searchParams キー。これ以外が来たら canonical /jobs に 308 リダイレクト。
// クローラがゴミクエリ (?utm_*, ?ref, ?_gl ほか) を踏み続けて ISR キャッシュを
// 汚染するのを防ぐ。Origin Data Transfer 課金の主因対策。
const ALLOWED_JOBS_SEARCH_KEYS = new Set([
  'type',
  'cat',
  'lang',
  'remote',
  'min',
  'sort',
  'region',
  'audience',
  'view',
]);

export default async function JobsIndexPage({ searchParams }: Props) {
  // ─── searchParams 衛生化 ────────────────────────────────────────
  // 1) 未知キーが混ざっていたら canonical /jobs に redirect
  // 2) `min` が非数値 / 0 / 巨大値なら redirect (?min=300, ?min=301... の爆撃対策)
  // 3) 列挙値 (cat / sort / view / audience / remote) のうち想定外を弾く
  if (searchParams) {
    const keys = Object.keys(searchParams);
    const hasUnknown = keys.some((k) => !ALLOWED_JOBS_SEARCH_KEYS.has(k));
    if (hasUnknown) redirect('/jobs');

    const rawMin = searchParams.min;
    if (rawMin != null && rawMin !== '') {
      const n = Number(rawMin);
      // 任意整数を無制限に許すとキャッシュキー爆発する。
      // 200 万円刻みだけ許容 (200, 400, 600, ..., 3000)。それ以外は丸めて redirect。
      if (!Number.isFinite(n) || n <= 0 || n > 5000 || n % 200 !== 0) {
        redirect('/jobs');
      }
    }
    if (
      searchParams.cat &&
      !(JOB_CATEGORIES as readonly string[]).includes(searchParams.cat)
    ) {
      redirect('/jobs');
    }
    if (
      searchParams.sort &&
      searchParams.sort !== 'new' &&
      searchParams.sort !== 'salary'
    ) {
      redirect('/jobs');
    }
    if (searchParams.view && searchParams.view !== 'list' && searchParams.view !== 'card') {
      redirect('/jobs');
    }
    if (
      searchParams.audience &&
      !(COMMUNITY_AUDIENCES as readonly string[]).includes(searchParams.audience)
    ) {
      redirect('/jobs');
    }
    if (searchParams.remote && searchParams.remote !== '1') {
      redirect('/jobs');
    }
  }

  const activeTypes = toArray(searchParams?.type).filter((t): t is JobEmploymentType =>
    (JOB_EMPLOYMENT_TYPES as readonly string[]).includes(t),
  );
  const activeCat =
    searchParams?.cat &&
    (JOB_CATEGORIES as readonly string[]).includes(searchParams.cat)
      ? (searchParams.cat as JobCategory)
      : undefined;
  const activeLangs = toArray(searchParams?.lang).filter((l): l is Lang =>
    (ALL_LANGS as readonly string[]).includes(l),
  );
  const remoteOnly = searchParams?.remote === '1';
  const minSalary = (() => {
    const n = Number(searchParams?.min);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const sort: Sort = searchParams?.sort === 'salary' ? 'salary' : 'new';
  const regionFilter = await resolveCommunityRegion(searchParams?.region);
  const activeAudience: CommunityAudience | undefined =
    searchParams?.audience &&
    (COMMUNITY_AUDIENCES as readonly string[]).includes(searchParams.audience)
      ? (searchParams.audience as CommunityAudience)
      : undefined;
  const currentView: CommunityView = searchParams?.view === 'list' ? 'list' : 'card';

  const rawPosts = await listCommunityPosts({
    kind: 'job',
    limit: 30,
    cityId: regionFilter.cityId,
  });

  const filtered = rawPosts.filter((p) => {
    const meta = p.metadata as {
      employment_type?: JobEmploymentType;
      category?: JobCategory;
      language_requirements?: Lang[];
      remote_ok?: boolean;
      audience?: CommunityAudience;
    };
    if (activeTypes.length > 0) {
      if (!meta.employment_type || !activeTypes.includes(meta.employment_type)) {
        return false;
      }
    }
    if (activeCat && meta.category !== activeCat) return false;
    if (activeLangs.length > 0) {
      const langs = meta.language_requirements ?? [];
      if (!activeLangs.some((l) => langs.includes(l))) return false;
    }
    if (remoteOnly && !meta.remote_ok) return false;
    if (minSalary) {
      const annual = annualizedSalary(p);
      if (annual === null || annual < minSalary) return false;
    }
    if (activeAudience) {
      if (meta.audience && meta.audience !== 'both' && meta.audience !== activeAudience) {
        return false;
      }
    }
    return true;
  });

  if (sort === 'salary') {
    filtered.sort((a, b) => {
      const aS = annualizedSalary(a) ?? -1;
      const bS = annualizedSalary(b) ?? -1;
      return bS - aS;
    });
  }

  const buildHref = (overrides: Record<string, string | undefined | null>) => {
    const params = new URLSearchParams();
    if (activeTypes.length > 0) params.set('type', activeTypes.join(','));
    if (activeCat) params.set('cat', activeCat);
    if (activeLangs.length > 0) params.set('lang', activeLangs.join(','));
    if (remoteOnly) params.set('remote', '1');
    if (minSalary) params.set('min', String(minSalary));
    if (sort !== 'new') params.set('sort', sort);
    if (regionFilter.active) params.set('region', regionFilter.slug);
    if (activeAudience) params.set('audience', activeAudience);
    if (currentView !== 'card') params.set('view', currentView);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/jobs?${qs}` : '/jobs';
  };

  const sheetFilterCount =
    activeTypes.length +
    (activeCat ? 1 : 0) +
    activeLangs.length +
    (remoteOnly ? 1 : 0) +
    (minSalary ? 1 : 0) +
    (sort !== 'new' ? 1 : 0);

  return (
    <main className="mx-auto max-w-screen-lg px-4 pb-12 pt-4 sm:px-6">
      <CommunityNav active="job" />

      <div className="mt-3">
        <CompactFilterBar
          basePath="/jobs"
          activeRegionSlug={regionFilter.slug}
          activeRegionNameJa={regionFilter.nameJa}
          preserveQuery={{
            type: activeTypes.length > 0 ? activeTypes.join(',') : undefined,
            cat: activeCat,
            lang: activeLangs.length > 0 ? activeLangs.join(',') : undefined,
            remote: remoteOnly ? '1' : undefined,
            min: minSalary ? String(minSalary) : undefined,
            sort: sort !== 'new' ? sort : undefined,
            audience: activeAudience,
            view: currentView !== 'card' ? currentView : undefined,
          }}
          activeAudience={activeAudience}
          buildAudienceHref={(a) => buildHref({ audience: a ?? null })}
          currentView={currentView}
          buildViewHref={(v) => buildHref({ view: v === 'card' ? null : v })}
          sheetTrigger={
            <FilterSheet activeCount={sheetFilterCount}>
              <form action="/jobs" method="GET" className="space-y-4">
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
                  label="雇用形態"
                  defaultValue={activeTypes[0] ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    ...JOB_EMPLOYMENT_TYPES.map((t) => ({
                      value: t,
                      label: JOB_EMPLOYMENT_TYPE_LABEL[t],
                    })),
                  ]}
                />
                <FilterSelect
                  name="cat"
                  label="職種"
                  defaultValue={activeCat ?? ''}
                  options={[
                    { value: '', label: 'すべて' },
                    ...JOB_CATEGORIES.map((c) => ({
                      value: c,
                      label: JOB_CATEGORY_LABEL[c],
                    })),
                  ]}
                />
                <FilterSelect
                  name="lang"
                  label="言語要件"
                  defaultValue={activeLangs[0] ?? ''}
                  options={[
                    { value: '', label: '問わず' },
                    ...ALL_LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] })),
                  ]}
                />
                <div>
                  <label
                    htmlFor="f-min"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-foreground/55"
                  >
                    年収下限（€）
                  </label>
                  <input
                    id="f-min"
                    type="number"
                    name="min"
                    min={0}
                    step={1000}
                    defaultValue={minSalary ?? ''}
                    placeholder="35000"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-[13px] tabular focus:border-2 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-[13px] text-foreground/80">
                  <input
                    type="checkbox"
                    name="remote"
                    value="1"
                    defaultChecked={remoteOnly}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Wifi className="h-3.5 w-3.5" />
                  リモート OK のみ
                </label>
                <FilterSelect
                  name="sort"
                  label="並び順"
                  defaultValue={sort}
                  options={[
                    { value: 'new', label: '新着順' },
                    { value: 'salary', label: '給与高い順' },
                  ]}
                />

                <div className="sticky bottom-0 -mx-4 mt-4 flex items-center gap-2 border-t border-border bg-background px-4 pb-1 pt-3">
                  <Link
                    href={buildHref({
                      type: null,
                      cat: null,
                      lang: null,
                      remote: null,
                      min: null,
                      sort: null,
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
            ぴったりの求人はまだ見つかりませんでした
          </p>
          <p className="text-[12px] text-foreground/55">
            条件を緩めるか、まだ募集がないなら自分で 1 件目を出してみるのも手です。
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/jobs"
              className="rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
            >
              条件を変えてもう一度
            </Link>
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-1 rounded-full border-2 border-primary-700 bg-primary-700 px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition hover:border-primary-500 hover:bg-primary-500"
            >
              <Plus className="h-3 w-3" />
              求人を出す
            </Link>
          </div>
        </div>
      ) : currentView === 'list' ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg bg-card ring-1 ring-border">
          {filtered.map((p) => (
            <JobListItem key={p.id} post={p} />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <JobCard key={p.id} post={p} />
          ))}
        </ul>
      )}

      <details className="mt-8 rounded-lg border border-border bg-card text-[12px] text-foreground/65">
        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-foreground/55">
          ⚠️ ご利用上の注意
        </summary>
        <div className="border-t border-border p-3">
          <CommunityDisclaimer kind="job" />
        </div>
      </details>

      <PostFab href="/jobs/new" label="求人を出す" />
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

function JobListItem({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    employment_type?: JobEmploymentType;
    category?: JobCategory;
    language_requirements?: Lang[];
    remote_ok?: boolean;
    audience?: CommunityAudience;
  };
  const salary = formatSalary(post);
  const hero = post.photos?.[0];

  return (
    <li>
      <Link
        href={`/jobs/${post.id}`}
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
            {meta.employment_type ? (
              <span className="rounded-sm bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-300">
                {JOB_EMPLOYMENT_TYPE_LABEL[meta.employment_type]}
              </span>
            ) : null}
            {meta.category ? (
              <span className="rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/65">
                {JOB_CATEGORY_LABEL[meta.category]}
              </span>
            ) : null}
            {meta.remote_ok ? (
              <span className="inline-flex items-center gap-0.5 rounded-sm bg-accent-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-500">
                <Wifi className="h-2.5 w-2.5" />
                Remote
              </span>
            ) : null}
            <AudienceBadge audience={meta.audience} />
          </div>

          <h2 className="mt-1 line-clamp-2 text-[14px] font-bold leading-snug text-foreground">
            {post.title}
          </h2>

          <dl className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/65">
            {salary ? (
              <div className="font-semibold text-primary-300">{salary}</div>
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

function JobCard({ post }: { post: CommunityPostListItem }) {
  const meta = post.metadata as {
    employment_type?: JobEmploymentType;
    category?: JobCategory;
    language_requirements?: Lang[];
    remote_ok?: boolean;
    audience?: CommunityAudience;
  };
  const salary = formatSalary(post);
  const expDays = daysUntil(post.expiresAt);
  const expiringSoon = expDays !== null && expDays >= 0 && expDays <= 3;
  const photos = post.photos ?? [];
  const cover = photos[0];

  return (
    <li>
      <Link
        href={`/jobs/${post.id}`}
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
            {meta.employment_type ? (
              <span className="rounded-sm bg-primary-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-950 shadow-sm">
                {JOB_EMPLOYMENT_TYPE_LABEL[meta.employment_type]}
              </span>
            ) : null}
            {meta.category ? (
              <span className="rounded-sm bg-card/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/75 shadow-sm ring-1 ring-border/60 backdrop-blur">
                {JOB_CATEGORY_LABEL[meta.category]}
              </span>
            ) : null}
            {meta.remote_ok ? (
              <span className="inline-flex items-center gap-0.5 rounded-sm bg-accent-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-950 shadow-sm">
                <Wifi className="h-2.5 w-2.5" />
                Remote
              </span>
            ) : null}
          </div>

          {salary ? (
            <span className="absolute right-2 top-2 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold tabular text-background shadow-sm">
              {salary}
            </span>
          ) : null}
        </div>

        <div className="p-3">
          <h2 className="line-clamp-2 text-[14px] font-bold leading-snug text-foreground">
            {post.title}
          </h2>

          <ul className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/65">
            {!salary && (
              <li className="text-foreground/45">給与情報なし</li>
            )}
            {post.locationText ? (
              <li className="inline-flex items-center gap-0.5 text-foreground/55">
                <MapPin className="h-3 w-3" />
                {post.locationText}
              </li>
            ) : null}
            {meta.language_requirements && meta.language_requirements.length > 0 ? (
              <li className="inline-flex items-center gap-0.5 text-foreground/55">
                {meta.language_requirements.map((l) => LANG_LABEL[l]).join(' / ')}
              </li>
            ) : null}
            {expDays !== null && expDays >= 0 ? (
              <li
                className={
                  'inline-flex items-center gap-0.5 tabular ' +
                  (expiringSoon ? 'font-bold text-danger-500' : 'text-foreground/55')
                }
              >
                締切まで {expDays}日
              </li>
            ) : null}
            {post.priceUnit && !salary ? (
              <li className="text-foreground/45">
                {PRICE_UNIT_LABEL[post.priceUnit as keyof typeof PRICE_UNIT_LABEL]}
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
