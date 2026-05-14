import Link from 'next/link';
import { Button } from '@locore/ui';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getMyUnreadChatSummary } from '@/lib/chat/unread';
import { getViewerMode, homePathFor } from '@/lib/mode/cookie';
import { listCountriesForPicker } from '@/lib/geo/countries';
import { UserMenu } from './auth/UserMenu';
import { SideMenu } from './SideMenu';
import { PlaceMenu } from './PlaceMenu';
import { ModeToggle } from './ModeToggle';
import { Logo } from './Logo';

/**
 * トップバー。
 *
 * モード（旅行者 / 駐在員）共通で、コンテンツ系のナビをここに集約:
 *   ホーム / 場所 / マップ / 新着ニュース
 *
 * ユーザー固有のメニュー（お気に入り / 旅程 / 購入記事 / クリエイター系 /
 * アカウント設定）は SideMenu に移し、重複を排除した。
 *
 * Founders 枠ボタンも撤去（駐在員ホーム /expat 内のバナーに統合）。
 */
export async function SiteHeader() {
  const [user, mode, countries] = await Promise.all([
    getCurrentUser(),
    Promise.resolve(getViewerMode()),
    listCountriesForPicker(),
  ]);
  const isWriter = user?.role === 'resident_writer' || user?.role === 'editor';
  const unread = user ? await getMyUnreadChatSummary() : { count: 0, threadCount: 0 };
  const homeHref = mode ? homePathFor(mode) : '/';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/85 backdrop-blur">
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
          <Link
            href={homeHref}
            className="rounded-full px-3 py-1.5 font-medium text-foreground/70 transition hover:bg-primary-500/10 hover:text-foreground"
          >
            ホーム
          </Link>
          <PlaceMenu countries={countries} mode={mode ?? 'traveler'} />
          <Link
            href="/map"
            className="rounded-full px-3 py-1.5 font-medium text-foreground/70 transition hover:bg-primary-500/10 hover:text-foreground"
          >
            マップ
          </Link>
          <Link
            href="/board"
            className="rounded-full px-3 py-1.5 font-medium text-foreground/70 transition hover:bg-primary-500/10 hover:text-foreground"
          >
            新着ニュース
          </Link>
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
