import Link from 'next/link';
import { Button } from '@locore/ui';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getMyUnreadChatSummary } from '@/lib/chat/unread';
import { UserMenu } from './auth/UserMenu';
import { SideMenu } from './SideMenu';

/**
 * トップバー。
 *
 * 配置:
 *   - 左端: ロゴ
 *   - 中央 (md+): 見る専門ナビ（世界 / パリ / マップ / 掲示板 / お気に入り）
 *   - 右端 (順番):
 *       1. Founders 入口 (md+)
 *       2. UserMenu (ログイン中) or ログインボタン (未ログイン)
 *       3. ハンバーガー（SideMenu。右からスライドイン）
 *
 * モバイルで横詰めにならないよう、ボタン類は密度を下げる方向で。
 */

const NAV = [
  { href: '/', label: 'ホーム' },
  { href: '/world', label: '場所' },
  { href: '/map', label: 'マップ' },
  { href: '/board', label: '掲示板' },
  { href: '/library', label: 'あとで読む / 行く' },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isWriter = user?.role === 'resident_writer' || user?.role === 'editor';
  const unread = user ? await getMyUnreadChatSummary() : { count: 0, threadCount: 0 };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
        {/* 左: ロゴ */}
        <Link
          href="/"
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

        {/* 中央: ナビ (md+) */}
        <nav className="hidden flex-1 items-center justify-center gap-1 text-sm md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-3 py-1.5 font-medium text-foreground/70 transition hover:bg-primary-500/10 hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* 右: アクション群 — モバイルでは ハンバーガー + UserMenu/ログイン だけに絞る */}
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

          {/* ハンバーガー — 右端 */}
          <SideMenu
            viewerLoggedIn={!!user}
            isWriter={isWriter}
            unreadChatCount={unread.count}
          />
        </div>
      </div>
    </header>
  );
}
