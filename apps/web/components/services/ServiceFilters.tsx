import Link from 'next/link';
import { Search } from 'lucide-react';
import type { ActiveCityForPicker } from '@/lib/geo/countries';
import type { TagWithCount } from '@/lib/services/list';
import { TAG_LABEL } from '@/lib/services/tagLabels';
import { ServiceFiltersTagSection } from './ServiceFiltersTagSection';

/**
 * /services ブラウズページ用のフィルタバー (Server Component)。
 *
 * URL クエリで状態管理:
 *   ?audience=all|traveler|resident
 *   ?city=<slug>
 *   ?tags=<tag1>,<tag2>,...    (0055 で導入。複数選択、& overlap)
 *   ?cat=<category>            (旧 UI 用 hidden 維持。新 UI には出さない)
 *   ?q=<freetext>
 *   ?min=<priceJpy>
 *   ?max=<priceJpy>
 *
 * GET form で素直に書ける部分は GET form、タグ chips は事前構築リンクで実装する。
 *
 * タグ chips: 件数の多い順に上位 15 を最初に表示し、それ以外は
 * `<details>` の "+他のタグ" 展開ブロックで開く (Server Component で完結)。
 */

const AUDIENCE_TABS: Array<{
  key: 'all' | 'traveler' | 'resident';
  label: string;
}> = [
  { key: 'all', label: 'すべて' },
  { key: 'traveler', label: '旅行者向け' },
  { key: 'resident', label: '駐在員向け' },
];

export type ServiceFiltersState = {
  audience: 'all' | 'traveler' | 'resident';
  city?: string;
  /** 旧 UI で使っていた単一カテゴリ。新 UI では tags に統合済だが、後方互換で受け取る。 */
  cat?: string;
  tags: string[];
  q?: string;
  min?: number;
  max?: number;
};

type Props = {
  state: ServiceFiltersState;
  cities: ActiveCityForPicker[];
  allTags: TagWithCount[];
};

const TOP_TAG_COUNT = 15;

export function buildServicesHref(
  state: ServiceFiltersState,
  patch: Partial<ServiceFiltersState>,
): string {
  const next = { ...state, ...patch };
  const sp = new URLSearchParams();
  if (next.audience && next.audience !== 'all') sp.set('audience', next.audience);
  if (next.city) sp.set('city', next.city);
  if (next.cat) sp.set('cat', next.cat);
  if (next.tags && next.tags.length > 0) sp.set('tags', next.tags.join(','));
  if (next.q) sp.set('q', next.q);
  if (next.min != null) sp.set('min', String(next.min));
  if (next.max != null) sp.set('max', String(next.max));
  const qs = sp.toString();
  return qs ? `/services?${qs}` : '/services';
}

/** タグを toggle (state.tags に対して xor) した href を返す。 */
export function toggleTagHref(
  state: ServiceFiltersState,
  tag: string,
): string {
  const has = state.tags.includes(tag);
  const nextTags = has
    ? state.tags.filter((t) => t !== tag)
    : [...state.tags, tag];
  return buildServicesHref(state, { tags: nextTags });
}

export function ServiceFilters({ state, cities, allTags }: Props) {
  const top = allTags.slice(0, TOP_TAG_COUNT);
  const rest = allTags.slice(TOP_TAG_COUNT);

  // 「選択済みだが top に無いタグ」は常に表示しておきたい (絞り込み中なのに見えない
  //  と外せない)。top に無いものは先頭に prepend する。
  const topTagSet = new Set(top.map((t) => t.tag));
  const extraSelected = state.tags
    .filter((t) => !topTagSet.has(t))
    .map((t) => ({ tag: t, count: 0 }));
  const topRendered = [...extraSelected, ...top];

  return (
    <div className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5">
      {/* audience tabs */}
      <div
        role="tablist"
        aria-label="対象を選ぶ"
        className="flex flex-wrap items-center gap-1.5 rounded-full bg-muted p-1"
      >
        {AUDIENCE_TABS.map((t) => {
          const active = state.audience === t.key;
          return (
            <Link
              key={t.key}
              href={buildServicesHref(state, { audience: t.key })}
              role="tab"
              aria-selected={active}
              className={
                'rounded-full px-3 py-1.5 text-[12px] font-semibold transition ' +
                (active
                  ? 'bg-primary-500 text-neutral-950 shadow-sm'
                  : 'text-foreground/70 hover:bg-primary-500/10 hover:text-foreground')
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* search + city + price (GET form) */}
      <form
        action="/services"
        method="get"
        className="grid gap-2 sm:grid-cols-[1fr_180px_120px_120px_auto]"
      >
        {/* hidden state preserved across submit */}
        {state.audience !== 'all' ? (
          <input type="hidden" name="audience" value={state.audience} />
        ) : null}
        {state.cat ? <input type="hidden" name="cat" value={state.cat} /> : null}
        {state.tags.length > 0 ? (
          <input type="hidden" name="tags" value={state.tags.join(',')} />
        ) : null}

        <label className="relative">
          <span className="sr-only">サービスを検索</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={state.q ?? ''}
            placeholder="サービス名・内容で検索…"
            aria-label="サービスを検索"
            className="h-11 w-full rounded-full bg-background pl-9 pr-3 text-[13px] ring-1 ring-border placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>
        <label>
          <span className="sr-only">都市で絞り込む</span>
          <select
            name="city"
            defaultValue={state.city ?? ''}
            aria-label="都市で絞り込む"
            className="h-11 w-full rounded-full bg-background px-3 text-[13px] ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">都市: すべて</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.countryNameJa ? `${c.countryNameJa} / ` : ''}
                {c.nameJa}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">最低価格 (円)</span>
          <input
            type="number"
            inputMode="numeric"
            name="min"
            min={0}
            defaultValue={state.min ?? ''}
            placeholder="¥ 最低"
            aria-label="最低価格 (円)"
            className="h-11 w-full rounded-full bg-background px-3 text-[13px] ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>
        <label>
          <span className="sr-only">上限価格 (円)</span>
          <input
            type="number"
            inputMode="numeric"
            name="max"
            min={0}
            defaultValue={state.max ?? ''}
            placeholder="¥ 上限"
            aria-label="上限価格 (円)"
            className="h-11 w-full rounded-full bg-background px-3 text-[13px] ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>
        <button
          type="submit"
          className="h-11 rounded-full bg-primary-500 px-5 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
        >
          絞り込む
        </button>
      </form>

      {/* tag chips (multi-select) */}
      <ServiceFiltersTagSection
        state={state}
        topTags={topRendered}
        moreTags={rest}
        renderTagLabel={(t) => TAG_LABEL[t] ?? t}
      />
    </div>
  );
}
