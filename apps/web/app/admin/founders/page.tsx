import { StubPage } from '../_components/StubPage';

export const metadata = { title: 'Founders 50 管理 — Admin' };

export default function FoundersStub() {
  return (
    <StubPage
      title="Founders 50"
      description="最初の 50 人の応募者・承認・特典付与状況を管理。"
      plannedFeatures={[
        '応募フォームからの提出一覧（自己紹介・希望都市・SNS リンク・記事サンプル）',
        '書類選考のステータス遷移（受領 / レビュー中 / 面談予約 / 採用 / 不採用）',
        'Zoom 面談日程の管理（カレンダー連携）',
        '採用後の writer_profiles.foundingMember 自動付与',
        '優遇手数料 (90%) の有効期限管理',
        '残り枠数の表示（50 / N 採用済み）',
        '不採用理由テンプレ + 通知メール',
      ]}
    />
  );
}
