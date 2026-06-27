'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * グローバルナビの「コミュニティ」タブ。ランディングのダークナビに合わせたプレーン表示。
 *
 * 2026-06: 旅行者/駐在員モードを撤去。コミュニティ系（求人 / 住居 / 売買 /
 * 集まり / 習う / 助け / 掲示板 / カレンダー）配下で active（ライム）表示。
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
        'text-[14px] font-medium transition ' +
        (active ? 'text-primary-300' : 'text-white/80 hover:text-white')
      }
    >
      コミュニティ
    </Link>
  );
}
