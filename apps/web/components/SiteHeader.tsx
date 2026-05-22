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
import { ServicesNavLink } from './nav/ServicesNavLink';
import { ArticlesNavLink } from './nav/ArticlesNavLink';
import { CommunityMenu } from './nav/CommunityMenu';

/**
 * トップバー。PR3 (マーケットプレイス進化) でナビを刷新:
 *
 *   旅行者: ホーム / 記事 / サービス / マップ / 検索
 *   駐在員: ホーム / 記事 / サービス / コミュニティ▼ / 検索
 *
 * 「コミュニティ」は 6 種 (求人 / 住居 / 売買 / 集まり / 習う / 助け) を
 * dropdown menu に畳んだもの。場所ピッカー (旧 PlaceMenu) も維持するが、
 * 「サービス」を第一級にして検索・出品・購入の主動線を太く見せる。
 *
 * 旧: 「保存」「お気に入り」「旅程」「購入記事」など個人系メニューは
 * SideMenu (ハンバーガー側) に集約。
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
  const availableRegionSlugs = Array.from(regionsWithContent);

  const isResident = mode === 'resident';

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
          {isResident ? (
            <>
              <CommunityMenu />
              <NavLink href="/search">検索</NavLink>
            </>
          ) : (
            <>
              <PlaceMenu
                countries={countries}
                mode={mode ?? 'traveler'}
                availableRegionSlugs={availableRegionSlugs}
              />
              <NavLink href="/map">地図</NavLink>
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
