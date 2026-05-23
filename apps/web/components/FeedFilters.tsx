'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Slider, Badge } from '@locore/ui';
import { SlidersHorizontal } from '@locore/ui/icons';
import { ArticleGrid } from './ArticleGrid';
import type { Article, ArticleType } from '../lib/mock';

const TAGS = [
  '朝食',
  '夜遊び',
  'デート',
  '雨の日',
  'カフェ',
  '雑貨',
  'アート',
  '市場',
  '路地裏',
  '子連れ',
  'ローカル',
  '老舗',
];

const SORTS = [
  { id: 'recent', label: '新着順' },
  { id: 'recommend', label: 'おすすめ' },
  { id: 'satisfaction', label: '満足度順' },
  { id: 'localness', label: 'ローカル度順' },
] as const;

const PRICES = [
  { id: 'all', label: 'すべて', min: 0, max: 99999 },
  { id: 'low', label: '〜¥800', min: 0, max: 800 },
  { id: 'mid', label: '¥800〜¥1,500', min: 800, max: 1500 },
  { id: 'high', label: '¥1,500〜', min: 1500, max: 99999 },
];

type TypeFilter = 'all' | ArticleType;

const TYPE_TABS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'spot_guide', label: 'スポット紹介' },
  { id: 'itinerary', label: '旅程プラン' },
  { id: 'expat_info', label: '駐在者情報' },
];

function isTypeFilter(v: string | null | undefined): v is TypeFilter {
  return (
    v === 'all' || v === 'spot_guide' || v === 'itinerary' || v === 'expat_info'
  );
}

type FeedFiltersProps = {
  articles: Article[];
  /** 記事 ID → 社会数（いいね / 保存）。サーバ側で fetch して渡す */
  socialCounts?: Map<string, { likeCount: number; bookmarkCount: number }>;
};

export function FeedFilters({ articles, socialCounts }: FeedFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialType: TypeFilter = (() => {
    const v = searchParams?.get('type');
    return isTypeFilter(v) ? v : 'all';
  })();

  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [localRange, setLocalRange] = useState<number[]>([0, 100]);
  const [price, setPrice] = useState<(typeof PRICES)[number]['id']>('all');
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('recommend');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialType);
  const [open, setOpen] = useState(false);

  // URL クエリ ?type=... に追従（戻る/進む対応）
  useEffect(() => {
    const v = searchParams?.get('type');
    setTypeFilter(isTypeFilter(v) ? v : 'all');
  }, [searchParams]);

  const updateTypeFilter = (next: TypeFilter) => {
    setTypeFilter(next);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (next === 'all') {
      params.delete('type');
    } else {
      params.set('type', next);
    }
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}#feed` : `${pathname}#feed`;
    router.replace(url, { scroll: false });
  };

  const filtered = useMemo(() => {
    const priceCfg = PRICES.find((p) => p.id === price) ?? PRICES[0]!;
    const lo = localRange[0] ?? 0;
    const hi = localRange[1] ?? 100;
    const list = articles.filter((a) => {
      if (typeFilter !== 'all' && a.articleType !== typeFilter) {
        return false;
      }
      if (activeTags.length > 0 && !activeTags.some((t) => a.tags.includes(t))) {
        return false;
      }
      if (a.localScoreAverage < lo || a.localScoreAverage > hi) {
        return false;
      }
      if (a.priceJpy < priceCfg.min || a.priceJpy > priceCfg.max) return false;
      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === 'recent') {
        return b.publishedAt.localeCompare(a.publishedAt);
      }
      if (sort === 'satisfaction') {
        return b.satisfactionAverage - a.satisfactionAverage;
      }
      if (sort === 'localness') {
        return b.localScoreAverage - a.localScoreAverage;
      }
      // recommend = local + satisfaction + purchase weight
      const score = (x: Article) =>
        x.localScoreAverage * 0.5 +
        x.satisfactionAverage * 10 +
        Math.min(x.purchaseCount, 1000) * 0.05;
      return score(b) - score(a);
    });
    return sorted;
  }, [articles, activeTags, localRange, price, sort, typeFilter]);

  // 詳細フィルタ内のアクティブ条件数（バッジ用）
  const advancedActiveCount =
    (typeFilter !== 'all' ? 1 : 0) +
    activeTags.length +
    (price !== 'all' ? 1 : 0) +
    ((localRange[0] ?? 0) > 0 || (localRange[1] ?? 100) < 100 ? 1 : 0);

  return (
    <div>
      {/* 検索 + 絞り込みボタン 1 行 */}
      <div className="mb-4 flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">記事を絞り込む</span>
          <input
            type="search"
            placeholder="絞り込み…"
            aria-label="記事を絞り込む"
            onFocus={() => setOpen(true)}
            className="h-11 w-full rounded-full bg-background pl-4 pr-3 text-[13px] ring-1 ring-border placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-[12px] font-semibold text-foreground/80 transition active:scale-[0.96] hover:bg-muted"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          絞り込み
          {advancedActiveCount > 0 ? (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-neutral-950">
              {advancedActiveCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* 詳細フィルタ (折りたたみ) — カテゴリも含めて全部ここに */}
      {open ? (
        <div className="mb-5 rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/50">
              カテゴリ
            </p>
            <div
              role="tablist"
              aria-label="記事の種別で絞り込む"
              className="flex flex-wrap items-center gap-1.5"
            >
              {TYPE_TABS.map((t) => {
                const active = t.id === typeFilter;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => updateTypeFilter(t.id)}
                    className={
                      'inline-flex min-h-[32px] items-center rounded-full border px-3 py-1 text-[12px] font-medium transition active:scale-[0.96] ' +
                      (active
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-foreground/70 hover:border-foreground/30')
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 border-t border-border/60 pt-4 md:grid-cols-3">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/50">
                テーマ
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map((t) => {
                  const on = activeTags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setActiveTags((prev) =>
                          prev.includes(t)
                            ? prev.filter((x) => x !== t)
                            : [...prev, t],
                        )
                      }
                      className={`inline-flex min-h-[32px] items-center rounded-full border px-2.5 py-1 text-[12px] transition active:scale-[0.95] ${
                        on
                          ? 'border-primary-700 bg-primary-700 text-primary-foreground'
                          : 'border-border bg-background text-foreground/70 hover:border-foreground/30'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/50">
                ローカル度（{localRange[0] ?? 0}〜{localRange[1] ?? 100}）
              </p>
              <Slider
                min={0}
                max={100}
                step={5}
                value={localRange}
                onValueChange={(v) => setLocalRange(v)}
                aria-label="ローカル度範囲"
              />
              <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.1em] text-foreground/40">
                <span>定番寄り</span>
                <span>ローカル寄り</span>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/50">
                価格帯
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRICES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPrice(p.id)}
                    className={`inline-flex min-h-[32px] items-center rounded-full border px-2.5 py-1 text-[12px] transition active:scale-[0.95] ${
                      p.id === price
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-foreground/70'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2 text-[12px] text-foreground/50">
              <Badge variant="secondary" className="bg-muted">
                {filtered.length} 件
              </Badge>
              <span>該当</span>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-9 rounded-md border border-border bg-background px-2 text-[12px] text-foreground/80"
              aria-label="並び順"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <ArticleGrid articles={filtered} socialCounts={socialCounts} />
    </div>
  );
}
