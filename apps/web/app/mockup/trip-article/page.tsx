import { TripArticleMock } from '@/components/mockups/TripArticleMock';

/**
 * `/mockup/trip-article` — 旅程系ブログ記事ページのデザインモックアップ（案1）。
 *
 * 本番の記事ページ（/articles/[id]）とは完全に独立した、デザイン検討用の
 * プレビュールート。TripArticleMock がフルブリードで自己完結のスタイルを持つ。
 * ログインゲート下にあるため、閲覧はログイン状態を前提とする。
 */
export const metadata = {
  title: '【モックアップ】旅程記事 — パリ完璧モデルコース | Locore',
  robots: { index: false, follow: false },
};

export default function TripArticleMockPage() {
  return <TripArticleMock />;
}
