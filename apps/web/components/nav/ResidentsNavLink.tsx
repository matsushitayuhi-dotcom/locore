'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users } from 'lucide-react';

/**
 * グローバルナビの「駐在員向け」タブ。
 *
 * IA 3 領域モデル (2026-05) の ③ に対応。旅行者・駐在員いずれのモードでも
 * 表示し、コミュニティ系（求人 / 住居 / 売買 / 集まり / 習う / 助け）の入口である
 * /expat に飛ばす。
 *
 * active 判定: /expat, /board, /jobs, /apartments, /marketplace, /groups,
 * /lessons, /help, /community のいずれかに居れば駐在員領域とみなす。
 */
export function ResidentsNavLink() {
  const pathname = usePathname() ?? '';
  const active =
    pathname.startsWith('/expat') ||
    pathname.startsWith('/board') ||
    pathname.startsWith('/community') ||
    pathname.startsWith('/jobs') ||
    pathname.startsWith('/apartments') ||
    pathname.startsWith('/marketplace') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/lessons') ||
    pathname.startsWith('/help');
  return (
    <Link
      href="/expat"
      aria-current={active ? 'page' : undefined}
      className={
        'inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium transition ' +
        (active
          ? 'bg-primary-500/15 text-primary-300'
          : 'text-foreground/70 hover:bg-primary-500/10 hover:text-foreground')
      }
    >
      <Users className="h-3.5 w-3.5" aria-hidden />
      駐在員向け
    </Link>
  );
}
