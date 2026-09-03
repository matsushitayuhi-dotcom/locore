import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@locore/ui';
import { requireUser } from '@/lib/auth/require-user';
import { becomeWriter } from './actions';

export const metadata = {
  title: 'エキスパートとして参加',
};

export const dynamic = 'force-dynamic';

export default async function BecomeWriterPage() {
  const user = await requireUser('/become-writer');

  if (user.role === 'resident_writer' || user.role === 'editor') {
    // 既にエキスパート → 相談メニュー作成へ
    redirect('/settings/services');
  }

  return (
    <main className="bg-background">
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            Become an expert
          </p>
          <h1
            className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[36px]"
          >
            エキスパートとして登録する
          </h1>
          <p className="mt-3 text-[14px] leading-[1.9] text-foreground/70">
            海外での暮らしの知識を、30分からのオンライン相談として提供できます。
            居住認証は別途、現地居住者として認証バッジを得るための任意の申請です。
          </p>
        </header>

        {/* 登録後の流れ */}
        <div className="mb-8 rounded-xl bg-card p-5 ring-1 ring-border">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            登録後の流れ
          </p>
          <ol className="mt-2 space-y-1.5 text-[13px] text-foreground/70">
            <li>
              <b className="text-foreground/85">1. 相談メニューを作成</b> —
              30分 / 60分の相談メニュー（料金・得意テーマ）を登録すると、
              エキスパート一覧に掲載されます。
            </li>
            <li>
              <b className="text-foreground/85">2. 居住認証を申請（推奨）</b> —
              書類審査を通過すると「居住認証済み」バッジが付き、
              相談者からの信頼が大きく上がります。
            </li>
            <li>
              <b className="text-foreground/85">3. チャットで相談を受ける</b> —
              相談リクエストは Locore 内のチャットに届きます。
              内容と日程をすり合わせて、オンラインで相談を実施してください。
            </li>
          </ol>
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
                description="今は離れているが、暮らしの経験を持っている。バッジは付かない。"
              />
              <ResidencyOption
                value="traveler"
                title="旅行者として訪れた"
                description="訪問者の目線で経験を共有する。バッジは付かない。"
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
              および エキスパート規約（オリジナル性、ステマ禁止、禁止コンテンツ）に同意します。
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button asChild variant="outline" size="md">
              <Link href="/">キャンセル</Link>
            </Button>
            <Button type="submit" variant="primary" size="md">
              エキスパートとして登録する
            </Button>
          </div>

          <p className="text-[11px] text-foreground/55">
            ※ 登録後は相談メニューの作成ページに移動します。
            居住認証バッジを希望する方は「設定 → 居住認証」から申請できます。
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
