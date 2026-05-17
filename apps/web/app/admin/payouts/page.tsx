import { StubPage } from '../_components/StubPage';

export const metadata = { title: 'ライター払い出し — Admin' };

export default function PayoutsStub() {
  return (
    <StubPage
      title="ライター払い出し"
      description="月末締め・翌月 15 日のライター振込管理。Stripe Connect 連携後に実装。"
      plannedFeatures={[
        '月次の払い出し対象一覧 (前月分の確定額)',
        'ライターごとの累計売上 + 累計払い出し',
        'Stripe Connect への transfer 実行 (1 クリック)',
        '失敗 / 保留中の transfer の再試行',
        '海外送金手数料の内訳表示',
        '振込明細書 PDF 生成 (ライター向け)',
        '初期 (ローンチ前) は ¥2,000/本 買取で日本円直接振込のフロー',
      ]}
    />
  );
}
