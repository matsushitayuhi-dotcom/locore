'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, MapIcon, Bookmark, Search } from '@locore/ui/icons';
import type { LucideIcon } from '@locore/ui/icons';

/**
 * モバイル下部タブナビゲーション。
 *
 * - md 未満で固定表示、md 以上では非表示（PC は SiteHeader のインラインナビ）
 * - 4 タブ固定：ホーム / 検索 / マップ / 保存
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

const makeTabs = (homeHref: '/explore' | '/expat'): Tab[] => [
  {
    href: homeHref,
    label: 'ホーム',
    icon: Compass,
    match: (p) =>
      p === '/' ||
      p.startsWith('/explore') ||
      p.startsWith('/expat') ||
      p.startsWith('/region/') ||
      p.startsWith('/country/'),
  },
  {
    href: '/search',
    label: '検索',
    icon: Search,
    match: (p) => p.startsWith('/search'),
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
];

const HIDE_ON_ROUTES: Array<(p: string) => boolean> = [
  (p) => p.startsWith('/auth/'),
  // 記事編集中はキャンバスを邪魔したくない
  (p) => /^\/writer\/articles\/[^/]+\/edit$/.test(p),
  // チャットの個別スレッド画面はフルスクリーン UX
  (p) => /^\/chat\/[^/]+$/.test(p),
  // スプラッシュ画面はナビゲーション系を全部消す（最大限スタイリッシュに）
  (p) => p === '/',
];

export function BottomNav({
  // 後方互換のため受け取るが、4 タブ構成ではメッセージタブが無くなったため未使用
  unreadChatCount: _unreadChatCount = 0,
  homeHref = '/explore',
}: {
  unreadChatCount?: number;
  /** 駐在員モードなら /expat、旅行者モード（未選択含む）なら /explore */
  homeHref?: '/explore' | '/expat';
} = {}) {
  const pathname = usePathname() ?? '/';
  if (HIDE_ON_ROUTES.some((fn) => fn(pathname))) return null;

  const TABS = makeTabs(homeHref);

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
