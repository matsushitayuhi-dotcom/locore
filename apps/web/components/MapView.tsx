'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Article, Spot } from '../lib/mock';

const STORAGE_KEY = 'locore.map.showAreas';

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

/**
 * /map のシェル。フィルタや凡例は持たず、
 * 「記事のあるエリアを表示」のトグル 1 つだけを右上にオーバーレイする。
 *
 * - on (default): 記事/スポットのピン・ヘキサを表示
 * - off: ピンを全部隠して、購入済みだけ見たい人がマップに集中できる
 *
 * 状態は localStorage に永続化（SSR 安全）。
 */
export function MapView({
  articles,
  spots,
  googleMapsApiKey,
  purchasedArticleIds,
  myArticleIds,
}: MapViewProps) {
  // hydration ミスマッチを避けるため、SSR と初回 render は true で揃え、
  // マウント後に localStorage の値で上書きする。
  const [showAreas, setShowAreas] = useState<boolean>(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === '0') setShowAreas(false);
    } catch {
      // localStorage 利用不可（プライベートブラウズ等）→ default のまま
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, showAreas ? '1' : '0');
    } catch {
      // 書き込めなくても致命的ではないので無視
    }
  }, [showAreas]);

  // 画面いっぱい。SiteHeader (56px) + BottomNav (約 64px) を引いて、
  // PC でも上下が詰まらないようにする。
  // 横幅は親 main 側で w-full。
  return (
    <div className="relative h-[calc(100vh-7rem)] w-full md:h-[calc(100vh-4rem)]">
      <InnerMap
        spots={showAreas ? spots : []}
        articles={showAreas ? articles : []}
        apiKey={googleMapsApiKey}
        purchasedArticleIds={purchasedArticleIds}
        myArticleIds={myArticleIds}
      />

      {/* 右上のトグル: 記事のあるエリアを表示 / 非表示 */}
      <div className="pointer-events-none absolute right-4 top-4 z-[400]">
        <label className="pointer-events-auto inline-flex cursor-pointer select-none items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-[12px] font-medium text-primary-300 shadow-sm ring-1 ring-border backdrop-blur">
          <span>📖 記事のあるエリアを表示</span>
          <input
            type="checkbox"
            checked={showAreas}
            onChange={(e) => setShowAreas(e.target.checked)}
            className="h-4 w-4 accent-primary-700"
            aria-label="記事のあるエリアを表示"
          />
        </label>
      </div>
    </div>
  );
}
