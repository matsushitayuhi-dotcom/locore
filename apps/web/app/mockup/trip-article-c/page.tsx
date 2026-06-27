import { TripArticleMockC } from '@/components/mockups/TripArticleMockC';

/**
 * `/mockup/trip-article-c` — 旅程記事モックアップ案C（エディトリアル/読み物寄り）。
 *
 * 案A/Bと同じエディタ・ブロック（tripData.ts）から出し分けた、雑誌の読み物
 * のように組んだ別案。ドロップキャップのリード、要所のみの写真、本文中の
 * インラインコールアウト。本番ファイルとは独立した検討用ルート。
 */
export const metadata = {
  title: '【モックアップC】旅程記事 読み物 — パリ | Locore',
  robots: { index: false, follow: false },
};

export default function TripArticleMockCPage() {
  return <TripArticleMockC />;
}
