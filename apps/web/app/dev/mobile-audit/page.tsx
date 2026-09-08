import { AuditClient } from './AuditClient';

/**
 * /dev/mobile-audit — スマホ幅でのレイアウト崩れを一覧する開発用ページ。
 *
 * PC で見ている限り絶対に再現しない崩れ（日本語が 1 文字ずつ縦積みになる等）を
 * 機械的に拾うためのもの。検査ロジックは ./audit.ts。
 * 同一オリジンの iframe で開くので、ログインが要るページも見に行ける。
 */
export const metadata = {
  title: 'スマホ幅レイアウト検査',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default function MobileAuditPage() {
  return <AuditClient />;
}
