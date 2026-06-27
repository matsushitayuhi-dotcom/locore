import { PlaceGuideMock } from '@/components/mockups/PlaceGuideMock';

/**
 * `/mockup/place-guide` — 記事タイプ「場所紹介」(standard / place-guide) のモック。
 *
 * 順序のない、複数の場所を順不同で紹介する記事。place ブロックは旅程系と同一
 * （order/time/transfer を持たないだけ）。地図は place.location から自動生成した
 * 「ピン集約マップ」。本番ファイルとは独立した検討用ルート。
 */
export const metadata = {
  title: '【モックアップ】場所紹介 — パリの6か所 | Locore',
  robots: { index: false, follow: false },
};

export default function PlaceGuideMockPage() {
  return <PlaceGuideMock />;
}
