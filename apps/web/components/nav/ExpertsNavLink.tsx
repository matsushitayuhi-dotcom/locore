'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * グローバルナビの「エキスパートを探す」タブ（v2）。ServicesNavLink と同じ作法。
 * /experts 配下に居るときに active（ライム）表示。
 */
export function ExpertsNavLink() {
  const pathname = usePathname() ?? '';
  const active = pathname.startsWith('/experts');
  return (
    <Link
      href="/experts"
      aria-current={active ? 'page' : undefined}
      className={
        'text-[14px] font-medium transition ' +
        (active ? 'text-primary-300' : 'text-white/80 hover:text-white')
      }
    >
      エキスパートを探す
    </Link>
  );
}
