import { StubPage } from '../../_components/StubPage';

export const metadata = { title: 'システム設定 — Admin' };

export default function SettingsStub() {
  return (
    <StubPage
      title="システム設定"
      description="環境変数の現在値や機能フラグの確認と切替。"
      plannedFeatures={[
        '環境変数のサニタイズ表示 (秘匿値は伏せ字)',
        '機能フラグ: フォト日記 / 旅程プラン / コミュニティ各カテゴリの ON/OFF',
        'メンテナンスモード (全ユーザーに告知バナー)',
        'プラットフォーム手数料率の調整 (founders / 通常)',
        'AI Cron のスケジュール表示と一時停止',
        '通報の SLA しきい値設定',
      ]}
    />
  );
}
