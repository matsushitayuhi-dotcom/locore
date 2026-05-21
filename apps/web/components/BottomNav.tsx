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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl md:hidden"
      style={{
        // iOS のホームバー (notch / home indicator) と被らないよう
        // 安全領域の分だけ内側に押し込む。
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
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
                  // h-14 (56px) でタップ領域は iOS HIG 44px を余裕で超える。
                  // active:scale で「押した感」、tap-highlight は globals.css で
                  // グローバル消去済み。
                  'group relative flex h-14 min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-md transition-colors duration-fast active:scale-[0.94] ' +
                  (isActive
                    ? 'text-primary-700'
                    : 'text-foreground/55 hover:text-foreground active:text-primary-500')
                }
              >
                {/* active タブ上部の小さな縦バー (アプリ風インジケータ) */}
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
                    // ラベルは常に同じ font-weight にしてアクティブ切替時の
                    // レイアウトシフトを避ける。色変化だけで主張する。
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
