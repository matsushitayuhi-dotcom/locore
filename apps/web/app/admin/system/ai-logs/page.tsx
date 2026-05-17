import { StubPage } from '../../_components/StubPage';

export const metadata = { title: 'AI 実行履歴 — Admin' };

export default function AiLogsStub() {
  return (
    <StubPage
      title="AI 実行履歴"
      description="Vercel Cron で動く Claude (パリイベント取得) などの実行履歴と失敗ログ。"
      plannedFeatures={[
        '実行日時 / 取得件数 / DB 投入件数 / dedup スキップ件数',
        'Claude のトークン消費 (input / output / web_search)',
        '失敗ログ (API エラー / バリデーション NG)',
        '手動再実行ボタン (現状は /admin/board の AI テストパネル)',
        '将来: 都市別 cron (パリ以外) の管理',
      ]}
    />
  );
}
