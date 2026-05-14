import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@locore/ui';
import { requireUser } from '@/lib/auth/require-user';
import { becomeWriter } from './actions';

export const metadata = {
  title: 'クリエイターになる',
};

export const dynamic = 'force-dynamic';

export default async function BecomeWriterPage() {
  const user = await requireUser('/become-writer');

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
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            書き手として登録する
          </h1>
          <p className="mt-3 text-[14px] leading-[1.9] text-foreground/70">
            現地に住んでいる人だけでなく、過去に住んでいた人や旅行者として
            訪れた人も、Locore で記事を書けます。
            居住認証は別途、現地居住者として認証バッジを得るための任意の申請です。
          </p>
        </header>

        {/* Tier / 手数料の説明 */}
        <div className="mb-8 rounded-xl bg-card p-5 ring-1 ring-border">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            クリエイターランクと手数料
          </p>
          <p className="mt-1 text-[13px] text-foreground/70">
            記事の価格はランクによらず自由に設定できます。
            ランクの差は手数料率の差です。販売実績で自動的に昇格していきます。
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-foreground/65 sm:grid-cols-4">
            <li className="rounded-md bg-primary-500/10 px-2 py-1.5">
              <span className="block font-bold text-primary-300">入門 (B)</span>
              手数料 25%
            </li>
            <li className="rounded-md bg-primary-500/10 px-2 py-1.5">
              <span className="block font-bold text-primary-300">認定 (A)</span>
              手数料 20% / 累計 10 件以上
            </li>
            <li className="rounded-md bg-primary-500/10 px-2 py-1.5">
              <span className="block font-bold text-primary-300">プロ (S)</span>
              手数料 15% / 累計 50 件 + 月 ¥30,000
            </li>
            <li className="rounded-md bg-accent-500/10 px-2 py-1.5">
              <span className="block font-bold text-accent-500">Founders</span>
              手数料 10% 永久 / 先着 50 人
            </li>
          </ul>
        </div>

        <form
          action={becomeWriter}
          className="space-y-6 rounded-xl bg-card p-6 ring-1 ring-border"
        >
          {/* 居住状況 */}
          <fieldset className="space-y-2">
            <legend className="mb-2 block text-[12px] font-bold uppercase tracking-[0.16em] text-foreground/55">
              あなたとその国の関わり方 <span className="text-danger-500">*</span>
            </legend>
            <p className="mb-3 text-[11px] text-foreground/55">
              選んだ立場に応じて記事の見せ方が変わります。後から変更可能です。
            </p>
            <div className="grid gap-2">
              <ResidencyOption
                value="current_resident"
                title="現地に住んでいる"
                description="そこに 1 年以上住んでいる。後から居住認証バッジを申請可能。"
                recommended
              />
              <ResidencyOption
                value="past_resident"
                title="過去に住んでいた"
                description="今は離れているが、暮らしの記憶を持っている。バッジは付かない。"
              />
              <ResidencyOption
                value="traveler"
                title="旅行者として訪れた"
                description="観光客の視点で書く。バッジは付かないが、訪問者の目線記事として価値を持つ。"
              />
            </div>
          </fieldset>

          {/* 国 + 年数 */}
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-1.5">
              <label
                htmlFor="residencyCountry"
                className="text-[12px] font-medium text-foreground/80"
              >
                対象の国 <span className="text-danger-500">*</span>
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
              <label
                htmlFor="residencyYears"
                className="text-[12px] font-medium text-foreground/80"
              >
                居住・滞在年数（年）
              </label>
              <Input
                id="residencyYears"
                name="residencyYears"
                type="number"
                min={0}
                max={80}
                defaultValue={0}
              />
              <p className="text-[10px] text-foreground/55">
                旅行者の場合は 0 でも可
              </p>
            </div>
          </div>

          <label className="flex items-start gap-2 text-[12px] leading-relaxed text-foreground/75">
            <input
              type="checkbox"
              name="agreeTerms"
              required
              className="mt-0.5 size-4 accent-primary-500"
            />
            <span>
              <Link
                href="/legal#terms"
                className="text-primary-300 underline-offset-4 hover:underline"
              >
                利用規約
              </Link>{' '}
              および クリエイター規約（オリジナル性、ステマ禁止、禁止コンテンツ）に同意します。
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
            ※ 入門 (B) ランクから始まります。販売実績によって自動で昇格します。
            居住認証バッジを希望する方は、登録後に「設定 → プロフィール」から
            申請できます。
          </p>
        </form>
      </section>
    </main>
  );
}

function ResidencyOption({
  value,
  title,
  description,
  recommended,
}: {
  value: string;
  title: string;
  description: string;
  recommended?: boolean;
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background px-3 py-3 transition has-[:checked]:border-primary-500 has-[:checked]:bg-primary-500/10">
      <input
        type="radio"
        name="residencyStatus"
        value={value}
        required
        defaultChecked={recommended}
        className="mt-1 size-4 accent-primary-500"
      />
      <span className="flex-1">
        <span className="flex items-baseline gap-2">
          <span className="text-[13px] font-bold text-foreground">{title}</span>
          {recommended ? (
            <span className="rounded-sm bg-primary-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-950">
              認証バッジ可
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-foreground/65">
          {description}
        </span>
      </span>
    </label>
  );
}
