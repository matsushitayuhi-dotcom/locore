'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen } from 'lucide-react';

/**
 * グローバルナビの「記事」タブ。
 * /articles, /country/, /region/ など読み物系の配下に居るときに active 表示。
 */
export function ArticlesNavLink() {
  const pathname = usePathname() ?? '';
  const active =
    pathname.startsWith('/articles') ||
    pathname.startsWith('/country/') ||
    pathname.startsWith('/region/');
  return (
    <Link
      href="/articles"
      aria-current={active ? 'page' : undefined}
      className={
        'inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium transition ' +
        (active
          ? 'bg-primary-500/15 text-primary-300'
          : 'text-foreground/70 hover:bg-primary-500/10 hover:text-foreground')
      }
    >
      <BookOpen className="h-3.5 w-3.5" aria-hidden />
      記事
    </Link>
  );
}
