'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
  /** サーバ側で取得した購入済み記事 ID */
  purchasedArticleIds?: string[];
}

const CITIES = [
  { id: 'paris', label: 'パリ', enabled: true },
  { id: 'london', label: 'London', enabled: false },
  { id: 'nyc', label: 'NYC', enabled: false },
];

const TAGS = ['朝食', '夜遊び', 'デート', '雨の日', 'カフェ', '雑貨', 'アート'];

export function MapView({
  articles,
  spots,
  googleMapsApiKey,
  purchasedArticleIds,
}: MapViewProps) {
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

  return (
    <div className="relative h-[calc(100vh-56px)] w-full">
      <InnerMap
        spots={visibleSpots}
        articles={filteredArticles}
        showHeatmap={showHeatmap}
        apiKey={googleMapsApiKey}
        purchasedArticleIds={purchasedArticleIds}
      />

      {/* Top-left: city pills + back to feed */}
      <div className="pointer-events-none absolute left-4 top-4 z-[400] flex flex-col gap-3">
        <div className="pointer-events-auto rounded-md bg-white/95 p-2 shadow-sm ring-1 ring-primary-100 backdrop-blur">
          <div className="flex flex-wrap gap-1">
            {CITIES.map((c) => (
              <button
                key={c.id}
                disabled={!c.enabled}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                  c.enabled
                    ? 'bg-primary-700 text-white'
                    : 'bg-neutral-100 text-foreground/40'
                }`}
                title={c.enabled ? '' : 'Coming Soon'}
              >
                {c.label}
                {!c.enabled ? <span className="ml-1 text-[10px]">soon</span> : null}
              </button>
            ))}
          </div>
        </div>
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center gap-1 self-start rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-medium text-primary-700 shadow-xs ring-1 ring-primary-100 backdrop-blur transition hover:bg-primary-50"
        >
          ← フィードに戻る
        </Link>
      </div>

      {/* Top-right: filters */}
      <div className="pointer-events-none absolute right-4 top-4 z-[400] w-[260px]">
        <div className="pointer-events-auto rounded-md bg-white/95 shadow-sm ring-1 ring-primary-100 backdrop-blur">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-[13px] font-medium text-primary-700"
          >
            フィルタ
            <span className="text-[11px] text-foreground/50">
              {filtersOpen ? '閉じる' : '開く'}
            </span>
          </button>
          {filtersOpen ? (
            <div className="space-y-3 border-t border-primary-100 px-4 py-3">
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
                            prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                          )
                        }
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                          on
                            ? 'bg-primary-700 text-white'
                            : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
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
                  className="h-4 w-4 accent-primary-700"
                />
              </label>
              <div className="rounded-md bg-primary-50/60 px-3 py-2 text-[11px] text-primary-700">
                <span className="tabular font-semibold">{visibleSpots.length}</span> スポット表示中（
                <span className="tabular font-semibold">{filteredArticles.length}</span> 記事）
              </div>
            </div>
          ) : null}
        </div>

        {/* Pin legend */}
        <div className="pointer-events-auto mt-3 rounded-md bg-white/95 px-3 py-2.5 text-[11px] shadow-sm ring-1 ring-primary-100 backdrop-blur">
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
