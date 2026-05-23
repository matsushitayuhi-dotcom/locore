import Link from 'next/link';
import { Button } from '@locore/ui';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getMyUnreadChatSummary } from '@/lib/chat/unread';
import { getViewerMode, homePathFor } from '@/lib/mode/cookie';
import {
  listCountriesForPicker,
  listRegionsForPicker,
} from '@/lib/geo/countries';
import { UserMenu } from './auth/UserMenu';
import { SideMenu } from './SideMenu';
import { ModeToggle } from './ModeToggle';
import { Logo } from './Logo';
import { ServicesNavLink } from './nav/ServicesNavLink';
import { ArticlesNavLink } from './nav/ArticlesNavLink';
import { ResidentsNavLink } from './nav/ResidentsNavLink';
import { SearchTrigger } from './SearchTrigger';

/**
 * トップバー。2026-05 IA 3 領域モデル改修でナビを刷新:
 *
 *   旅行者・駐在員 共通: ホーム / 記事 / サービス / 駐在員向け / 検索
 *
 * 「マップ」「場所」(PlaceMenu) は廃止。地図は /explore の浮動ボタン経由、
 * 場所ピッカーは記事タブの国グリッドから drilling できる。
 *
 * 「コミュニティ▼」も「駐在員向け」リンクに置換。dropdown ではなく
 * 単一の /expat へのリンクとし、配下 6 種は /expat 内で導線を出す。
 *
 * 検索は Sheet 化されており、ボタンを押すと領域 / 国 / 地域フィルタ付きの
 * シートが開く。
 */
export async function SiteHeader() {
  const [user, mode, countries, regions] = await Promise.all([
    getCurrentUser(),
    Promise.resolve(getViewerMode()),
    listCountriesForPicker(),
    listRegionsForPicker(),
  ]);
  const isWriter = user?.role === 'resident_writer' || user?.role === 'editor';
  const unread = user ? await getMyUnreadChatSummary() : { count: 0, threadCount: 0 };
  const homeHref = mode ? homePathFor(mode) : '/';

  const sheetCountries = countries.map((c) => ({
    code: c.code,
    nameJa: c.nameJa,
  }));

  return (
    <header className="w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Link
          href={homeHref}
          className="group inline-flex shrink-0 items-center gap-1.5"
          aria-label="Locore ホームへ"
        >
          <Logo variant="wordmark" height={28} />
          <span className="rounded-full bg-primary-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-950">
            β
          </span>
        </Link>

        {/* モード切替 — モバイルでも常時見える位置に */}
        <ModeToggle currentMode={mode} />

        <nav className="hidden flex-1 items-center justify-center gap-1 text-sm md:flex">
          <NavLink href={homeHref}>ホーム</NavLink>
          <ArticlesNavLink />
          <ServicesNavLink />
          <ResidentsNavLink />
          <SearchTrigger countries={sheetCountries} regions={regions} />
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {user ? (
            <UserMenu
              user={{
                email: user.email,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                role: user.role,
              }}
            />
          ) : (
            <Button asChild variant="primary" size="sm">
              <Link href="/auth/login">ログイン</Link>
            </Button>
          )}

          <SideMenu
            viewerLoggedIn={!!user}
            isWriter={isWriter}
            unreadChatCount={unread.count}
            currentMode={mode}
          />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 font-medium text-foreground/70 transition hover:bg-primary-500/10 hover:text-foreground"
    >
      {children}
    </Link>
  );
}
