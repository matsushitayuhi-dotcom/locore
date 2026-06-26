'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * /residents/[id] のセクション内ナビ。
 *
 * タブ切替ではなく「全セクションを縦に積んだ上で、押すとそのアンカーへ
 * スムーススクロール」する方式。現在位置はスクロールスパイで下線ハイライト。
 * sticky で上部（SiteHeader の下）に貼り付く。
 */

type Item = { key: string; label: string; count?: number };

type Props = {
  items: Item[];
  /** sticky の上オフセット（SiteHeader 高さ）。既定 56px */
  topOffset?: number;
};

export function ResidentSectionNav({ items, topOffset = 56 }: Props) {
  const [active, setActive] = useState(items[0]?.key ?? '');

  const onSpy = useCallback(() => {
    const probe = window.scrollY + topOffset + 80;
    let current = items[0]?.key ?? '';
    for (const it of items) {
      const el = document.getElementById(it.key);
      if (el && el.offsetTop <= probe) current = it.key;
    }
    setActive(current);
  }, [items, topOffset]);

  useEffect(() => {
    onSpy();
    window.addEventListener('scroll', onSpy, { passive: true });
    return () => window.removeEventListener('scroll', onSpy);
  }, [onSpy]);

  const go = useCallback(
    (e: React.MouseEvent, key: string) => {
      e.preventDefault();
      const el = document.getElementById(key);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - topOffset - 8;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActive(key);
    },
    [topOffset],
  );

  return (
    <nav
      aria-label="プロフィール内ナビ"
      className="sticky z-30 -mx-4 mb-2 border-b border-border bg-background/90 px-4 backdrop-blur sm:mx-0 sm:px-0"
      style={{ top: topOffset }}
    >
      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => {
          const on = it.key === active;
          return (
            <a
              key={it.key}
              href={`#${it.key}`}
              onClick={(e) => go(e, it.key)}
              className={
                'flex-none whitespace-nowrap border-b-2 px-4 py-3.5 font-mono text-[13px] font-medium transition ' +
                (on
                  ? 'border-primary-500 text-foreground'
                  : 'border-transparent text-foreground/55 hover:text-foreground')
              }
            >
              {it.label}
              {typeof it.count === 'number' && it.count > 0 ? (
                <span
                  className={
                    'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ' +
                    (on
                      ? 'bg-primary-500 text-neutral-950'
                      : 'bg-primary-500/15 text-primary-700')
                  }
                >
                  {it.count}
                </span>
              ) : null}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
