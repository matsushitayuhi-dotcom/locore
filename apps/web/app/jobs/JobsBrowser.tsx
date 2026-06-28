'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MapPin,
  Clock,
  Wifi,
  Plus,
  Inbox,
  ImageIcon,
  ChevronDown,
  List,
  LayoutGrid,
  SlidersHorizontal,
  X,
  Search,
  ShieldCheck,
  Flame,
  Languages,
} from 'lucide-react';
import { PostFab } from '@/components/community/PostFab';
import {
  JOB_EMPLOYMENT_TYPES,
  JOB_EMPLOYMENT_TYPE_LABEL,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABEL,
  JOB_CONTRACT_TYPES,
  JOB_CONTRACT_TYPE_LABEL,
  JOB_INDUSTRIES,
  JOB_INDUSTRY_LABEL,
  JOB_BENEFIT_LABEL,
  PRICE_UNIT_LABEL,
  type JobEmploymentType,
  type JobCategory,
  type JobContractType,
  type JobIndustry,
  type CommunityAudience,
} from '@/lib/community/constants';

/**
 * /jobs のクライアント側フィルタ + 一覧描画。
 *
 * 【2026-06 キャッシュ改修】
 * サーバーは「最新の求人を全件 (最大 30)」だけ取得して静的レンダリングし、フィルタは
 * このクライアントコンポーネントが担う。/jobs は誰に対しても同一の静的 HTML となり、
 * ?type=... 等のクエリが付いても CDN が同一キャッシュを返す。
 *
 * 【絞り込み再設計】
 * - クイックチップ（ワンタップ）: ビザサポート / リモート / 急募 / 日本語OK
 * - キーワード検索（title / body 先頭 / skills を対象。クライアントで部分一致）
 * - エリア（都市）・対象者（既存）
 * - 詳細シート: 雇用形態 / 契約形態 / 職種 / 業種 / 給与レンジ min–max / 語学 / 並び順
 */

type Lang = 'ja' | 'fr' | 'en';
const LANG_LABEL: Record<Lang, string> = {
  ja: '日本語',
  fr: 'フランス語',
  en: '英語',
};
const ALL_LANGS: Lang[] = ['ja', 'fr', 'en'];

type Sort = 'new' | 'salary';
type View = 'card' | 'list';

export type JobRegion = { slug: string; label: string };

type JobMeta = {
  employment_type?: JobEmploymentType;
  category?: JobCategory;
  language_requirements?: Lang[];
  remote_ok?: boolean;
  audience?: CommunityAudience;
  salary_period?: string;
  region_slug?: string;
  // 拡張
  contract_type?: JobContractType;
  industry?: JobIndustry;
  visa_sponsorship?: boolean;
  urgent?: boolean;
  salary_max?: number;
  salary_kind?: 'gross' | 'net';
  remote_type?: 'onsite' | 'hybrid' | 'remote';
  japanese_language_ok?: 'required' | 'preferred' | 'not_required';
  benefits?: string[];
};

/**
 * クライアントへ渡す求人 1 件のスリム表現。
 * カードに表示しない author / contactEmail / viewCount 等は含めず payload を最小化。
 * searchText はキーワード検索用に本文先頭+スキルを畳んだ小さな文字列。
 */
export type JobListPost = {
  id: string;
  title: string;
  photo: string | null;
  locationText: string | null;
  priceAmount: number | null;
  priceCurrency: string;
  priceUnit: string | null;
  createdAt: string;
  expiresAt: string | null;
  searchText: string;
  meta: JobMeta;
};

