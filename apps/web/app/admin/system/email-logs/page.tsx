import { StubPage } from '../../_components/StubPage';

export const metadata = { title: 'メールログ — Admin' };

export default function EmailLogsStub() {
  return (
    <StubPage
      title="メールログ"
      description="Resend 経由で送信したメールの履歴と bounce 状況。"
      plannedFeatures={[
        '送信日時 / 宛先 / 件名 / Resend ID',
        '配信ステータス (sent / delivered / bounced / complained)',
        'bounce 理由 + bounce 率モニタリング',
        '本人確認の承認 / 却下通知メール検索',
        'support@locore.app への問い合わせ転送状況',
        '将来: SendGrid / Postmark への切替も視野',
      ]}
    />
  );
}
