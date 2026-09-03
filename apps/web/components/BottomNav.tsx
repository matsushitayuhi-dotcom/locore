'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  MessageCircle,
  User,
  type LucideIcon,
} from 'lucide-react';

/**
 * モバイル下部タブナビゲーション (md 未満で固定表示)。
 *
 * 2026-09 (v2) 改修: エキスパート相談の 4 タブに刷新:
 *   ホーム / エキスパート / メッセージ / マイページ
 * 旧コンセプト（記事 / コミュニティ / サービス / 検索）はナビから撤去。
 *
 * - 安全エリア対応 (env(safe-area-inset-bottom))
 * - 認証ページ・チャット個別画面など、ナビを出したくない場所では非表示
 * - /experts/[id] は独自の固定 CTA バーを持つため非表示
 */

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const HIDE_ON_ROUTES: Array<(p: string) => boolean> = [
  (p) => p.startsWith('/auth/'),
  (p) => /^\/writer\/articles\/[^/]+\/edit$/.test(p),
  (p) => /^\/chat\/[^/]+$/.test(p),
  // エキスパート詳細は独自の固定 CTA バー（チャットで相談する）を出す
  (p) => /^\/experts\/[^/]+$/.test(p),
];

const TABS: Tab[] = [
  {
    href: '/',
    label: 'ホーム',
    icon: Home,
    match: (p) => p === '/',
  },
  {
    href: '/experts',
    label: 'エキスパート',
    icon: Search,
    match: (p) => p.startsWith('/experts'),
  },
  {
    href: '/chat',
    label: 'メッセージ',
    icon: MessageCircle,
    match: (p) => p.startsWith('/chat'),
  },
  {
    href: '/settings/profile',
    label: 'マイページ',
    icon: User,
    match: (p) => p.startsWith('/settings'),
  },
];

export function BottomNav() {
  const pathname = usePathname() ?? '/';

  if (HIDE_ON_ROUTES.some((fn) => fn(pathname))) return null;

  return (
    <nav
      aria-label="モバイルナビゲーション"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl md:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <ul className="flex items-stretch justify-around px-1 pt-1">
        {TABS.map((t, i) => {
          const href = t.href;
          const isActive = t.match(pathname);
          const Icon = t.icon;
          const className =
            'group relative flex h-14 min-h-[56px] w-full flex-col items-center justify-center gap-0.5 rounded-md transition-colors duration-fast active:scale-[0.94] ' +
            (isActive
              ? 'text-primary-700'
              : 'text-foreground/55 hover:text-foreground active:text-primary-500');

          return (
            <li key={i} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={className}
              >
                <span
                  aria-hidden
                  className={
                    'absolute left-1/2 top-0 h-0.5 w-7 -translate-x-1/2 rounded-full transition-all duration-200 ease-out ' +
                    (isActive ? 'bg-primary-500 opacity-100' : 'bg-transparent opacity-0')
                  }
                />
                <div className="relative">
                  <Icon
                    className={
                      'size-[22px] transition-transform duration-200 ' +
                      (isActive ? 'scale-110' : 'scale-100')
                    }
                    strokeWidth={isActive ? 2.4 : 1.8}
                    fill={isActive ? 'currentColor' : 'none'}
                    fillOpacity={isActive ? 0.18 : 0}
                  />
                </div>
                <span
                  className={
                    'text-[10px] font-semibold tracking-tight ' +
                    (isActive ? '' : 'opacity-80')
                  }
                >
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
