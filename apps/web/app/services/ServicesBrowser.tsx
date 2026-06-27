'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, SearchX } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ServiceCard } from '@/components/services/ServiceCard';
import { TAG_LABEL } from '@/lib/services/tagLabels';
import type { FeaturedService } from '@/lib/services/featured';
import type { ActiveCityForPicker } from '@/lib/geo/countries';
import type { TagWithCount } from '@/lib/services/list';

/**
 * /services のクライアント側フィルタ + 一覧描画。
 *
 * 【2026-06 キャッシュ改修 / /jobs と同方針】
 * サーバーは全アクティブサービスを取得して静的レンダリングし、フィルタはここで行う。
 * searchParams をサーバーで読むと Next.js が強制 no-store 化し /services が一切
 * エッジキャッシュされず Origin Data Transfer が嵩む (クローラが ?tags=... の全
 * 組み合わせを踏むため特に深刻) ため、フィルタを全てクライアントへ移した。
 *
 * - 初期状態は URL の searchParams から 1 度だけ復元（ディープリンク対応）
 * - 以降はクライアント state のみ。サーバーへは問い合わせない
 */

type Audience = 'all' | 'traveler' | 'resident';

type FilterState = {
  audience: Audience;
  /** 国コード (ISO alpha-2 lowercase)。国ハブからの ?country= で初期化。 */
  country: string | undefined;
  city: string | undefined;
  tags: string[];
  q: string;
  min: number | null;
  max: number | null;
};

const EMPTY: FilterState = {
  audience: 'all',
  country: undefined,
  city: undefined,
  tags: [],
  q: '',
  min: null,
  max: null,
};

const COUNTRY_LABEL: Record<string, string> = { fr: 'フランス' };

const TOP_TAG_COUNT = 15;

