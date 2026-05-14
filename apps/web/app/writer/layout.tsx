import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth/require-user';

/**
 * クリエイターダッシュボード共通レイアウト。
 * - 未ログイン: /auth/login へ（middleware でも保護されるが二重で）
 * - 'reader' ロール: /become-writer へ誘導
 * - 'resident_writer' / 'editor': そのまま
 */
export const dynamic = 'force-dynamic';

const NAV_ITEMS = [
  { href: '/writer/articles', label: '記事' },
  { href: '/writer/sales', label: '売上' },
] as const;

export default async function WriterLayout({ children }: { children: ReactNode }) {
  const user = await requireUser('/writer/articles');

  if (user.role !== 'resident_writer' && user.role !== 'editor') {
    redirect('/become-writer');
  }

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/60">
            Writer Studio
          </p>
          <h1
            className="text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            クリエイターダッシュボード
          </h1>
          <p className="mt-2 text-[13px] text-foreground/60">
            ようこそ、{user.displayName ?? user.email} さん。
          </p>
        </header>

        <nav aria-label="クリエイターナビゲーション" className="mb-8 border-b border-border">
          <ul className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-t-sm px-4 py-2 text-[13px] text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section>{children}</section>
      </div>
    </main>
  );
}