function annualizedSalary(post: JobListPost): number | null {
  const amount = post.priceAmount;
  if (!amount) return null;
  const period = post.meta.salary_period ?? post.priceUnit;
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

function currencySym(cur: string): string {
  return cur === 'JPY' ? '¥' : '€';
}

function formatSalary(post: JobListPost): string | null {
  const meta = post.meta;
  if (!post.priceAmount) {
    if (meta.salary_period === 'negotiable') return '応相談';
    return null;
  }
  const period = meta.salary_period ?? post.priceUnit ?? 'monthly';
  const unitLabel =
    period === 'annual'
      ? '年収'
      : period === 'monthly'
        ? '月給'
        : period === 'hourly'
          ? '時給'
          : '';
  const sym = currencySym(post.priceCurrency);
  const min = new Intl.NumberFormat('fr-FR').format(post.priceAmount);
  // レンジ表示 (salary_max が下限超過時のみ)
  if (meta.salary_max && meta.salary_max > post.priceAmount) {
    const max = new Intl.NumberFormat('fr-FR').format(meta.salary_max);
    return `${unitLabel} ${sym}${min}〜${sym}${max}`;
  }
  return `${unitLabel} ${sym}${min}`;
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

function isRemote(meta: JobMeta): boolean {
  return Boolean(meta.remote_ok) || (meta.remote_type != null && meta.remote_type !== 'onsite');
}

type FilterState = {
  region: string | undefined;
  audience: CommunityAudience | undefined;
  q: string;
  type: JobEmploymentType | undefined;
  contract: JobContractType | undefined;
  cat: JobCategory | undefined;
  industry: JobIndustry | undefined;
  lang: Lang | undefined;
  min: number | null;
  max: number | null;
  // クイックチップ
  visa: boolean;
  remote: boolean;
  urgent: boolean;
  jpok: boolean;
  sort: Sort;
  view: View;
};

const EMPTY_FILTERS: FilterState = {
  region: undefined,
  audience: undefined,
  q: '',
  type: undefined,
  contract: undefined,
  cat: undefined,
  industry: undefined,
  lang: undefined,
  min: null,
  max: null,
  visa: false,
  remote: false,
  urgent: false,
  jpok: false,
  sort: 'new',
  view: 'card',
};

function initFromSearch(sp: URLSearchParams): FilterState {
  const typeRaw = sp.get('type')?.split(',')[0];
  const type = (JOB_EMPLOYMENT_TYPES as readonly string[]).includes(typeRaw ?? '')
    ? (typeRaw as JobEmploymentType)
    : undefined;
  const contractRaw = sp.get('contract') ?? undefined;
  const contract =
    contractRaw && (JOB_CONTRACT_TYPES as readonly string[]).includes(contractRaw)
      ? (contractRaw as JobContractType)
      : undefined;
  const catRaw = sp.get('cat') ?? undefined;
  const cat = catRaw && (JOB_CATEGORIES as readonly string[]).includes(catRaw)
    ? (catRaw as JobCategory)
    : undefined;
  const indRaw = sp.get('industry') ?? undefined;
  const industry =
    indRaw && (JOB_INDUSTRIES as readonly string[]).includes(indRaw)
      ? (indRaw as JobIndustry)
      : undefined;
  const langRaw = sp.get('lang')?.split(',')[0];
  const lang = (ALL_LANGS as readonly string[]).includes(langRaw ?? '')
    ? (langRaw as Lang)
    : undefined;
  const audRaw = sp.get('audience') ?? undefined;
  const audience =
    audRaw === 'traveler' || audRaw === 'resident' || audRaw === 'both'
      ? (audRaw as CommunityAudience)
      : undefined;
  const minN = Number(sp.get('min'));
  const maxN = Number(sp.get('max'));
  return {
    region: sp.get('region') ?? undefined,
    audience,
    q: sp.get('q') ?? '',
    type,
    contract,
    cat,
    industry,
    lang,
    min: Number.isFinite(minN) && minN > 0 ? minN : null,
    max: Number.isFinite(maxN) && maxN > 0 ? maxN : null,
    visa: sp.get('visa') === '1',
    remote: sp.get('remote') === '1',
    urgent: sp.get('urgent') === '1',
    jpok: sp.get('jpok') === '1',
    sort: sp.get('sort') === 'salary' ? 'salary' : 'new',
    view: sp.get('view') === 'list' ? 'list' : 'card',
  };
}

export function JobsBrowser({
  posts,
  regions,
}: {
  posts: JobListPost[];
  regions: JobRegion[];
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  // 初回マウント時のみ URL からフィルタ復元（ディープリンク対応）。
  useEffect(() => {
    setFilters(initFromSearch(new URLSearchParams(sp.toString())));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // フィルタ変更を URL に反映（共有用）。サーバーは searchParams を読まないので
  // この replace は静的キャッシュを叩くだけで Origin には到達しない。
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.region) params.set('region', filters.region);
    if (filters.audience) params.set('audience', filters.audience);
    if (filters.q.trim()) params.set('q', filters.q.trim());
    if (filters.type) params.set('type', filters.type);
    if (filters.contract) params.set('contract', filters.contract);
    if (filters.cat) params.set('cat', filters.cat);
    if (filters.industry) params.set('industry', filters.industry);
    if (filters.lang) params.set('lang', filters.lang);
    if (filters.min) params.set('min', String(filters.min));
    if (filters.max) params.set('max', String(filters.max));
    if (filters.visa) params.set('visa', '1');
    if (filters.remote) params.set('remote', '1');
    if (filters.urgent) params.set('urgent', '1');
    if (filters.jpok) params.set('jpok', '1');
    if (filters.sort !== 'new') params.set('sort', filters.sort);
    if (filters.view !== 'card') params.set('view', filters.view);
    const qs = params.toString();
    router.replace(qs ? `/jobs?${qs}` : '/jobs', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const out = posts.filter((p) => {
      const meta = p.meta;
      if (filters.region) {
        const rs = meta.region_slug;
        if (rs && rs !== filters.region) return false;
      }
      if (q && !p.searchText.includes(q)) return false;
      if (filters.type) {
        if (!meta.employment_type || meta.employment_type !== filters.type) return false;
      }
      if (filters.contract && meta.contract_type !== filters.contract) return false;
      if (filters.cat && meta.category !== filters.cat) return false;
      if (filters.industry && meta.industry !== filters.industry) return false;
      if (filters.lang) {
        const langs = meta.language_requirements ?? [];
        if (!langs.includes(filters.lang)) return false;
      }
      // クイックチップ
      if (filters.visa && !meta.visa_sponsorship) return false;
      if (filters.remote && !isRemote(meta)) return false;
      if (filters.urgent && !meta.urgent) return false;
      if (filters.jpok && meta.japanese_language_ok === 'required') return false;
      // 給与レンジ (annualized で両側)
      if (filters.min || filters.max) {
        const annual = annualizedSalary(p);
        if (annual === null) return false;
        if (filters.min && annual < filters.min) return false;
        if (filters.max && annual > filters.max) return false;
      }
      if (filters.audience) {
        if (
          meta.audience &&
          meta.audience !== 'both' &&
          meta.audience !== filters.audience
        ) {
          return false;
        }
      }
      return true;
    });
    if (filters.sort === 'salary') {
      out.sort(
        (a, b) => (annualizedSalary(b) ?? -1) - (annualizedSalary(a) ?? -1),
      );
    }
    return out;
  }, [posts, filters]);

  const sheetCount =
    (filters.type ? 1 : 0) +
    (filters.contract ? 1 : 0) +
    (filters.cat ? 1 : 0) +
    (filters.industry ? 1 : 0) +
    (filters.lang ? 1 : 0) +
    (filters.min || filters.max ? 1 : 0) +
    (filters.sort !== 'new' ? 1 : 0);

  const activeRegionLabel =
    regions.find((r) => r.slug === filters.region)?.label ?? '都市';
  const audienceLabel =
    filters.audience === 'traveler'
      ? '旅行者'
      : filters.audience === 'resident'
        ? '駐在員'
        : '対象';

  return (
    <>
      {/* ===== キーワード検索 ===== */}
      <div className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
        <input
          type="search"
          value={filters.q}
          onChange={(e) => set('q', e.target.value)}
          placeholder="キーワードで検索（職種・スキル・会社など）"
          className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-9 text-[13px] focus:border-2 focus:border-primary-500 focus:pl-[35px] focus:outline-none"
        />
        {filters.q ? (
          <button
            type="button"
            aria-label="検索をクリア"
            onClick={() => set('q', '')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-foreground/45 hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* ===== クイックチップ ===== */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <QuickChip
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label="ビザサポート"
          active={filters.visa}
          onClick={() => set('visa', !filters.visa)}
        />
        <QuickChip
          icon={<Wifi className="h-3.5 w-3.5" />}
          label="リモート"
          active={filters.remote}
          onClick={() => set('remote', !filters.remote)}
        />
        <QuickChip
          icon={<Flame className="h-3.5 w-3.5" />}
          label="急募"
          active={filters.urgent}
          onClick={() => set('urgent', !filters.urgent)}
        />
        <QuickChip
          icon={<Languages className="h-3.5 w-3.5" />}
          label="日本語OK"
          active={filters.jpok}
          onClick={() => set('jpok', !filters.jpok)}
        />
      </div>

      {/* ===== コンパクトフィルタバー ===== */}
      <div
        className="sticky top-[100px] z-10 -mx-4 mt-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:mx-0"
        data-community-filterbar
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {/* 都市 */}
          <Dropdown
            icon={<MapPin className="h-3.5 w-3.5" />}
            label={activeRegionLabel}
            active={!!filters.region}
          >
            <DropItem
              label="すべて"
              active={!filters.region}
              onClick={() => set('region', undefined)}
            />
            {regions.map((r) => (
              <DropItem
                key={r.slug}
                label={r.label}
                active={filters.region === r.slug}
                onClick={() => set('region', r.slug)}
              />
            ))}
          </Dropdown>

          {/* 対象者 */}
          <Dropdown icon={null} label={audienceLabel} active={!!filters.audience}>
            <DropItem
              label="すべて"
              active={!filters.audience}
              onClick={() => set('audience', undefined)}
            />
            <DropItem
              label="旅行者"
              active={filters.audience === 'traveler'}
              onClick={() => set('audience', 'traveler')}
            />
            <DropItem
              label="駐在員"
              active={filters.audience === 'resident'}
              onClick={() => set('audience', 'resident')}
            />
          </Dropdown>

          {/* 絞り込みシート起動 */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={
              'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ' +
              (sheetCount > 0
                ? 'bg-primary-500 text-neutral-950'
                : 'bg-muted text-foreground/75 hover:bg-foreground/10')
            }
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            絞り込み{sheetCount > 0 ? ` (${sheetCount})` : ''}
          </button>

          {/* ビュートグル */}
          <div className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted p-0.5 ring-1 ring-border">
            <button
              type="button"
              aria-label="カード"
              onClick={() => set('view', 'card')}
              className={
                'inline-flex items-center rounded-full p-1.5 transition ' +
                (filters.view === 'card'
                  ? 'bg-primary-500 text-neutral-950 shadow-sm'
                  : 'text-foreground/60 hover:text-foreground')
              }
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="リスト"
              onClick={() => set('view', 'list')}
              className={
                'inline-flex items-center rounded-full p-1.5 transition ' +
                (filters.view === 'list'
                  ? 'bg-primary-500 text-neutral-950 shadow-sm'
                  : 'text-foreground/60 hover:text-foreground')
              }
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ===== 件数 ===== */}
      <p className="mt-4 mb-3 text-[12px] text-foreground/55 tabular">
        {filtered.length} 件
      </p>

      {/* ===== 一覧 ===== */}
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
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
            >
              条件をリセット
            </button>
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-1 rounded-full border-2 border-primary-700 bg-primary-700 px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition hover:border-primary-500 hover:bg-primary-500"
            >
              <Plus className="h-3 w-3" />
              求人を出す
            </Link>
          </div>
        </div>
      ) : filters.view === 'list' ? (
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

      <PostFab href="/jobs/new" label="求人を出す" />

      {/* ===== 絞り込みシート ===== */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-background p-4 shadow-xl sm:max-w-md sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-bold">絞り込み</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="閉じる"
                className="rounded-full p-1.5 text-foreground/60 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <SelectField
                label="雇用形態"
                value={filters.type ?? ''}
                onChange={(v) =>
                  set('type', (v || undefined) as JobEmploymentType | undefined)
                }
                options={[
                  { value: '', label: 'すべて' },
                  ...JOB_EMPLOYMENT_TYPES.map((t) => ({
                    value: t,
                    label: JOB_EMPLOYMENT_TYPE_LABEL[t],
                  })),
                ]}
              />
              <SelectField
                label="契約形態"
                value={filters.contract ?? ''}
                onChange={(v) =>
                  set('contract', (v || undefined) as JobContractType | undefined)
                }
                options={[
                  { value: '', label: 'すべて' },
                  ...JOB_CONTRACT_TYPES.map((t) => ({
                    value: t,
                    label: JOB_CONTRACT_TYPE_LABEL[t],
                  })),
                ]}
              />
              <SelectField
                label="職種"
                value={filters.cat ?? ''}
                onChange={(v) =>
                  set('cat', (v || undefined) as JobCategory | undefined)
                }
                options={[
                  { value: '', label: 'すべて' },
                  ...JOB_CATEGORIES.map((c) => ({
                    value: c,
                    label: JOB_CATEGORY_LABEL[c],
                  })),
                ]}
              />
              <SelectField
                label="業種"
                value={filters.industry ?? ''}
                onChange={(v) =>
                  set('industry', (v || undefined) as JobIndustry | undefined)
                }
                options={[
                  { value: '', label: 'すべて' },
                  ...JOB_INDUSTRIES.map((c) => ({
                    value: c,
                    label: JOB_INDUSTRY_LABEL[c],
                  })),
                ]}
              />
              <SelectField
                label="言語要件"
                value={filters.lang ?? ''}
                onChange={(v) => set('lang', (v || undefined) as Lang | undefined)}
                options={[
                  { value: '', label: '問わず' },
                  ...ALL_LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] })),
                ]}
              />
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
                  年収レンジ（€・年額換算）
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={filters.min ?? ''}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      set('min', Number.isFinite(n) && n > 0 ? n : null);
                    }}
                    placeholder="下限 35000"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-[13px] tabular focus:border-2 focus:border-primary-500 focus:outline-none"
                  />
                  <span className="text-foreground/40">〜</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={filters.max ?? ''}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      set('max', Number.isFinite(n) && n > 0 ? n : null);
                    }}
                    placeholder="上限 60000"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-[13px] tabular focus:border-2 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              <SelectField
                label="並び順"
                value={filters.sort}
                onChange={(v) => set('sort', v === 'salary' ? 'salary' : 'new')}
                options={[
                  { value: 'new', label: '新着順' },
                  { value: 'salary', label: '給与高い順' },
                ]}
              />
            </div>

            <div className="sticky bottom-0 -mx-4 mt-4 flex items-center gap-2 border-t border-border bg-background px-4 pb-1 pt-3">
              <button
                type="button"
                onClick={() =>
                  setFilters((f) => ({
                    ...EMPTY_FILTERS,
                    region: f.region,
                    audience: f.audience,
                    q: f.q,
                    visa: f.visa,
                    remote: f.remote,
                    urgent: f.urgent,
                    jpok: f.jpok,
                    view: f.view,
                  }))
                }
                className="inline-flex h-10 items-center rounded-md bg-card px-4 text-[12px] font-medium text-foreground/70 ring-1 ring-border hover:bg-muted"
              >
                リセット
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="ml-auto inline-flex h-10 items-center rounded-md bg-primary-500 px-6 text-[13px] font-bold text-neutral-950 hover:bg-primary-300"
              >
                適用
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ───────────────────── サブコンポーネント ───────────────────── */

function QuickChip({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ' +
        (active
          ? 'border-primary-500 bg-primary-500 text-neutral-950'
          : 'border-border bg-card text-foreground/70 hover:border-primary-300 hover:text-foreground')
      }
    >
      {icon}
      {label}
    </button>
  );
}

