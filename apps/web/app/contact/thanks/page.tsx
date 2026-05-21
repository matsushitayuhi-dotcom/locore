import Link from 'next/link';
import { Button } from '@locore/ui';
import { Check } from '@locore/ui/icons';

export const metadata = {
  title: 'お問い合わせありがとうございました',
};

export default function ContactThanksPage({
  searchParams,
}: {
  searchParams?: { code?: string };
}) {
  const code = searchParams?.code ?? '';

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-500">
            <Check className="h-6 w-6" />
          </span>
          <h1
            className="mt-4 text-[24px] font-semibold tracking-tight"
          >
            お問い合わせを受け付けました
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground/70">
            運営チームより <strong className="text-foreground">72 時間以内</strong>{' '}
            に一次返信いたします。
            <br />
            返信は、ご記入いただいたメールアドレス宛にお送りします。
          </p>

          {code ? (
            <div className="mt-6 inline-flex flex-col items-center rounded-sm border border-border bg-background px-5 py-3">
              <span className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
                受付番号
              </span>
              <span className="mt-1 font-mono text-[18px] font-semibold tabular text-foreground">
                {code}
              </span>
            </div>
          ) : null}

          <div className="mt-8">
            <Button asChild variant="outline">
              <Link href="/">フィードに戻る</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
