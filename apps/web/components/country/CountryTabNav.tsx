'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * /country/[code] ページに置く 3 タブ (記事 / サービス / コミュニティ)。
 *
 * URL クエリ `?tab=articles|services|residents` で状態管理。
 * tab 省略時は articles を選択中とみなす。
 * クライアントナビゲーションでサーバ側コンテンツが切り替わる前提のため、
 * 通常の <Link> を使う (scroll: false で位置維持)。
 */

const TABS = [
  { key: 'articles', label: '記事' },
  { key: 'services', label: 'サービス' },
  { key: 'residents', label: 'コミュニティ' },
] as const;

export type CountryTabKey = (typeof TABS)[number]['key'];

export function CountryTabNav({ active }: { active: CountryTabKey }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(key: CountryTabKey): string {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (key === 'articles') {
      params.delete('tab');
    } else {
      params.set('tab', key);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <nav
      role="tablist"
      aria-label="この国の中で見たいものを選ぶ"
      className="flex items-center gap-1 overflow-x-auto rounded-full bg-muted p-1"
    >
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <Link
            key={t.key}
            href={hrefFor(t.key)}
            scroll={false}
            role="tab"
            aria-selected={on}
            className={
              'shrink-0 rounded-full px-4 py-1.5 text-[12px] font-semibold transition ' +
              (on
                ? 'bg-primary-500 text-neutral-950 shadow-sm'
                : 'text-foreground/70 hover:bg-primary-500/10 hover:text-foreground')
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
