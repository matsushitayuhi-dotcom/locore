import Link from 'next/link';
import { Search } from 'lucide-react';
import type { ActiveCityForPicker } from '@/lib/geo/countries';

/**
 * /services ブラウズページ用のフィルタバー (Server Component)。
 *
 * URL クエリで状態管理:
 *   ?audience=all|traveler|resident
 *   ?city=<slug>
 *   ?cat=<category>
 *   ?q=<freetext>
 *   ?min=<priceJpy>
 *   ?max=<priceJpy>
 *
 * GET form で素直に / 切替系のチップは事前構築したリンクで実装する。
 */

const AUDIENCE_TABS: Array<{
  key: 'all' | 'traveler' | 'resident';
  label: string;
}> = [
  { key: 'all', label: 'すべて' },
  { key: 'traveler', label: '旅行者向け' },
  { key: 'resident', label: '駐在員向け' },
];

const CATEGORY_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'tourism', label: '観光・現地アテンド' },
  { key: 'consulting', label: 'コンサル・相談' },
  { key: 'study_abroad', label: '留学サポート' },
  { key: 'translation', label: '翻訳・通訳' },
  { key: 'attend', label: '同行・代行' },
  { key: 'other', label: 'その他' },
];

export type ServiceFiltersState = {
  audience: 'all' | 'traveler' | 'resident';
  city?: string;
  cat?: string;
  q?: string;
  min?: number;
  max?: number;
};

type Props = {
  state: ServiceFiltersState;
  cities: ActiveCityForPicker[];
};

function buildHref(state: ServiceFiltersState, patch: Partial<ServiceFiltersState>) {
  const next = { ...state, ...patch };
  const sp = new URLSearchParams();
  if (next.audience && next.audience !== 'all') sp.set('audience', next.audience);
  if (next.city) sp.set('city', next.city);
  if (next.cat) sp.set('cat', next.cat);
  if (next.q) sp.set('q', next.q);
  if (next.min != null) sp.set('min', String(next.min));
  if (next.max != null) sp.set('max', String(next.max));
  const qs = sp.toString();
  return qs ? `/services?${qs}` : '/services';
}

export function ServiceFilters({ state, cities }: Props) {
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
              href={buildHref(state, { audience: t.key })}
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
        {/* hidden state preserved */}
        {state.audience !== 'all' ? (
          <input type="hidden" name="audience" value={state.audience} />
        ) : null}
        {state.cat ? <input type="hidden" name="cat" value={state.cat} /> : null}

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

      {/* category chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href={buildHref(state, { cat: undefined })}
          className={
            'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
            (!state.cat
              ? 'bg-foreground text-background'
              : 'bg-muted text-foreground/70 hover:bg-primary-500/10 hover:text-foreground')
          }
        >
          カテゴリ: すべて
        </Link>
        {CATEGORY_OPTIONS.map((c) => {
          const active = state.cat === c.key;
          return (
            <Link
              key={c.key}
              href={buildHref(state, { cat: active ? undefined : c.key })}
              className={
                'rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
                (active
                  ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-300'
                  : 'bg-muted text-foreground/70 hover:bg-primary-500/10 hover:text-foreground')
              }
            >
              {c.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
