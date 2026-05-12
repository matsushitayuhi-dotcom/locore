import Link from 'next/link';
import { Button } from '@locore/ui';
import { getCurrentUser } from '@/lib/auth/current-user';
import { UserMenu } from './auth/UserMenu';
import { SideMenu } from './SideMenu';

/**
 * トップバー。見る専門の主要ナビと、左サイドメニュー（SideMenu）への入口を持つ。
 *
 * - 左端: ハンバーガー（SideMenu）+ ロゴ
 * - 中央: 見る専門ナビ（フィード / マップ / 掲示板 / お気に入り / 購入記事）
 *   - クリエイター系（新規投稿 / 投稿記事一覧 / 売上 / メッセージ）は
 *     SideMenu 側に移したのでここには出さない
 * - 右端: Founders 入口 + UserMenu / ログイン
 */

const NAV = [
  { href: '/', label: '世界' },
  { href: '/region/paris', label: 'パリ' },
  { href: '/map', label: 'マップ' },
  { href: '/board', label: '掲示板' },
  { href: '/library', label: 'お気に入り' },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isWriter = user?.role === 'resident_writer' || user?.role === 'editor';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-2 px-3 sm:gap-4 sm:px-6">
        <SideMenu viewerLoggedIn={!!user} isWriter={isWriter} />

        <Link
          href="/"
          className="group inline-flex items-baseline font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          <span className="text-[22px] sm:text-[24px] bg-gradient-to-br from-primary-300 to-primary-500 bg-clip-text text-transparent transition group-hover:from-primary-200 group-hover:to-primary-300">
            Locore
          </span>
          <span className="ml-1 rounded-full bg-primary-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-950">
            β
          </span>
        </Link>

        <nav className="ml-3 hidden items-center gap-1 text-sm md:flex">
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

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/founders"
            className="hidden items-center gap-1 rounded-full bg-primary-500/10 px-3 py-1.5 text-xs font-semibold text-primary-300 ring-1 ring-primary-500/30 transition hover:bg-primary-500/20 hover:ring-primary-500/50 sm:inline-flex"
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
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">ログイン</Link>
              </Button>
              <Button asChild variant="primary" size="sm" className="hidden sm:inline-flex">
                <Link href="/auth/signup">サインアップ</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
