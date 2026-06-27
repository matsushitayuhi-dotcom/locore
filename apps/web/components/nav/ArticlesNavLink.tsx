'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * グローバルナビの「記事」タブ。ランディングのダークナビに合わせたプレーン表示。
 * /articles 配下に居るときに active（ライム）表示。
 */
export function ArticlesNavLink() {
  const pathname = usePathname() ?? '';
  const active = pathname.startsWith('/articles');
  return (
    <Link
      href="/articles"
      aria-current={active ? 'page' : undefined}
      className={
        'text-[14px] font-medium transition ' +
        (active ? 'text-primary-300' : 'text-white/80 hover:text-white')
      }
    >
      記事
    </Link>
  );
}
