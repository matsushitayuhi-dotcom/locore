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
  // メッセージはタブの一番最後（重要度的にナビ末尾）
  { href: '/chat', label: 'メッセージ', icon: Compass },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-primary-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group inline-flex items-baseline font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-serif), var(--font-serif-jp), serif' }}
        >
          <span className="text-[24px] bg-gradient-to-br from-primary-500 to-primary-700 bg-clip-text text-transparent transition group-hover:from-primary-300 group-hover:to-primary-500">
            Locore
          </span>
          <span className="ml-1 rounded-full bg-accent-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-900">
            β
          </span>
        </Link>

        <nav className="ml-3 hidden items-center gap-1 text-sm md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-3 py-1.5 font-medium text-neutral-700 transition hover:bg-primary-50 hover:text-primary-700"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/founders"
            className="hidden items-center gap-1 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 ring-1 ring-primary-100 transition hover:bg-primary-100 hover:ring-primary-300 sm:inline-flex"
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

      {/* Mobile nav strip */}
      <nav className="flex gap-2 overflow-x-auto border-t border-primary-100 bg-primary-50/40 px-4 py-2 text-[13px] md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="whitespace-nowrap rounded-full bg-white px-3 py-1 font-medium text-primary-700 shadow-xs ring-1 ring-primary-100"
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
