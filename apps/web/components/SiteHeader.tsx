import Link from 'next/link';
import { Button } from '@locore/ui';
import { Compass, MapIcon, LayoutList, Sparkles } from '@locore/ui/icons';
import { getCurrentUser } from '@/lib/auth/current-user';
import { UserMenu } from './auth/UserMenu';

const NAV = [
  { href: '/', label: 'フィード', icon: Compass },
  { href: '/map', label: 'マップ', icon: MapIcon },
  { href: '/trips', label: '旅程', icon: LayoutList },
  { href: '/library', label: 'お気に入り', icon: Compass },
  { href: '/purchases', label: '購入記事', icon: Compass },
  { href: '/writer/articles', label: '記事投稿', icon: Compass },
  { href: '/chat', label: 'メッセージ', icon: Compass },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group inline-flex items-baseline font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          <span className="text-[24px] bg-gradient-to-br from-primary-300 to-primary-500 bg-clip-text text-transparent transition group-hover:from-primary-200 group-hover:to-primary-300">
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
              className="rounded-full px-3 py-1.5 font-medium text-foreground/70 transition hover:bg-surface-muted hover:text-foreground"
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
              <Button asChild variant="primary" size="sm">
                <Link href="/auth/signup">サインアップ</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav strip — TODO: BottomNav に置き換える */}
      <nav className="flex gap-2 overflow-x-auto border-t border-border bg-surface-muted/40 px-4 py-2 text-[13px] md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="whitespace-nowrap rounded-full bg-card px-3 py-1 font-medium text-foreground/80 ring-1 ring-border"
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
