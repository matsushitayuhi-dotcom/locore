'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * グローバルナビの「検索」タブ。ランディングのダークナビに合わせたプレーン表示。
 * /search 配下で active（ライム）表示。
 */
export function SearchNavLink() {
  const pathname = usePathname() ?? '';
  const active = pathname.startsWith('/search');
  return (
    <Link
      href="/search"
      aria-current={active ? 'page' : undefined}
      className={
        'text-[14px] font-medium transition ' +
        (active ? 'text-primary-300' : 'text-white/80 hover:text-white')
      }
    >
      検索
    </Link>
  );
}
