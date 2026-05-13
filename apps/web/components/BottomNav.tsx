'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, MapIcon, Bookmark, MessageCircle, User } from '@locore/ui/icons';
import type { LucideIcon } from '@locore/ui/icons';

/**
 * モバイル下部タブナビゲーション。
 *
 * - md 未満で固定表示、md 以上では非表示（PC は SiteHeader のインラインナビ）
 * - 5 タブ固定：フィード / マップ / 保存 / メッセージ / プロフィール
 * - 安全エリア対応（iOS のホームバーに被らないよう env(safe-area-inset-bottom) を加算）
 * - 認証ページ・記事編集画面など、ナビを出したくない場所では非表示
 */

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** active 判定 */
  match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: '/',
    label: 'ホーム',
    icon: Compass,
    match: (p) => p === '/' || p.startsWith('/region/') || p.startsWith('/country/'),
  },
  {
    href: '/map',
    label: 'マップ',
    icon: MapIcon,
    match: (p) => p.startsWith('/map'),
  },
  {
    href: '/library',
    label: '保存',
    icon: Bookmark,
    match: (p) =>
      p.startsWith('/library') ||
      p.startsWith('/purchases') ||
      p.startsWith('/trips'),
  },
  {
    href: '/chat',
    label: 'メッセージ',
    icon: MessageCircle,
    match: (p) => p.startsWith('/chat'),
  },
  {
    href: '/settings/profile',
    label: 'プロフィール',
    icon: User,
    match: (p) =>
      p.startsWith('/settings') ||
      p.startsWith('/writer') ||
      p.startsWith('/writers'),
  },
];

const HIDE_ON_ROUTES: Array<(p: string) => boolean> = [
  (p) => p.startsWith('/auth/'),
  // 記事編集中はキャンバスを邪魔したくない
  (p) => /^\/writer\/articles\/[^/]+\/edit$/.test(p),
  // チャットの個別スレッド画面はフルスクリーン UX
  (p) => /^\/chat\/[^/]+$/.test(p),
];

export function BottomNav({ unreadChatCount = 0 }: { unreadChatCount?: number } = {}) {
  const pathname = usePathname() ?? '/';
  if (HIDE_ON_ROUTES.some((fn) => fn(pathname))) return null;

  return (
    <nav
      aria-label="モバイルナビゲーション"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch justify-around px-1 pt-1">
        {TABS.map((t) => {
          const isActive = t.match(pathname);
          const Icon = t.icon;
          const badge = t.href === '/chat' ? unreadChatCount : 0;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={isActive ? 'page' : undefined}
                className={
                  'relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-md transition-colors duration-fast ' +
                  (isActive
                    ? 'text-primary-500'
                    : 'text-foreground/55 hover:text-foreground active:text-primary-300')
                }
              >
                <div className="relative">
                  <Icon
                    className="size-[22px]"
                    strokeWidth={isActive ? 2.4 : 1.8}
                    fill={isActive ? 'currentColor' : 'none'}
                    fillOpacity={isActive ? 0.15 : 0}
                  />
                  {badge > 0 ? (
                    <span className="absolute -right-2 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-background">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  ) : null}
                </div>
                <span
                  className={
                    'text-[10px] font-medium tracking-tight ' +
                    (isActive ? 'font-semibold' : '')
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
