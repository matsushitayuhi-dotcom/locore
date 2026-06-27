import { EssayMock } from '@/components/mockups/EssayMock';

/**
 * `/mockup/essay` — 記事タイプ「読み物」(standard / essay) のモック。
 *
 * 場所ブロック・地図を持たない、文章・写真・動画主体のエッセイ/ジャーナル。
 * paragraph / image / video（YouTube埋め込み）/ quote / callout / divider の
 * 自由な連なり。本番ファイルとは独立した検討用ルート。
 */
export const metadata = {
  title: '【モックアップ】読み物 — パリ暮らしのエッセイ | Locore',
  robots: { index: false, follow: false },
};

export default function EssayMockPage() {
  return <EssayMock />;
}
