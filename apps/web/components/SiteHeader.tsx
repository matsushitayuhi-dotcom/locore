import Link from 'next/link';
import { Button } from '@locore/ui';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getMyUnreadChatSummary } from '@/lib/chat/unread';
import { getViewerMode, homePathFor } from '@/lib/mode/cookie';
import { listCountriesForPicker } from '@/lib/geo/countries';
import { getRegionsWithContent } from '@/lib/geo/region-content';
import { UserMenu } from './auth/UserMenu';
import { SideMenu } from './SideMenu';
import { PlaceMenu } from './PlaceMenu';
import { ModeToggle } from './ModeToggle';
import { Logo } from './Logo';

/**
 * トップバー。
 *
 * モード（旅行者 / 駐在員）でグローバルメニューを分岐する:
 *
 *   旅行者: ホーム / 場所 / 地図 / 検索
 *   駐在員: ホーム / 場所 / アパート / 売買 / 求人 / イベント / 習い事 / 助け合い / 検索
 *
 * 「新着ニュース」は両モードともグローバルからは外している（駐在員ホーム内の
 *  BoardWidget からは引き続き辿れる）。
 *
 * ユーザー固有のメニュー（お気に入り / 旅程 / 購入記事 / クリエイター系 /
 * アカウント設定）は SideMenu に集約。
 */
export async function SiteHeader() {
  const [user, mode, countries, regionsWithContent] = await Promise.all([
    getCurrentUser(),
    Promise.resolve(getViewerMode()),
    listCountriesForPicker(),
    getRegionsWithContent(),
  ]);
  const isWriter = user?.role === 'resident_writer' || user?.role === 'editor';
  const unread = user ? await getMyUnreadChatSummary() : { count: 0, threadCount: 0 };
  const homeHref = mode ? homePathFor(mode) : '/';
  // PlaceMenu のドロップダウンで「Coming Soon の地域」を出さないため、
  // コンテンツ存在 slug 集合を Array で渡す (Client Component なので Set
  // 直接渡しは serialize できない)
  const availableRegionSlugs = Array.from(regionsWithContent);

  const isResident = mode === 'resident';

  return (
    // sticky / safe-area-top は外側の HeaderShell (Client Component) が持つ。
    // ここは見た目だけ。
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
          <PlaceMenu
            countries={countries}
            mode={mode ?? 'traveler'}
            availableRegionSlugs={availableRegionSlugs}
          />
          {isResident ? (
            <>
              <NavLink href="/apartments">アパート</NavLink>
              <NavLink href="/marketplace">売買</NavLink>
              <NavLink href="/jobs">求人</NavLink>
              <NavLink href="/groups">イベント</NavLink>
              <NavLink href="/lessons">習い事</NavLink>
              <NavLink href="/help">助け合い</NavLink>
              <NavLink href="/search">検索</NavLink>
            </>
          ) : (
            <>
              <NavLink href="/map">地図から探す</NavLink>
              <NavLink href="/search">検索</NavLink>
            </>
          )}
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
