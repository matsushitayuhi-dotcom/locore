'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * グローバルナビの「サービス」タブ。ランディングのダークナビに合わせたプレーン表示。
 * /services 配下に居るときに active（ライム）表示。
 */
export function ServicesNavLink() {
  const pathname = usePathname() ?? '';
  const active = pathname.startsWith('/services');
  return (
    <Link
      href="/services"
      aria-current={active ? 'page' : undefined}
      className={
        'text-[14px] font-medium transition ' +
        (active ? 'text-primary-300' : 'text-white/80 hover:text-white')
      }
    >
      サービス
    </Link>
  );
}
