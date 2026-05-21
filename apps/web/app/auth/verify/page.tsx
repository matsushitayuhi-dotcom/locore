import Link from 'next/link';

export const metadata = {
  title: 'メール確認',
};

export const dynamic = 'force-dynamic';

export default function VerifyPage({
  searchParams,
}: {
  searchParams?: { email?: string };
}) {
  const email = searchParams?.email ?? '';

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-20">
        <header className="mb-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            Check your inbox
          </p>
          <h1
            className="mt-2 text-[26px] font-semibold tracking-tight"
          >
            メールを確認してください
          </h1>
        </header>

        <div className="space-y-4 rounded-md border border-border bg-card p-6 text-[13px] leading-relaxed text-foreground/75">
          <p>
            {email ? (
              <>
                <span className="font-medium text-foreground">{email}</span>{' '}
                宛に確認メールを送信しました。
              </>
            ) : (
              <>登録メールアドレス宛に確認メールを送信しました。</>
            )}
          </p>
          <p>
            メール本文のリンクをクリックすると登録が完了し、自動的に Locore にログインします。
          </p>
          <ul className="ml-4 list-disc space-y-1 text-[12px] text-foreground/55">
            <li>メールが届かない場合は、迷惑メールフォルダもご確認ください。</li>
            <li>確認リンクの有効期限は 24 時間です。</li>
            <li>
              登録メールアドレスを間違えた場合は、もう一度{' '}
              <Link href="/auth/signup" className="text-primary-300 underline-offset-4 hover:underline">
                サインアップ画面
              </Link>{' '}
              からやり直してください。
            </li>
          </ul>
        </div>

        <p className="mt-6 text-center text-[12px] text-foreground/60">
          既に確認済みの方は{' '}
          <Link
            href="/auth/login"
            className="font-medium text-primary-300 underline-offset-4 hover:underline"
          >
            ログイン
          </Link>
        </p>
      </section>
    </main>
  );
}
