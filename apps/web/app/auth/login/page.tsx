import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { getCurrentUser } from '@/lib/auth/current-user';

export const metadata = {
  title: 'ログイン',
};

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { redirect_to?: string; error?: string };
}) {
  // 既にログイン済みなら redirect_to or トップへ
  const user = await getCurrentUser();
  if (user) {
    const target = searchParams?.redirect_to;
    redirect(target && target.startsWith('/') && !target.startsWith('//') ? target : '/');
  }

  const redirectTo = searchParams?.redirect_to;
  const oauthError = searchParams?.error;

  const signupHref = redirectTo
    ? `/auth/signup?redirect_to=${encodeURIComponent(redirectTo)}`
    : '/auth/signup';

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            Welcome back
          </p>
          <h1
            className="mt-2 text-[28px] font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            Locore にログイン
          </h1>
          <p className="mt-2 text-[13px] text-foreground/60">
            メールアドレス、または Google アカウントでログインできます。
          </p>
        </header>

        {oauthError ? (
          <p
            role="alert"
            className="mb-4 rounded-md border border-danger-500/40 bg-danger-50 px-3 py-2 text-[12px] text-danger-500"
          >
            外部認証に失敗しました。再度お試しください。
          </p>
        ) : null}

        <LoginForm redirectTo={redirectTo} />

        <div className="my-6 flex items-center gap-3 text-[11px] text-foreground/45">
          <span className="h-px flex-1 bg-border" />
          または
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton redirectTo={redirectTo} />

        <p className="mt-8 text-center text-[12px] text-foreground/60">
          アカウントをお持ちでない方は{' '}
          <Link
            href={signupHref}
            className="font-medium text-primary-700 underline-offset-4 hover:underline"
          >
            新規登録
          </Link>
        </p>
      </section>
    </main>
  );
}