function Dropdown({
  icon,
  label,
  active,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group relative shrink-0">
      <summary
        className={
          'inline-flex cursor-pointer list-none items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ' +
          (active
            ? 'bg-primary-500 text-neutral-950'
            : 'bg-muted text-foreground/75 hover:bg-foreground/10')
        }
      >
        {icon}
        <span className="max-w-[7rem] truncate">{label}</span>
        <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 top-full z-30 mt-1 max-h-[60vh] w-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
        {children}
      </div>
    </details>
  );
}

function DropItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick();
        const d = (e.currentTarget.closest('details') as HTMLDetailsElement) ?? null;
        if (d) d.open = false;
      }}
      className={
        'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] transition ' +
        (active
          ? 'bg-primary-500/15 font-semibold text-primary-300'
          : 'text-foreground/80 hover:bg-muted')
      }
    >
      <span>{label}</span>
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

/** カード/リスト共通のタグ群 (急募・契約形態・ビザ・リモート) */
function JobTags({ meta, small }: { meta: JobMeta; small?: boolean }) {
  const sz = small ? 'text-[9px]' : 'text-[9px]';
  return (
    <>
      {meta.urgent ? (
        <span className={`inline-flex items-center gap-0.5 rounded-sm bg-warning-500 px-1.5 py-0.5 ${sz} font-bold uppercase tracking-wider text-white shadow-sm`}>
          急募
        </span>
      ) : null}
      {meta.contract_type ? (
        <span className={`rounded-sm bg-primary-500/90 px-1.5 py-0.5 ${sz} font-bold uppercase tracking-wider text-neutral-950 shadow-sm`}>
          {JOB_CONTRACT_TYPE_LABEL[meta.contract_type].split('（')[0]}
        </span>
      ) : meta.employment_type ? (
        <span className={`rounded-sm bg-primary-500/90 px-1.5 py-0.5 ${sz} font-bold uppercase tracking-wider text-neutral-950 shadow-sm`}>
          {JOB_EMPLOYMENT_TYPE_LABEL[meta.employment_type]}
        </span>
      ) : null}
      {meta.visa_sponsorship ? (
        <span className={`rounded-sm bg-card/95 px-1.5 py-0.5 ${sz} font-bold uppercase tracking-wider text-primary-700 shadow-sm ring-1 ring-border/60 backdrop-blur`}>
          ビザ支援
        </span>
      ) : null}
      {isRemote(meta) ? (
        <span className={`inline-flex items-center gap-0.5 rounded-sm bg-accent-500/90 px-1.5 py-0.5 ${sz} font-bold uppercase tracking-wider text-neutral-950 shadow-sm`}>
          <Wifi className="h-2.5 w-2.5" />
          Remote
        </span>
      ) : null}
    </>
  );
}

