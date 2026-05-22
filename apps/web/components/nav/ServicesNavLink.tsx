'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase } from 'lucide-react';

/**
 * グローバルナビの「サービス」タブ。
 * /services 配下に居るときは active 表示。
 */
export function ServicesNavLink() {
  const pathname = usePathname();
  const active = pathname?.startsWith('/services') ?? false;
  return (
    <Link
      href="/services"
      aria-current={active ? 'page' : undefined}
      className={
        'inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium transition ' +
        (active
          ? 'bg-primary-500/15 text-primary-300'
          : 'text-foreground/70 hover:bg-primary-500/10 hover:text-foreground')
      }
    >
      <Briefcase className="h-3.5 w-3.5" aria-hidden />
      サービス
    </Link>
  );
}
