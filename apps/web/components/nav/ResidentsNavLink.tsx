'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessagesSquare } from 'lucide-react';

/**
 * グローバルナビの「コミュニティ」タブ。
 *
 * 2026-06: 旅行者/駐在員モードを撤去。コミュニティ系（求人 / 住居 / 売買 /
 * 集まり / 習う / 助け / 掲示板 / カレンダー）の入口 /community に飛ばす。
 */
export function ResidentsNavLink() {
  const pathname = usePathname() ?? '';
  const active =
    pathname.startsWith('/community') ||
    pathname.startsWith('/board') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/jobs') ||
    pathname.startsWith('/apartments') ||
    pathname.startsWith('/marketplace') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/lessons') ||
    pathname.startsWith('/help');
  return (
    <Link
      href="/community"
      aria-current={active ? 'page' : undefined}
      className={
        'inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium transition ' +
        (active
          ? 'bg-primary-500/15 text-primary-300'
          : 'text-foreground/70 hover:bg-primary-500/10 hover:text-foreground')
      }
    >
      <MessagesSquare className="h-3.5 w-3.5" aria-hidden />
      コミュニティ
    </Link>
  );
}
