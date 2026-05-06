import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Badge } from '@locore/ui';
import { requireUser } from '@/lib/auth/require-user';
import { becomeWriter } from './actions';

export const metadata = {
  title: '書き手になる',
};

export const dynamic = 'force-dynamic';

export default async function BecomeWriterPage() {
  const user = await requireUser('/become-writer');

  // 既に書き手 → ダッシュボードへ
  if (user.role === 'resident_writer' || user.role === 'editor') {
    redirect('/writer/articles');
  }

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            Become a writer
          </p>
          <h1
            className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[36px]"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            書き手になる
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground/70">
            Locore は、現地で生活する書き手が綴る短尺の旅行誌です。
            自己申告での登録（Tier B）から始められ、後から滞在ビザ等を提出することで
            Tier A / Tier S にアップグレードできます。
          </p>
        </header>

        <div className="mb-8 space-y-3 rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Tier B</Badge>
            <span className="text-[13px] font-medium text-foreground">
              自己申告 + プロフィール審査
            </span>
          </div>
          <ul className="ml-4 list-disc space-y-1 text-[12px] text-foreground/65">
            <li>記事の価格上限は ¥1,000/記事</li>
            <li>滞在ビザ等の追加書類で Tier A（¥3,000）/ Tier S（上限なし）に昇格可能</li>
            <li>手数料は記事販売額の 20%（Tier S は 10%）</li>
            <li>月次精算（締め 15 日 / 支払い 月末、最低送金額 ¥3,000）</li>
          </ul>
        </div>

        <form action={becomeWriter} className="space-y-5 rounded-md border border-border bg-card p-6">
          <div className="space-y-1.5">
            <label htmlFor="residencyCountry" className="text-[12px] font-medium text-foreground/80">
              居住国
            </label>
            <Input
              id="residencyCountry"
              name="residencyCountry"
              type="text"
              required
              maxLength={80}
              placeholder="例：フランス"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="residencyYears" className="text-[12px] font-medium text-foreground/80">
              居住年数（年）
            </label>
            <Input
              id="residencyYears"
              name="residencyYears"
              type="number"
              min={0}
              max={80}
              defaultValue={0}
              required
            />
          </div>

          <label className="flex items-start gap-2 text-[12px] leading-relaxed text-foreground/75">
            <input
              type="checkbox"
              name="agreeTerms"
              required
              className="mt-0.5 size-4 accent-primary-700"
            />
            <span>
              <Link href="/legal#terms" className="text-primary-700 underline-offset-4 hover:underline">
                利用規約
              </Link>{' '}
              および書き手規約（オリジナル記事の保証、ステマ禁止、禁止コンテンツ等）に同意します。
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button asChild variant="outline" size="md">
              <Link href="/">キャンセル</Link>
            </Button>
            <Button type="submit" variant="primary" size="md">
              書き手として登録する
            </Button>
          </div>

          <p className="text-[11px] text-foreground/55">
            ※ Tier B として登録されます。書類提出による Tier 昇格は登録後に
            「設定 &gt; プロフィール」から申請できます。
          </p>
        </form>
      </section>
    </main>
  );
}
