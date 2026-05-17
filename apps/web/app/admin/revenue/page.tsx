import { StubPage } from '../_components/StubPage';

export const metadata = { title: '売上 — Admin' };

export default function RevenueStub() {
  return (
    <StubPage
      title="売上"
      description="日次・月次・年次の売上推移、手数料内訳、リファンド管理。"
      plannedFeatures={[
        '日次売上グラフ (直近 90 日 / 1 年)',
        '月次サマリ表 (売上 / プラットフォーム手数料 / Stripe 手数料 / ライター取り分)',
        '記事タイプ別売上 (spot_guide / itinerary / expat_info)',
        '都市別売上 (パリ / 将来の他都市)',
        'リファンド処理 + 払い戻し理由ログ',
        '月次クローズ機能 (月末締めの確定処理)',
        'CSV エクスポート (経理用)',
      ]}
    />
  );
}
