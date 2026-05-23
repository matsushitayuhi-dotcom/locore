'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  ChevronDown,
  GraduationCap,
  Hand,
  Home,
  ShoppingBag,
  Users,
} from 'lucide-react';

/**
 * グローバルナビ用「コミュニティ」ドロップダウン。
 *
 * PR3 で駐在員モードのナビを 「ホーム / 記事 / サービス / コミュニティ / 検索」 に
 * 集約するために導入。コミュニティ 6 種 (求人 / 住居 / 売買 / 集まり / 習う / 助け)
 * を 1 つのメニューに畳む。
 *
 * `<details>` ではなく useState + useEffect で実装しているのは:
 *   - aria-expanded を制御したい
 *   - 外側クリック / Esc でしっかり閉じたい
 *   - mobile では SideMenu / BottomNav 側で導線が出るため md 以上だけ表示
 */

type Item = {
  href: string;
  label: string;
  icon: typeof Briefcase;
};

const ITEMS: Item[] = [
  { href: '/jobs', label: '求人', icon: Briefcase },
  { href: '/apartments', label: '住居', icon: Home },
  { href: '/marketplace', label: '売買', icon: ShoppingBag },
  { href: '/groups', label: '集まり', icon: Users },
  { href: '/lessons', label: '習う', icon: GraduationCap },
  { href: '/help', label: '助け', icon: Hand },
];

const COMMUNITY_PATHS = [
  '/jobs',
  '/apartments',
  '/marketplace',
  '/groups',
  '/lessons',
  '/help',
];

export function CommunityMenu() {
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const active = COMMUNITY_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={
          'inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium transition ' +
          (active
            ? 'bg-primary-500/15 text-primary-300'
            : 'text-foreground/70 hover:bg-primary-500/10 hover:text-foreground')
        }
      >
        駐在員向け
        <ChevronDown
          className={'h-3.5 w-3.5 transition-transform ' + (open ? 'rotate-180' : '')}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="駐在員向け"
          className="absolute left-1/2 z-50 mt-2 w-56 -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-lg ring-1 ring-black/5"
        >
          <ul className="py-1.5">
            {ITEMS.map((it) => {
              const Icon = it.icon;
              const on = pathname.startsWith(it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={
                      'flex items-center gap-2 px-3 py-2 text-[13px] ' +
                      (on
                        ? 'bg-primary-500/10 text-primary-300'
                        : 'text-foreground/80 hover:bg-primary-500/10 hover:text-foreground')
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
