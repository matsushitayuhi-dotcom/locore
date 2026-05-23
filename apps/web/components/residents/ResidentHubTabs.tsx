'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
// 2026-05 修正: 'use client' のこのファイルから parseTab を export していたため
// Server Component から呼ぶと本番ビルドで「parseTab is not a function」になっていた。
// 定数 / parseTab は residentHubTabsShared.ts に分離し、ここからは re-export のみ。
import {
  RESIDENT_HUB_TABS,
  parseTab,
  type ResidentHubTabKey,
} from './residentHubTabsShared';

export { RESIDENT_HUB_TABS, parseTab, type ResidentHubTabKey };

/**
 * 駐在員ハブのタブナビ (Client Component)。
 *
 * - URL クエリ `?tab=...` を真実のソースにする
 * - クリック時に router.replace で `?tab=xxx` に切り替え、scroll: false で
 *   ハブ全体のスクロール位置を維持する
 * - サーバ側は SearchParams で `activeTab` を読んで該当 panel だけ表示する
 */

type Props = {
  activeTab: ResidentHubTabKey;
  /** 数字バッジを出したいタブだけ key→count を渡す */
  counts?: Partial<Record<ResidentHubTabKey, number>>;
};

export function ResidentHubTabs({ activeTab, counts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildHref = useCallback(
    (key: ResidentHubTabKey) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (key === 'overview') params.delete('tab');
      else params.set('tab', key);
      const q = params.toString();
      return q ? `${pathname}?${q}` : pathname;
    },
    [pathname, searchParams],
  );

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, key: ResidentHubTabKey) => {
      // 内部遷移を SPA 風に: scroll 位置を保ってクエリだけ更新
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      router.replace(buildHref(key), { scroll: false });
    },
    [router, buildHref],
  );

  const items = useMemo(() => RESIDENT_HUB_TABS, []);

  return (
    <nav
      aria-label="駐在員ハブのタブ"
      className="sticky top-16 z-10 -mx-4 mt-4 overflow-x-auto bg-background/85 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-full sm:bg-card sm:px-1 sm:py-1 sm:ring-1 sm:ring-border"
    >
      <ul
        role="tablist"
        className="flex min-w-max items-center gap-1 sm:min-w-0 sm:justify-between"
      >
        {items.map((t) => {
          const active = t.key === activeTab;
          const count = counts?.[t.key];
          return (
            <li key={t.key} className="flex-none sm:flex-1">
              <a
                role="tab"
                aria-selected={active}
                href={buildHref(t.key)}
                onClick={(e) => onClick(e, t.key)}
                className={
                  'block w-full whitespace-nowrap rounded-full px-4 py-1.5 text-center text-[13px] font-semibold transition ' +
                  (active
                    ? 'bg-primary-500 text-neutral-950'
                    : 'text-foreground/70 hover:bg-primary-500/10 hover:text-primary-300')
                }
              >
                {t.label}
                {typeof count === 'number' && count > 0 ? (
                  <span
                    className={
                      'ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 text-[10px] tabular ' +
                      (active
                        ? 'bg-neutral-950/15 text-neutral-950'
                        : 'bg-muted text-foreground/60')
                    }
                  >
                    {count}
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
