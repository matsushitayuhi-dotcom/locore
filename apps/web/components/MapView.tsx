'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Article, Spot } from '../lib/mock';

const InnerMap = dynamic(() => import('./MapInner').then((m) => m.MapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-primary-500/10 text-[13px] text-primary-300">
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
  /** 自分が書いた記事 ID（マップ上で別色表示） */
  myArticleIds?: string[];
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
  myArticleIds,
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
        myArticleIds={myArticleIds}
      />

      {/* Top-left: city pills + back to feed */}
      <div className="pointer-events-none absolute left-4 top-4 z-[400] flex flex-col gap-3">
        <div className="pointer-events-auto rounded-md bg-card/95 p-2 shadow-sm ring-1 ring-border backdrop-blur">
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
          className="pointer-events-auto inline-flex items-center gap-1 self-start rounded-full bg-card/95 px-3 py-1.5 text-[12px] font-medium text-primary-300 shadow-xs ring-1 ring-border backdrop-blur transition hover:bg-primary-500/10"
        >
          ← フィードに戻る
        </Link>
      </div>

      {/* Top-right: filters */}
      <div className="pointer-events-none absolute right-4 top-4 z-[400] w-[260px]">
        <div className="pointer-events-auto rounded-md bg-card/95 shadow-sm ring-1 ring-border backdrop-blur">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-[13px] font-medium text-primary-300"
          >
            フィルタ
            <span className="text-[11px] text-foreground/50">
              {filtersOpen ? '閉じる' : '開く'}
            </span>
          </button>
          {filtersOpen ? (
            <div className="space-y-3 border-t border-border px-4 py-3">
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
                            : 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15'
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
              <div className="rounded-md bg-primary-500/10 px-3 py-2 text-[11px] text-primary-300">
                <span className="tabular font-semibold">{visibleSpots.length}</span> スポット表示中（
                <span className="tabular font-semibold">{filteredArticles.length}</span> 記事）
              </div>
            </div>
          ) : null}
        </div>

        {/* Pin legend */}
        <div className="pointer-events-auto mt-3 rounded-md bg-card/95 px-3 py-2.5 text-[11px] shadow-sm ring-1 ring-border backdrop-blur">
          <p className="mb-1.5 font-semibold uppercase tracking-[0.16em] text-foreground/50">
            ピン色の凡例
          </p>
          <div className="space-y-1">
            <Legend swatch={<Dot color="bg-local-low" />} label="0–29 定番寄り" />
            <Legend swatch={<Dot color="bg-local-mid" />} label="30–69 中間" />
            <Legend swatch={<Dot color="bg-local-high" />} label="70–100 ローカル" />
            {myArticleIds && myArticleIds.length > 0 ? (
              <Legend swatch={<OwnPinDot />} label="あなたの投稿" />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {swatch}
      <span className="text-foreground/70">{label}</span>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className={`inline-block h-3 w-3 rounded-full ${color}`} />;
}

/**
 * 「あなたの投稿」ピンの凡例スウォッチ。
 * MapInner.makeOwnPinSvg と同じ色 (#D4634A = local-high) + 中央に星マーク。
 * 普通の local-high ピンと混同しないよう、星アイコンで区別する。
 */
function OwnPinDot() {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-local-high ring-[1.5px] ring-white">
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="h-2.5 w-2.5"
        fill="#ffffff"
      >
        <path d="M8 1.5l1.9 4 4.4.6-3.2 3.1.8 4.3L8 11.5l-3.9 2 .8-4.3-3.2-3.1 4.4-.6z" />
      </svg>
    </span>
  );
}