function JobListItem({ post }: { post: JobListPost }) {
  const meta = post.meta;
  const salary = formatSalary(post);
  const hero = post.photo;

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
            <JobTags meta={meta} small />
            {meta.category ? (
              <span className="rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/65">
                {JOB_CATEGORY_LABEL[meta.category]}
              </span>
            ) : null}
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

function JobCard({ post }: { post: JobListPost }) {
  const meta = post.meta;
  const salary = formatSalary(post);
  const expDays = daysUntil(post.expiresAt);
  const expiringSoon = expDays !== null && expDays >= 0 && expDays <= 3;
  const cover = post.photo;

  // 福利厚生のミニ表示 (最大 2 件)
  const benefitLabels = (meta.benefits ?? [])
    .slice(0, 2)
    .map((k) => JOB_BENEFIT_LABEL[k] ?? k);

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
            <JobTags meta={meta} />
            {meta.category ? (
              <span className="rounded-sm bg-card/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/75 shadow-sm ring-1 ring-border/60 backdrop-blur">
                {JOB_CATEGORY_LABEL[meta.category]}
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
            {!salary && <li className="text-foreground/45">給与情報なし</li>}
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

          {/* 福利厚生ミニ表示 */}
          {benefitLabels.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {benefitLabels.map((b) => (
                <span
                  key={b}
                  className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-medium text-primary-700"
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}

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
