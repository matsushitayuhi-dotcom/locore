'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  BookOpen,
  Briefcase,
  Users,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useViewer } from './viewer/ViewerProvider';

/**
 * モバイル下部タブナビゲーション (md 未満で固定表示)。
 *
 * 2026-05 IA 3 領域モデル改修で、5 タブ構成に統一:
 *   ホーム / 記事 / サービス / 駐在員向け / 検索
 *
 * 検索 Sheet は廃止し、検索タブはそのまま /search ページにリンクする
 * (めり込み Sheet が分かりにくいというフィードバックを受けて 2026-05 改修)。
 *
 * - 安全エリア対応 (env(safe-area-inset-bottom))
 * - 認証ページ・記事編集画面など、ナビを出したくない場所では非表示
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
  (p) => p === '/',
  // 記事一覧はフルスクリーンの没入レイアウトなので下部メニューを隠す
  // （/articles/[id] の記事詳細では残す）。
  (p) => p === '/articles',
];

export function BottomNav() {
  const pathname = usePathname() ?? '/';
  const { mode } = useViewer();
  // 駐在員モードなら /expat、旅行者モード（未選択含む）なら /explore。
  // mode はクライアントの locore_mode cookie 由来（ViewerProvider が供給）。
  const homeHref: '/explore' | '/expat' =
    mode === 'resident' ? '/expat' : '/explore';

  if (HIDE_ON_ROUTES.some((fn) => fn(pathname))) return null;

  const TABS: Tab[] = [
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
      href: '/articles',
      label: '記事',
      icon: BookOpen,
      match: (p) => p.startsWith('/articles'),
    },
    {
      href: '/services',
      label: 'サービス',
      icon: Briefcase,
      match: (p) => p.startsWith('/services'),
    },
    {
      href: '/expat',
      label: '駐在員向け',
      icon: Users,
      match: (p) =>
        p.startsWith('/expat') ||
        p.startsWith('/board') ||
        p.startsWith('/community') ||
        p.startsWith('/jobs') ||
        p.startsWith('/apartments') ||
        p.startsWith('/marketplace') ||
        p.startsWith('/groups') ||
        p.startsWith('/lessons') ||
        p.startsWith('/help'),
    },
    {
      href: '/search',
      label: '検索',
      icon: Search,
      match: (p) => p.startsWith('/search'),
    },
  ];

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
                href={t.href}
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
