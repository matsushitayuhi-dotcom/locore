import Link from 'next/link';
import {
  Briefcase,
  MapPin,
  Clock,
  Wifi,
  Plus,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';
import { CommunityNav } from '@/components/community/CommunityNav';
import { CommunityDisclaimer } from '@/components/community/CommunityDisclaimer';
import { CommunityRegionPicker } from '@/components/community/CommunityRegionPicker';
import { AudienceChips } from '@/components/community/AudienceChips';
import { AudienceBadge } from '@/components/community/AudienceBadge';
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

export const dynamic = 'force-dynamic';

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
    filters?: string;
    region?: string;
    audience?: string;
  };
};

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : v.split(',').filter(Boolean);
}

/** メタから年収換算した数値を返す（並び替え / 下限フィルタ用） */
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
      // 35h/週 × 52週 を概算
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

export default async function JobsIndexPage({ searchParams }: Props) {
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
  const showFilters = searchParams?.filters === '1';
  const regionFilter = await resolveCommunityRegion(searchParams?.region);
  const activeAudience: CommunityAudience | undefined =
    searchParams?.audience &&
    (COMMUNITY_AUDIENCES as readonly string[]).includes(searchParams.audience)
      ? (searchParams.audience as CommunityAudience)
      : undefined;

  const rawPosts = await listCommunityPosts({
    kind: 'job',
    limit: 80,
    cityId: regionFilter.cityId,
  });

  // フィルタリング
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

  // 並べ替え
  if (sort === 'salary') {
    filtered.sort((a, b) => {
      const aS = annualizedSalary(a) ?? -1;
      const bS = annualizedSalary(b) ?? -1;
      return bS - aS;
    });
  }
  // デフォルト（new）は DB 側で createdAt desc に既に並んでいる

  // URL ビルダー
  const buildHref = (overrides: Record<string, string | undefined | null>) => {
    const params = new URLSearchParams();
    if (activeTypes.length > 0) params.set('type', activeTypes.join(','));
    if (activeCat) params.set('cat', activeCat);
    if (activeLangs.length > 0) params.set('lang', activeLangs.join(','));
    if (remoteOnly) params.set('remote', '1');
    if (minSalary) params.set('min', String(minSalary));
    if (sort !== 'new') params.set('sort', sort);
    if (showFilters) params.set('filters', '1');
    if (regionFilter.active) params.set('region', regionFilter.slug);
    if (activeAudience) params.set('audience', activeAudience);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === undefined || v === '') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/jobs?${qs}` : '/jobs';
  };

  const toggleType = (t: JobEmploymentType) => {
    const next = activeTypes.includes(t)
      ? activeTypes.filter((x) => x !== t)
      : [...activeTypes, t];
    return buildHref({ type: next.length > 0 ? next.join(',') : null });
  };

  const toggleLang = (l: Lang) => {
    const next = activeLangs.includes(l)
      ? activeLangs.filter((x) => x !== l)
      : [...activeLangs, l];
    return buildHref({ lang: next.length > 0 ? next.join(',') : null });
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
        <CommunityNav active="job" />
      </div>

      <div className="mt-3">
        <CommunityRegionPicker
          basePath="/jobs"
          activeSlug={regionFilter.slug}
          preserveQuery={{
            type: activeTypes.length > 0 ? activeTypes.join(',') : undefined,
            cat: activeCat,
            lang: activeLangs.length > 0 ? activeLangs.join(',') : undefined,
            remote: remoteOnly ? '1' : undefined,
            min: minSalary ? String(minSalary) : undefined,
            sort: sort !== 'new' ? sort : undefined,
            filters: showFilters ? '1' : undefined,
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
            <Briefcase className="h-3 w-3" />
            求人
          </p>
          <h1
            className="mt-2 text-[30px] font-bold leading-tight tracking-tight"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            {regionFilter.active ? regionFilter.nameJa : 'フランス'}ではたらく
          </h1>
          <p className="mt-2 text-[14px] leading-[1.9] text-foreground/70">
            日系企業のオフィスから、飲食、翻訳、教育、IT まで。
            日本語話者を募集するお仕事を集めました。
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary-500 px-4 py-2 text-[12px] font-bold text-neutral-950 transition hover:bg-primary-300"
        >
          <Plus className="h-3.5 w-3.5" />
          求人を出す
        </Link>
      </header>

      <div className="mb-4">
        <CommunityDisclaimer kind="job" />
      </div>

      {/* SUUMO 風のドロップダウンフィルタ。プル選択 → 適用ボタンで GET */}
      <form
        action="/jobs"
        method="GET"
        className="mb-5 flex flex-wrap items-end gap-2 rounded-xl bg-card p-3 ring-1 ring-border sm:p-4"
      >
        {regionFilter.active ? (
          <input type="hidden" name="region" value={regionFilter.slug} />
        ) : null}
        {activeAudience ? (
          <input type="hidden" name="audience" value={activeAudience} />
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
        <FilterSelect
          name="remote"
          label="リモート"
          defaultValue={remoteOnly ? '1' : ''}
          options={[
            { value: '', label: '問わず' },
            { value: '1', label: 'リモート OK' },
          ]}
        />
        <FilterSelect
          name="sort"
          label="並び順"
          defaultValue={sort}
          options={[
            { value: 'new', label: '新着順' },
            { value: 'salary', label: '給与高い順' },
          ]}
        />
        <div className="flex flex-1 items-end gap-2">
          <div className="flex-1 min-w-0">
            <label
              htmlFor="min"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-foreground/55"
            >
              年収下限（€）
            </label>
            <input
              id="min"
              type="number"
              name="min"
              min={0}
              step={1000}
              defaultValue={minSalary ?? ''}
              placeholder="35000"
              className="h-9 w-full min-w-0 rounded-md border border-border bg-background px-2 text-[12px] tabular focus:border-2 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-md bg-primary-500 px-4 text-[12px] font-bold text-neutral-950 hover:bg-primary-300"
          >
            適用
          </button>
          {(activeTypes.length > 0 ||
            activeCat ||
            activeLangs.length > 0 ||
            remoteOnly ||
            minSalary ||
            sort !== 'new') ? (
            <Link
              href={buildHref({
                type: null,
                cat: null,
                lang: null,
                remote: null,
                min: null,
                sort: null,
              })}
              className="h-9 shrink-0 inline-flex items-center rounded-md bg-card px-3 text-[11px] font-medium text-foreground/65 ring-1 ring-border hover:bg-muted"
            >
              リセット
            </Link>
          ) : null}
        </div>
      </form>

      {/* 旧 UI のピルやチェックは削除（プルダウンに統一）。
          以下のブロックは後方互換のため残してあるが showFilters=1 のときだけ展開する */}
      <div
        role="tablist"
        aria-label="雇用形態で絞り込み"
        className="mb-2 hidden flex-wrap items-center gap-1.5"
      >
        <Link
          href={buildHref({ type: null })}
          role="tab"
          aria-selected={activeTypes.length === 0}
          className={
            'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
            (activeTypes.length === 0
              ? 'bg-primary-500 text-neutral-950'
              : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
          }
        >
          すべての形態
        </Link>
        {JOB_EMPLOYMENT_TYPES.map((t) => {
          const on = activeTypes.includes(t);
          return (
            <Link
              key={t}
              href={toggleType(t)}
              role="tab"
              aria-selected={on}
              className={
                'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                (on
                  ? 'bg-primary-500 text-neutral-950'
                  : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15')
              }
            >
              {JOB_EMPLOYMENT_TYPE_LABEL[t]}
            </Link>
          );
        })}
      </div>

      {/* 詳細フィルタ折りたたみ */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link
          href={buildHref({ filters: showFilters ? null : '1' })}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground/70 hover:bg-muted"
        >
          <ChevronDown
            className={
              'h-3.5 w-3.5 transition-transform ' +
              (showFilters ? 'rotate-180' : '')
            }
          />
          詳細フィルタ
        </Link>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-foreground/55">
          <span>並び順:</span>
          <Link
            href={buildHref({ sort: null })}
            className={
              'rounded-full px-2.5 py-1 font-semibold transition ' +
              (sort === 'new'
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground/65 hover:bg-foreground/15')
            }
          >
            新着
          </Link>
          <Link
            href={buildHref({ sort: 'salary' })}
            className={
              'rounded-full px-2.5 py-1 font-semibold transition ' +
              (sort === 'salary'
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground/65 hover:bg-foreground/15')
            }
          >
            給与高い順
          </Link>
        </div>
      </div>

      {showFilters ? (
        <section
          aria-label="詳細フィルタ"
          className="mb-5 space-y-3 rounded-lg border border-border bg-card p-4 text-[12px]"
        >
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
              職種カテゴリ
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
              {JOB_CATEGORIES.map((c) => (
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
                  {JOB_CATEGORY_LABEL[c]}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
              言語要件（いずれかを含む）
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_LANGS.map((l) => {
                const on = activeLangs.includes(l);
                return (
                  <Link
                    key={l}
                    href={toggleLang(l)}
                    className={
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                      (on
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-foreground/65 hover:bg-foreground/15')
                    }
                  >
                    {LANG_LABEL[l]}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={buildHref({ remote: remoteOnly ? null : '1' })}
              className={
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                (remoteOnly
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground/65 hover:bg-foreground/15')
              }
            >
              <Wifi className="h-3 w-3" />
              リモート OK のみ
            </Link>

            <form action="/jobs" method="GET" className="flex items-center gap-1.5">
              {/* 既存 params を hidden で持ち回す */}
              {regionFilter.active ? (
                <input type="hidden" name="region" value={regionFilter.slug} />
              ) : null}
              {activeAudience ? (
                <input type="hidden" name="audience" value={activeAudience} />
              ) : null}
              {activeTypes.length > 0 ? (
                <input type="hidden" name="type" value={activeTypes.join(',')} />
              ) : null}
              {activeCat ? (
                <input type="hidden" name="cat" value={activeCat} />
              ) : null}
              {activeLangs.length > 0 ? (
                <input type="hidden" name="lang" value={activeLangs.join(',')} />
              ) : null}
              {remoteOnly ? <input type="hidden" name="remote" value="1" /> : null}
              {sort !== 'new' ? (
                <input type="hidden" name="sort" value={sort} />
              ) : null}
              <input type="hidden" name="filters" value="1" />
              <label
                htmlFor="min"
                className="text-[11px] font-semibold text-foreground/65"
              >
                年収下限 €
              </label>
              <input
                id="min"
                type="number"
                name="min"
                min={0}
                step={1000}
                defaultValue={minSalary ?? ''}
                placeholder="35000"
                className="w-24 rounded-md border border-border bg-background px-2 py-1 text-[12px] tabular focus:border-2 focus:border-primary-500 focus:px-[7px] focus:py-[3px] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-primary-500 px-2.5 py-1 text-[11px] font-bold text-neutral-950 hover:bg-primary-300"
              >
                適用
              </button>
              {minSalary ? (
                <Link
                  href={buildHref({ min: null })}
                  className="text-[11px] text-foreground/55 hover:underline"
                >
                  解除
                </Link>
              ) : null}
            </form>
          </div>
        </section>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-[13px] text-foreground/55">
          条件に合う求人はまだありません。
          <br />
          フィルタを緩めて再度お試しください。
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <JobCard key={p.id} post={p} />
          ))}
        </ul>
      )}
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
    <div className="min-w-[120px] flex-1 sm:flex-none">
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

  return (
    <li>
      <Link
        href={`/jobs/${post.id}`}
        className="block rounded-lg bg-card p-4 ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
      >
        <div className="flex flex-wrap items-center gap-1.5">
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
              Remote OK
            </span>
          ) : null}
          <AudienceBadge audience={meta.audience} />
        </div>

        <h2
          className="mt-1.5 text-[16px] font-bold leading-snug text-foreground"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          {post.title}
        </h2>

        <dl className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-foreground/70">
          {salary ? (
            <div className="inline-flex items-center gap-1 font-semibold text-primary-300">
              <span>{salary}</span>
            </div>
          ) : (
            <div className="text-foreground/45">給与情報なし</div>
          )}
          {post.locationText ? (
            <div className="inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {post.locationText}
            </div>
          ) : null}
          {meta.language_requirements && meta.language_requirements.length > 0 ? (
            <div className="inline-flex items-center gap-0.5">
              <span aria-hidden>言語:</span>
              {meta.language_requirements.map((l) => LANG_LABEL[l]).join(' / ')}
            </div>
          ) : null}
        </dl>

        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-foreground/50">
          <span className="inline-flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {formatPostedAt(post.createdAt)} 投稿
          </span>
          {expDays !== null && expDays >= 0 ? (
            <span
              className={
                'tabular ' +
                (expiringSoon ? 'font-bold text-danger-500' : 'text-foreground/45')
              }
            >
              締切まで {expDays}日
            </span>
          ) : null}
          {post.priceUnit && !salary ? (
            <span className="text-foreground/45">
              {PRICE_UNIT_LABEL[post.priceUnit as keyof typeof PRICE_UNIT_LABEL]}
            </span>
          ) : null}
        </p>
      </Link>
    </li>
  );
}
