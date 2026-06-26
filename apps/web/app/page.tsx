import { LandingClient } from './LandingClient';

/**
 * `/` — マーケティング用ランディング（2026-06 改修）。
 *
 * 旧スプラッシュ（旅行者/駐在員のモード選択 + リダイレクト）を廃止し、両者を分けない
 * 統合トーンのランディングに置き換え。認証・cookie を読まない純粋な静的ページなので
 * Edge Cache に乗る（revalidate）。ヘッダー等のレイアウト chrome は LandingClient 側の
 * 全画面オーバーレイ (.lp) が覆うため、独自ナビのみが見える。
 */
export const revalidate = 3600;

export const metadata = {
  title: 'Locore — 現地に住む人と、つながる',
  description:
    '海外で頼れる人を見つけたい人も、現地で新しいつながりを探す人も。旅も暮らしも"現地に住む日本人"とつながれる、在外邦人の新しいネットワーク。',
};

export default function HomePage() {
  return <LandingClient />;
}
