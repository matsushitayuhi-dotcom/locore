'use client';

import dynamic from 'next/dynamic';
import type { Article, Spot } from '../lib/mock';

const InnerMap = dynamic(() => import('./MapInner').then((m) => m.MapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-primary-500/5 text-[13px] text-primary-300">
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
 * /map のシェル。Prism Japan 風に **フルブリードの地図** のみ。
 * 上部のフィルタ / 凡例 / 「記事のあるエリアを表示」トグルは全廃。
 * 下部のスポット横スクロールカードは MapInner 側に実装する。
 */
export function MapView({
  articles,
  spots,
  googleMapsApiKey,
  purchasedArticleIds,
  myArticleIds,
}: MapViewProps) {
  // SiteHeader (56px) + BottomNav (約 64px) を引いて画面いっぱい
  return (
    <div className="relative h-[calc(100vh-7rem)] w-full md:h-[calc(100vh-4rem)]">
      <InnerMap
        spots={spots}
        articles={articles}
        apiKey={googleMapsApiKey}
        purchasedArticleIds={purchasedArticleIds}
        myArticleIds={myArticleIds}
      />
    </div>
  );
}
