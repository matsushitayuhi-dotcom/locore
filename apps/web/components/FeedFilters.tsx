'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Slider, Button, Badge } from '@locore/ui';
import { MapIcon, SlidersHorizontal } from '@locore/ui/icons';
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

  return (
    <div>
      {/* Type tabs (種別) */}
      <div
        role="tablist"
        aria-label="記事の種別で絞り込む"
        className="mb-3 flex flex-wrap items-center gap-1.5"
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
                'inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium transition ' +
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

      {/* Filter bar */}
      <div className="mb-6 rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[12px] font-medium text-foreground/80 transition hover:bg-muted"
          >
            <SlidersHorizontal className="h-3 w-3" />
            詳細フィルタ
          </button>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-8 rounded-md border border-border bg-background px-2 text-[13px] text-foreground/80"
              aria-label="並び順"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <Link href="/map">
              <Button variant="outline" size="sm">
                <MapIcon className="mr-1 h-3 w-3" />
                マップで見る
              </Button>
            </Link>
          </div>
        </div>

        {open ? (
          <div className="mt-4 grid gap-5 border-t border-border/60 pt-4 md:grid-cols-3">
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
                      className={`rounded-full border px-2.5 py-0.5 text-[12px] transition ${
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
                    className={`rounded-full border px-2.5 py-0.5 text-[12px] transition ${
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
        ) : null}

        <div className="mt-3 flex items-center gap-2 text-[12px] text-foreground/50">
          <Badge variant="secondary" className="bg-muted">
            {filtered.length} 件
          </Badge>
          <span>該当します</span>
        </div>
      </div>

      <ArticleGrid articles={filtered} socialCounts={socialCounts} />
    </div>
  );
}
