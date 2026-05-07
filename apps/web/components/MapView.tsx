'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Badge, Button } from '@locore/ui';
import { X } from '@locore/ui/icons';
import type { Article, Spot } from '../lib/mock';

const InnerMap = dynamic(() => import('./MapInner').then((m) => m.MapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-primary-50/40 text-[13px] text-primary-700">
      地図を読み込み中…
    </div>
  ),
});

interface MapViewProps {
  articles: Article[];
  spots: Spot[];
  /** Google Maps API キー（NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を渡す） */
  googleMapsApiKey?: string;
}

const CITIES = [
  { id: 'paris', label: 'パリ', enabled: true },
  { id: 'london', label: 'London', enabled: false },
  { id: 'nyc', label: 'NYC', enabled: false },
];

const TAGS = ['朝食', '夜遊び', 'デート', '雨の日', 'カフェ', '雑貨', 'アート'];

export function MapView({ articles, spots, googleMapsApiKey }: MapViewProps) {
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredArticles = useMemo(() => {
    if (activeTags.length === 0) return articles;
    return articles.filter((a) => activeTags.some((t) => a.tags.includes(t)));
  }, [articles, activeTags]);

  const visibleSpots = useMemo(() => {
    const ids = new Set(filteredArticles.map((a) => a.id));
    return spots.filter((s) => ids.has(s.articleId));
  }, [spots, filteredArticles]);

  const activeArticle = activeArticleId
    ? articles.find((a) => a.id === activeArticleId) ?? null
    : null;

  return (
    <div className="relative h-[calc(100vh-56px)] w-full">
      <InnerMap
        spots={visibleSpots}
        articles={filteredArticles}
        showHeatmap={showHeatmap}
        onPinClick={(spot) => setActiveArticleId(spot.articleId)}
        apiKey={googleMapsApiKey}
      />

      {/* Top-left: back to feed */}
      <div className="pointer-events-none absolute left-4 top-4 z-[400] flex flex-col gap-3">
        <div className="pointer-events-auto rounded-md border border-border bg-card/95 p-2 shadow-sm backdrop-blur">
          <div className="flex flex-wrap gap-1">
            {CITIES.map((c) => (
              <button
                key={c.id}
                disabled={!c.enabled}
                className={`rounded-full px-3 py-1 text-[12px] transition ${
                  c.enabled
                    ? 'bg-primary-700 text-primary-foreground'
                    : 'bg-muted text-foreground/40'
                }`}
                title={c.enabled ? '' : 'Coming Soon'}
              >
                {c.label}
                {!c.enabled ? (
                  <span className="ml-1 text-[10px]">soon</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center gap-1 self-start rounded-full border border-border bg-card/95 px-3 py-1.5 text-[12px] font-medium text-foreground/70 shadow-xs backdrop-blur transition hover:bg-card"
        >
          ← フィードに戻る
        </Link>
      </div>

      {/* Top-right: filters */}
      <div className="pointer-events-none absolute right-4 top-4 z-[400] w-[260px]">
        <div className="pointer-events-auto rounded-md border border-border bg-card/95 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-[13px] font-medium"
          >
            フィルタ
            <span className="text-[11px] text-foreground/50">
              {filtersOpen ? '閉じる' : '開く'}
            </span>
          </button>
          {filtersOpen ? (
            <div className="space-y-3 border-t border-border/60 px-4 py-3">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/50">
                  テーマ
                </p>
                <div className="flex flex-wrap gap-1">
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
                        className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                          on
                            ? 'border-primary-700 bg-primary-700 text-primary-foreground'
                            : 'border-border bg-background text-foreground/70'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center justify-between gap-2 text-[12px]">
                <span className="text-foreground/70">観光客密度ヒートマップ</span>
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(e) => setShowHeatmap(e.target.checked)}
                  className="h-4 w-4"
                />
              </label>
              <div className="rounded-md bg-muted px-3 py-2 text-[11px] text-foreground/60">
                <span className="tabular">{visibleSpots.length}</span> スポット表示中（
                <span className="tabular">{filteredArticles.length}</span> 記事）
              </div>
            </div>
          ) : null}
        </div>

        {/* Pin legend */}
        <div className="pointer-events-auto mt-3 rounded-md border border-border bg-card/95 px-3 py-2.5 text-[11px] shadow-sm backdrop-blur">
          <p className="mb-1.5 font-semibold uppercase tracking-[0.16em] text-foreground/50">
            ピン色の凡例
          </p>
          <div className="space-y-1">
            <Legend color="bg-local-low" label="0–29 定番寄り" />
            <Legend color="bg-local-mid" label="30–69 中間" />
            <Legend color="bg-local-high" label="70–100 ローカル" />
          </div>
        </div>
      </div>

      {/* Active article popup */}
      {activeArticle ? (
        <div className="pointer-events-auto absolute inset-x-4 bottom-4 z-[500] mx-auto max-w-md md:left-auto md:right-4 md:bottom-4">
          <div className="rounded-md border border-border bg-card p-4 shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="outline" className="text-[10px]">
                  パリ・{activeArticle.area}
                </Badge>
                <h4
                  className="mt-2 text-[16px] font-semibold leading-snug"
                  style={{
                    fontFamily:
                      'var(--font-serif-jp), var(--font-serif), serif',
                  }}
                >
                  {activeArticle.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveArticleId(null)}
                aria-label="閉じる"
                className="rounded-full p-1 text-foreground/50 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-[12px] text-foreground/60">
              <span className="tabular">
                ローカル度 <strong>{activeArticle.localScoreAverage}</strong>
              </span>
              <span className="tabular">
                ¥{activeArticle.priceJpy.toLocaleString('ja-JP')}
              </span>
            </div>
            <div className="mt-3 flex justify-end">
              <Link href={`/articles/${activeArticle.id}`}>
                <Button variant="primary" size="sm">
                  記事を見る →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-3 w-3 rounded-full ${color}`} />
      <span className="text-foreground/70">{label}</span>
    </div>
  );
}
