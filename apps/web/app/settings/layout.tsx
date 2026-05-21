import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth/require-user';
import { SettingsNav } from './SettingsNav';

/**
 * Settings 共通レイアウト。
 *
 * 左側（モバイルでは上部）にナビ、右側（下）に各ページの内容を表示する。
 * ナビ本体は `SettingsNav` (Client Component) に切り出し、active 判定と
 * role 別出し分け（reader には writer 用タブを隠す）をクライアント側で実施。
 */
export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser('/settings');

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-lg px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/60">
            Settings
          </p>
          <h1
            className="text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]"
          >
            アカウント設定
          </h1>
          <p className="mt-2 text-[13px] text-foreground/60">
            プロフィール・通知・退会の管理。
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-[200px_1fr]">
          <SettingsNav role={user.role} />
          <section>{children}</section>
        </div>
      </div>
    </main>
  );
}
