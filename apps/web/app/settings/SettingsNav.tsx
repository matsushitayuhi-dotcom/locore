'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Settings サイドナビ（Client Component）。
 *
 * - usePathname() で active 判定
 * - active 項目: 左に terracotta バー + 背景薄塗り + text-primary-300 font-semibold
 *   (AdminSidebar のスタイル感に揃える)
 * - role に応じて「提供サービス」「本人確認」を出し分け
 *   - reader: プロフィール / 通知 / アカウント
 *   - resident_writer / editor: 全 5 タブ
 * - モバイル横スクロールタブでも active 強調が効く
 */

type Role = 'reader' | 'resident_writer' | 'editor' | string;

type NavItem = {
  href: string;
  label: string;
  writerOnly?: boolean;
};

const ALL_NAV_ITEMS: readonly NavItem[] = [
  { href: '/settings/profile', label: 'プロフィール' },
  { href: '/settings/services', label: '提供サービス', writerOnly: true },
  { href: '/settings/verification', label: '本人確認', writerOnly: true },
  { href: '/settings/notifications', label: '通知' },
  { href: '/settings/account', label: 'アカウント' },
] as const;

export function SettingsNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const isWriter = role === 'resident_writer' || role === 'editor';
  const items = ALL_NAV_ITEMS.filter((item) => !item.writerOnly || isWriter);

  return (
    <nav aria-label="設定ナビゲーション" className="md:sticky md:top-24 md:h-fit">
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={
                  'relative block whitespace-nowrap rounded-sm px-3 py-2 text-[13px] transition-colors ' +
                  (isActive
                    ? 'bg-primary-500/10 font-semibold text-primary-300'
                    : 'text-foreground/70 hover:bg-muted hover:text-foreground')
                }
              >
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 h-5 w-[3px] rounded-r-full bg-primary-500"
                  />
                ) : null}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
