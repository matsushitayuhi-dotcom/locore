import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Settings 共通レイアウト。
 *
 * 左側（モバイルでは上部）にプロフィール / 通知 / アカウント のタブナビ、
 * 右側（下）に各ページの内容を表示する。アクティブ判定は CSS の
 * `aria-current` ベースではなく、シンプルに各ページ側の見出しに任せる。
 */
const NAV_ITEMS = [
  { href: '/settings/profile', label: 'プロフィール' },
  { href: '/settings/services', label: '提供サービス' },
  { href: '/settings/verification', label: '本人確認' },
  { href: '/settings/notifications', label: '通知' },
  { href: '/settings/account', label: 'アカウント' },
] as const;

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-lg px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/60">
            Settings
          </p>
          <h1
            className="text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            アカウント設定
          </h1>
          <p className="mt-2 text-[13px] text-foreground/60">
            プロフィール・通知・退会の管理。
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-[200px_1fr]">
          <nav aria-label="設定ナビゲーション" className="md:sticky md:top-24 md:h-fit">
            <ul className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block whitespace-nowrap rounded-sm px-3 py-2 text-[13px] text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section>{children}</section>
        </div>
      </div>
    </main>
  );
}
