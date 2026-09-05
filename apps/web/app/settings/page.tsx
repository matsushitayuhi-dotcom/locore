import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/require-user';
import { getProfileCompleteness } from '@/lib/experts/completeness';
import { CompletenessChecklist } from '@/components/settings/CompletenessChecklist';

export const metadata = {
  title: '公開ステータス',
};

export const dynamic = 'force-dynamic';

/**
 * /settings ハブ（公開関門・0084）。
 * writer には完成度メーター＋チェックリスト＋公開カードを見せる。
 * reader は従来どおりプロフィール編集へ。
 */
export default async function SettingsHubPage() {
  const user = await requireUser('/settings');
  const isWriter = user.role === 'resident_writer' || user.role === 'editor';
  if (!isWriter) redirect('/settings/profile');

  const completeness = await getProfileCompleteness(user.id);

  return (
    <CompletenessChecklist userId={user.id} completeness={completeness} />
  );
}
