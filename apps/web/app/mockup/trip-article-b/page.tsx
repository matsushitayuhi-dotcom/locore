import { TripArticleMockB } from '@/components/mockups/TripArticleMockB';

/**
 * `/mockup/trip-article-b` — 旅程記事モックアップ案B（マップ先行）。
 *
 * 案A（/mockup/trip-article）と同じエディタ・ブロック（tripData.ts）から
 * 出し分けたレイアウト。Route Map を主役に大きく見せ、スポットは番号付き
 * カードのグリッドで並べる。本番ファイルとは独立した検討用ルート。
 */
export const metadata = {
  title: '【モックアップB】旅程記事 マップ先行 — パリ | Locore',
  robots: { index: false, follow: false },
};

export default function TripArticleMockBPage() {
  return <TripArticleMockB />;
}
