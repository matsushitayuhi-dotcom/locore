import Link from 'next/link';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/auth/current-user';

/**
 * 書き手ダッシュボード共通レイアウト。
 * `resident_writer` または `editor` ロール以外はアクセス拒否。
 */
export const dynamic = 'force-dynamic';

const NAV_ITEMS = [{ href: '/writer/articles', label: '記事' }] as const;

export default async function WriterLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (user.role !== 'resident_writer' && user.role !== 'editor') {
    return (
      <main className="bg-background">
        <div className="mx-auto max-w-screen-md px-4 py-16 sm:px-6">
          <h1
            className="text-[24px] font-semibold tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            書き手専用ページです
          </h1>
          <p className="mt-3 text-[13px] text-foreground/70">
            このページは、Locore の書き手として登録された方のみご利用いただけます。
            書き手登録についてのご案内は{' '}
            <Link href="/writers" className="text-primary-700 underline-offset-4 hover:underline">
              書き手紹介ページ
            </Link>
            をご覧ください。
          </p>
        </div>
      </main>
    );
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
            書き手ダッシュボード
          </h1>
          <p className="mt-2 text-[13px] text-foreground/60">
            ようこそ、{user.displayName ?? user.email} さん。
          </p>
        </header>

        <nav aria-label="書き手ナビゲーション" className="mb-8 border-b border-border">
          <ul className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-t-sm px-4 py-2 text-[13px] text-foreground/70 transition-colors hover:bg-neutral-50 hover:text-foreground"
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
