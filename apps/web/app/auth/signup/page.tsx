import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SignupForm } from '@/components/auth/SignupForm';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { getCurrentUser } from '@/lib/auth/current-user';

export const metadata = {
  title: 'アカウント作成',
};

export const dynamic = 'force-dynamic';

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: { redirect_to?: string };
}) {
  const user = await getCurrentUser();
  if (user) {
    const target = searchParams?.redirect_to;
    redirect(target && target.startsWith('/') && !target.startsWith('//') ? target : '/');
  }

  const redirectTo = searchParams?.redirect_to;
  const loginHref = redirectTo
    ? `/auth/login?redirect_to=${encodeURIComponent(redirectTo)}`
    : '/auth/login';

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            Get started
          </p>
          <h1
            className="mt-2 text-[28px] font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            Locore のアカウントを作成
          </h1>
          <p className="mt-2 text-[13px] text-foreground/60">
            旅行者として無料で開始できます。記事の購入・旅程作成・お気に入りが利用できます。
          </p>
        </header>

        <SignupForm redirectTo={redirectTo} />

        <div className="my-6 flex items-center gap-3 text-[11px] text-foreground/45">
          <span className="h-px flex-1 bg-border" />
          または
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton redirectTo={redirectTo} />

        <p className="mt-8 text-center text-[12px] text-foreground/60">
          既にアカウントをお持ちの方は{' '}
          <Link
            href={loginHref}
            className="font-medium text-primary-700 underline-offset-4 hover:underline"
          >
            ログイン
          </Link>
        </p>
      </section>
    </main>
  );
}