function parseAudience(v: string | null): Audience {
  return v === 'traveler' || v === 'resident' ? v : 'all';
}
function parseNum(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function initFromSearch(sp: URLSearchParams): FilterState {
  return {
    audience: parseAudience(sp.get('audience')),
    country: sp.get('country')?.trim() || undefined,
    city: sp.get('city')?.trim() || undefined,
    tags: (sp.get('tags') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    q: sp.get('q')?.trim() ?? '',
    min: parseNum(sp.get('min')),
    max: parseNum(sp.get('max')),
  };
}

export function ServicesBrowser({
  services,
  cities,
  allTags,
}: {
  services: FeaturedService[];
  cities: ActiveCityForPicker[];
  allTags: TagWithCount[];
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>(EMPTY);
  const [qInput, setQInput] = useState('');

  // 初回のみ URL から復元
  useEffect(() => {
    const init = initFromSearch(new URLSearchParams(sp.toString()));
    setFilters(init);
    setQInput(init.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // state → URL 同期（共有用。静的キャッシュを叩くだけで Origin には届かない）
  useEffect(() => {
    const p = new URLSearchParams();
    if (filters.audience !== 'all') p.set('audience', filters.audience);
    if (filters.country) p.set('country', filters.country);
    if (filters.city) p.set('city', filters.city);
    if (filters.tags.length) p.set('tags', filters.tags.join(','));
    if (filters.q) p.set('q', filters.q);
    if (filters.min != null) p.set('min', String(filters.min));
    if (filters.max != null) p.set('max', String(filters.max));
    const qs = p.toString();
    router.replace(qs ? `/services?${qs}` : '/services', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const toggleTag = (tag: string) =>
    setFilters((f) => ({
      ...f,
      tags: f.tags.includes(tag)
        ? f.tags.filter((t) => t !== tag)
        : [...f.tags, tag],
    }));

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return services.filter((s) => {
      // audience: NULL は「指定なし」として常に含める
      if (filters.audience === 'traveler') {
        if (s.audience && s.audience !== 'traveler' && s.audience !== 'both')
          return false;
      } else if (filters.audience === 'resident') {
        if (s.audience && s.audience !== 'resident' && s.audience !== 'both')
          return false;
      }
      if (filters.country && s.countryCode !== filters.country) return false;
      if (filters.city && s.citySlug !== filters.city) return false;
      if (filters.tags.length) {
        // overlap: どれか 1 つでも一致
        if (!filters.tags.some((t) => s.tags.includes(t))) return false;
      }
      if (filters.min != null && (s.priceJpy == null || s.priceJpy < filters.min))
        return false;
      if (filters.max != null && (s.priceJpy == null || s.priceJpy > filters.max))
        return false;
      if (q) {
        const hay = [
          s.title,
          s.description ?? '',
          s.category ?? '',
          s.tags.join(' '),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [services, filters]);

  // タグ表示: 上位 15 + 選択中で上位外のものを先頭に
  const top = allTags.slice(0, TOP_TAG_COUNT);
  const rest = allTags.slice(TOP_TAG_COUNT);
  const topSet = new Set(top.map((t) => t.tag));
  const extraSelected = filters.tags
    .filter((t) => !topSet.has(t))
    .map((t) => ({ tag: t, count: 0 }));
  const topRendered = [...extraSelected, ...top];

  const advancedActiveCount =
    (filters.city ? 1 : 0) +
    (filters.min != null ? 1 : 0) +
    (filters.max != null ? 1 : 0) +
    filters.tags.length;

  const anyActive =
    advancedActiveCount > 0 ||
    filters.audience !== 'all' ||
    !!filters.q ||
    !!filters.country;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    set('q', qInput.trim());
  };

  return (
    <>
      <h1 className="sr-only">サービスから探す</h1>

      {filters.country ? (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-primary-700 ring-1 ring-primary-300">
          📍 {COUNTRY_LABEL[filters.country] ?? filters.country} のサービス
          <button
            type="button"
            onClick={() => set('country', undefined)}
            aria-label="国フィルタを解除"
            className="rounded-full px-1 text-primary-700/70 hover:text-primary-700"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        {/* 検索 */}
        <form
          onSubmit={submitSearch}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <label className="relative flex-1">
            <span className="sr-only">サービスを検索</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
              aria-hidden
            />
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="サービス名・内容で検索…"
              aria-label="サービスを検索"
              className="h-11 w-full rounded-full bg-background pl-9 pr-3 text-[13px] ring-1 ring-border placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>

          <button
            type="submit"
            className="h-11 shrink-0 rounded-full bg-primary-500 px-5 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
          >
            検索
          </button>
        </form>

        {/* 詳細フィルタ */}
        <details
          className="group rounded-xl border border-border/60 bg-background/40"
          {...(advancedActiveCount > 0 ? { open: true } : {})}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold text-foreground/75 transition hover:bg-muted [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-1.5">
              絞り込み
              {advancedActiveCount > 0 ? (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-neutral-950">
                  {advancedActiveCount}
                </span>
              ) : null}
            </span>
            <ChevronDown
              className="h-4 w-4 text-foreground/55 transition-transform duration-200 group-open:rotate-180"
              aria-hidden
            />
          </summary>

          <div className="space-y-4 border-t border-border/60 px-4 py-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_120px_120px]">
              <label>
                <span className="sr-only">都市で絞り込む</span>
                <select
                  value={filters.city ?? ''}
                  onChange={(e) => set('city', e.target.value || undefined)}
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
                  min={0}
                  value={filters.min ?? ''}
                  onChange={(e) => set('min', parseNum(e.target.value))}
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
                  min={0}
                  value={filters.max ?? ''}
                  onChange={(e) => set('max', parseNum(e.target.value))}
                  placeholder="¥ 上限"
                  aria-label="上限価格 (円)"
                  className="h-11 w-full rounded-full bg-background px-3 text-[13px] ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>
            </div>

            {/* タグ chips */}
            {topRendered.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {topRendered.map((t) => (
                    <TagChip
                      key={t.tag}
                      label={TAG_LABEL[t.tag] ?? t.tag}
                      active={filters.tags.includes(t.tag)}
                      onClick={() => toggleTag(t.tag)}
                    />
                  ))}
                </div>
                {rest.length > 0 ? (
                  <details className="group/more">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[11px] font-semibold text-primary-300 [&::-webkit-details-marker]:hidden">
                      ＋他のタグ ({rest.length})
                      <ChevronDown className="h-3 w-3 transition-transform group-open/more:rotate-180" />
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {rest.map((t) => (
                        <TagChip
                          key={t.tag}
                          label={TAG_LABEL[t.tag] ?? t.tag}
                          active={filters.tags.includes(t.tag)}
                          onClick={() => toggleTag(t.tag)}
                        />
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}
          </div>
        </details>
      </div>

      {/* 件数 + クリア */}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className="text-[12px] text-foreground/60">
          {filtered.length === 0
            ? '該当 0 件'
            : `${filtered.length.toLocaleString('ja-JP')} 件`}
        </p>
        {anyActive ? (
          <button
            type="button"
            onClick={() => {
              setFilters(EMPTY);
              setQInput('');
            }}
            className="text-[12px] font-semibold text-primary-300 hover:underline"
          >
            フィルタをクリア
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          onClear={() => {
            setFilters(EMPTY);
            setQInput('');
          }}
        />
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((s) => (
            <li key={s.id} className="h-full">
              <ServiceCard service={s} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TagChip({
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
      onClick={onClick}
      aria-pressed={active}
      className={
        'rounded-full px-3 py-1.5 text-[12px] font-semibold transition ' +
        (active
          ? 'bg-primary-500 text-neutral-950'
          : 'bg-muted text-foreground/70 hover:bg-primary-500/10 hover:text-foreground')
      }
    >
      {label}
    </button>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <section className="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <div className="rounded-full bg-muted p-3 text-foreground/50">
        <SearchX className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="text-[15px] font-semibold">該当するサービスがありません</h2>
      <p className="max-w-md text-[12px] text-foreground/60">
        条件を変えるか、別のカテゴリで探してみてください。
        まだ Locore に登録されているサービスは少数なので、希望が無ければ
        ユーザーのプロフィールから直接相談することもできます。
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="rounded-full bg-primary-500 px-4 py-2 text-[12px] font-bold text-neutral-950 hover:bg-primary-300"
        >
          フィルタをクリア
        </button>
        <Link
          href="/users"
          className="rounded-full bg-card px-4 py-2 text-[12px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
        >
          ユーザーを見る
        </Link>
      </div>
    </section>
  );
}
