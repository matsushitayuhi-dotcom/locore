'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { findNavItem } from '../_lib/nav';

/**
 * 階層を辿るパンくず。
 * ナビ定義からトップレベルの「セクション → アイテム」を出し、
 * 末尾の動的セグメント ([id] 等) は呼び出し側が trail で渡せる。
 */
export function AdminBreadcrumb({
  trail,
}: {
  /** 末尾の追加表示 (例: ["田中みゆきの本人確認"]) */
  trail?: string[];
}) {
  const pathname = usePathname();
  const navItem = findNavItem(pathname);

  return (
    <nav
      aria-label="パンくず"
      className="flex flex-wrap items-center gap-1 text-[11px] text-foreground/55"
    >
      <Link
        href="/admin"
        className="hover:text-foreground hover:underline"
      >
        Admin
      </Link>
      {navItem && navItem.href !== '/admin' ? (
        <>
          <ChevronRight className="h-3 w-3" />
          <Link
            href={navItem.href}
            className="hover:text-foreground hover:underline"
          >
            {navItem.label}
          </Link>
        </>
      ) : null}
      {trail?.map((t, i) => (
        <span key={i} className="contents">
          <ChevronRight className="h-3 w-3" />
          <span className="max-w-[20ch] truncate text-foreground/70">{t}</span>
        </span>
      ))}
    </nav>
  );
}
