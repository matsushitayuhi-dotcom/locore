import Link from 'next/link';
import { Button } from '@locore/ui';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getMyUnreadChatSummary } from '@/lib/chat/unread';
import { getViewerMode, homePathFor } from '@/lib/mode/cookie';
import { listCountriesForPicker } from '@/lib/geo/countries';
import { UserMenu } from './auth/UserMenu';
import { SideMenu } from './SideMenu';
import { PlaceMenu } from './PlaceMenu';

/**
 * トップバー。
 *
 * - 左: ロゴ
 * - 中央 (md+): ホーム / 場所(dropdown) / マップ / 掲示板 / あとで読む
 * - 右: Founders / UserMenu / ハンバーガー
 *
 * モード（旅行者 / 駐在員）に応じて「ホーム」リンクの行き先を切替。
 */
export async function SiteHeader() {
  const [user, mode, countries] = await Promise.all([
    getCurrentUser(),
    Promise.resolve(getViewerMode()),
    listCountriesForPicker(),
  ]);
  const isWriter = user?.role === 'resident_writer' || user?.role === 'editor';
  const unread = user ? await getMyUnreadChatSummary() : { count: 0, threadCount: 0 };
  // 未選択ならとりあえず traveler ホームを指すが、/ に着地してすぐ splash に戻る挙動
  const homeHref = mode ? homePathFor(mode) : '/';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Link
          href={homeHref}
          className="group inline-flex shrink-0 items-baseline font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          <span className="text-[22px] sm:text-[24px] bg-gradient-to-br from-primary-300 to-primary-500 bg-clip-text text-transparent transition group-hover:from-primary-200 group-hover:to-primary-300">
            Locore
          </span>
          <span className="ml-1 rounded-full bg-primary-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-950">
            β
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 text-sm md:flex">
          <Link
            href={homeHref}
            className="rounded-full px-3 py-1.5 font-medium text-foreground/70 transition hover:bg-primary-500/10 hover:text-foreground"
          >
            ホーム
          </Link>
          <PlaceMenu countries={countries} />
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
            掲示板
          </Link>
          <Link
            href="/library"
            className="rounded-full px-3 py-1.5 font-medium text-foreground/70 transition hover:bg-primary-500/10 hover:text-foreground"
          >
            あとで読む
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/founders"
            className="hidden items-center gap-1 rounded-full bg-primary-500/10 px-3 py-1.5 text-xs font-semibold text-primary-300 ring-1 ring-primary-500/30 transition hover:bg-primary-500/20 hover:ring-primary-500/50 md:inline-flex"
          >
            Founders 枠 →
          </Link>

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
