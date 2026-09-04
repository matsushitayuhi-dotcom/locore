import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  MessageCircle,
  Search,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { listFeaturedExperts } from '@/lib/experts/list';
import { ExpertCard } from '@/components/experts/ExpertCard';

/**
 * `/` — v2 トップ（2026-09 ピボット）。
 *
 * 「現地に住む日本人に、30分だけ相談できる」エキスパート相談の入口。
 * mockups/v2/top.html の実装。旧ランディング (LandingClient.tsx) はファイルを
 * 残したまま import をやめて非表示化。
 *
 * cookie を読まない純粋な server component + ISR (1h) で Edge Cache に乗せる。
 * 注目エキスパートは listFeaturedExperts(6)（認証済み優先）。
 */
export const revalidate = 3600;

export const metadata = {
  title: 'Locore — 現地に住む日本人に、30分だけ相談できる',
  description:
    '移住、留学、駐在準備、こだわりの旅行。ガイドブックにも検索にも出てこない「実際のところ」を、居住認証済みの海外在住日本人にオンラインで直接相談できます。30分 ¥3,000〜。',
};

export default async function HomePage() {
  const experts = await listFeaturedExperts(6);

  return (
    <main className="bg-background text-foreground">
      {/* ===== hero ===== */}
      <section className="overflow-hidden px-6 pb-16 pt-12 sm:pt-[72px]">
        <div className="mx-auto grid max-w-[1120px] items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[12.5px] font-bold text-primary-900 shadow-xs">
              <span className="h-[7px] w-[7px] rounded-full bg-primary-500" aria-hidden />
              居住認証つき・海外在住日本人への相談サービス
            </span>
            <h1 className="text-[clamp(30px,4.6vw,46px)] font-bold leading-[1.36] tracking-tight">
              現地に住む日本人に、
              <br />
              <span className="text-primary-700">30分だけ</span>相談できる。
            </h1>
            <p className="mt-5 max-w-[33em] text-[15.5px] leading-relaxed text-neutral-700">
              移住、留学、駐在準備、こだわりの旅行——。ガイドブックにも検索にも出てこない「実際のところ」を、
              <b className="font-bold">いま現地で暮らす日本人</b>
              にオンラインで直接聞けます。
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <Link
                href="/experts"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 px-[30px] py-3.5 text-[15.5px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300 sm:w-auto"
              >
                エキスパートを探す
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/about-service"
                className="inline-flex w-full items-center justify-center rounded-full border border-border-strong px-[18px] py-2.5 text-[13.5px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground sm:w-auto"
              >
                使い方を見る
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-neutral-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary-700" aria-hidden />
                全員、居住認証済み
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-primary-700" aria-hidden />
                30分 ¥3,000〜
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 shrink-0 text-primary-700" aria-hidden />
                オンラインで完結
              </span>
            </div>
          </div>

          {/* hero visual: エキスパートカード + チャット（装飾） */}
          <div className="relative mx-auto min-h-[360px] w-full max-w-[520px] sm:min-h-[420px]" aria-hidden>
            <div className="absolute inset-[8%_4%_6%_2%] rounded-3xl border border-border bg-muted" />
            <div className="absolute left-[16%] top-[13%] h-[190px] w-[63%] rotate-3 rounded-2xl border border-border bg-card opacity-55 shadow-md" />
            <div className="absolute left-[8%] top-[6%] w-[76%] rounded-2xl border border-border bg-card p-5 shadow-md sm:w-[63%]">
              <div className="flex items-center gap-3.5">
                <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-primary-100 text-[19px] font-bold text-primary-900">
                  彩
                </span>
                <div>
                  <div className="text-[15.5px] font-bold leading-tight">
                    佐々木 彩
                  </div>
                  <div className="mt-0.5 text-[12px] text-neutral-500">
                    🇫🇷 パリ在住8年・現地で起業
                  </div>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-primary-300 bg-primary-100 px-2.5 py-0.5 text-[11px] font-bold text-primary-900">
                  <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
                  居住認証済み
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['移住', '仕事・起業', '生活手続き'].map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-muted px-[11px] py-1 text-[11px] font-medium text-neutral-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-3.5 flex items-baseline gap-1.5 border-t border-border pt-3">
                <b className="text-[19px] font-bold tabular-nums">¥4,000</b>
                <span className="text-[12px] text-neutral-500">/ 30分〜</span>
              </div>
            </div>
            <div className="absolute bottom-[24%] right-0 max-w-[78%] rounded-2xl rounded-br-md bg-neutral-900 px-4 py-3 text-[12.5px] leading-relaxed text-white shadow-md sm:max-w-[66%]">
              <span className="block text-[10.5px] text-white/60">
                相談者
              </span>
              来月からパリ駐在が決まりました。子連れで住むエリアの「実際のところ」を教えてほしいです…!
            </div>
            <div className="absolute bottom-[4%] left-[4%] flex max-w-[66%] items-start gap-2.5 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-[12.5px] leading-relaxed shadow-md">
              <span className="mt-0.5 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-primary-100 text-[12px] font-bold text-primary-900">
                彩
              </span>
              <div>
                <span className="block text-[10.5px] text-neutral-500">
                  佐々木さん
                </span>
                もちろんです。お子さんの年齢と職場の場所を教えてください。候補を3つに絞りましょう。
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== how it works ===== */}
      <section
        className="border-y border-border bg-muted px-6 py-14 sm:py-[72px]"
        id="how"
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto mb-10 max-w-[640px] text-center">
            <span className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-700">
              How it works
            </span>
            <h2 className="text-[clamp(23px,3vw,30px)] font-bold">
              使い方は、3ステップ。
            </h2>
            <p className="mt-3 text-[14.5px] text-neutral-500">
              知りたい街のエキスパートを見つけて、話すだけ。準備も移動もいりません。
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <HowStep no="01" icon={<Search className="h-[22px] w-[22px]" aria-hidden />} title="探す">
              都市と相談したいテーマで検索。プロフィールと相談メニュー、レビューを見て、自分に合う人を選びます。
            </HowStep>
            <HowStep
              no="02"
              icon={<MessageCircle className="h-[22px] w-[22px]" aria-hidden />}
              title="チャットで相談"
            >
              気になることをまず気軽に質問。相談内容のすり合わせをしてから、日程を決められます。
            </HowStep>
            <HowStep
              no="03"
              icon={<Video className="h-[22px] w-[22px]" aria-hidden />}
              title="オンラインで話す"
              soon
            >
              30分または60分、ビデオ通話でじっくり。あなたの事情に合わせた「現地のリアル」が聞けます。
            </HowStep>
          </div>
        </div>
      </section>

      {/* ===== featured experts ===== */}
      {experts.length > 0 ? (
        <section className="px-6 py-14 sm:py-[72px]">
          <div className="mx-auto max-w-[1120px]">
            <div className="mb-9 flex flex-col items-start gap-3.5 sm:flex-row sm:items-end sm:gap-5">
              <div className="max-w-[640px]">
                <span className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-700">
                  Experts
                </span>
                <h2 className="text-[clamp(23px,3vw,30px)] font-bold">
                  この街の「先輩」に聞く。
                </h2>
                <p className="mt-3 text-[14.5px] text-neutral-500">
                  全員が書類審査による居住認証済み。いま、本当にその街で暮らしている人たちです。
                </p>
              </div>
              <Link
                href="/experts"
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border-strong px-[18px] py-2 text-[13.5px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground sm:ml-auto"
              >
                すべてのエキスパート
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {experts.map((e) => (
                <ExpertCard key={e.userId} expert={e} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== trust ===== */}
      <section className="border-t border-primary-200 bg-gradient-to-b from-primary-50 to-background px-6 py-14 sm:py-[72px]">
        <div className="mx-auto grid max-w-[1120px] items-center gap-11 lg:grid-cols-[1fr_.92fr] lg:gap-16">
          <div>
            <span className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-700">
              Trust
            </span>
            <h2 className="text-[clamp(23px,3vw,30px)] font-bold leading-snug">
              「本当に現地在住」だけが、
              <br />
              答えられることがある。
            </h2>
            <p className="mt-3 max-w-[640px] text-[14.5px] text-neutral-500">
              SNSで見つけた相談相手は、本当にその街に住んでいるでしょうか。Locoreのエキスパートは全員、書類審査で現地の居住実態を確認しています。
            </p>
            <div className="mt-7 flex flex-col">
              <TrustStep n={1} title="居住を証明する書類の提出" last={false}>
                現地の滞在許可証・公共料金の請求書・賃貸契約書などを提出してもらいます。
              </TrustStep>
              <TrustStep n={2} title="運営による審査" last={false}>
                書類と申告内容（都市・在住年数）を運営が照合。基準を満たした人だけが登録されます。
              </TrustStep>
              <TrustStep n={3} title="認証バッジの付与" last>
                審査を通過したエキスパートに「居住認証済み」バッジを表示。相談後のレビューと合わせて、信頼の目印になります。
              </TrustStep>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-9 text-center shadow-md">
            <div className="mx-auto mb-5 grid h-[84px] w-[84px] place-items-center rounded-full border border-primary-200 bg-primary-50 text-primary-700">
              <ShieldCheck className="h-10 w-10" strokeWidth={1.8} aria-hidden />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-100 px-[18px] py-1.5 text-[13.5px] font-bold text-primary-900">
              <ShieldCheck className="h-[15px] w-[15px]" aria-hidden />
              居住認証済み
            </span>
            <p className="mt-4 text-[13px] leading-relaxed text-neutral-500">
              このバッジは、運営が書類で居住実態を確認したエキスパートだけに表示されます。「行ったことがある」ではなく「いま住んでいる」人の言葉です。
            </p>
          </div>
        </div>
      </section>

      {/* ===== final CTA ===== */}
      <section className="px-6 pb-24 pt-[88px]">
        <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-3xl border border-border bg-card px-10 py-16 text-center shadow-sm">
          <span className="absolute -right-[70px] -top-[90px] h-60 w-60 rounded-full bg-primary-50" aria-hidden />
          <span className="absolute -bottom-[110px] -left-20 h-[260px] w-[260px] rounded-full bg-muted" aria-hidden />
          <div className="relative">
            <h2 className="text-[clamp(24px,3.4vw,34px)] font-bold">
              その疑問、<span className="text-primary-700">現地の30分</span>
              で解決するかもしれない。
            </h2>
            <p className="mt-3.5 text-[14.5px] text-neutral-500">
              検索を3時間続けるより、住んでいる人にひとこと聞いてみませんか。
            </p>
            <Link
              href="/experts"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary-500 px-9 py-[15px] text-[15.5px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
            >
              エキスパートを探す
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <div className="mt-4 text-[12px] text-neutral-400">
              会員登録は無料。チャットでの事前相談から始められます。
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function HowStep({
  no,
  icon,
  title,
  soon = false,
  children,
}: {
  no: string;
  icon: React.ReactNode;
  title: string;
  soon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background px-[26px] pb-[26px] pt-7">
      <span className="mb-4 inline-flex items-center gap-2.5 text-[13px] font-bold tabular-nums text-primary-700">
        {no}
        <span className="h-px w-7 bg-primary-200" aria-hidden />
      </span>
      <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-900">
        {icon}
      </span>
      <h3 className="text-[16.5px] font-bold">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-loose text-neutral-500">
        {children}
      </p>
      {soon ? (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-info-50 px-3 py-1 text-[11.5px] font-bold text-info-500">
          <Clock className="h-3 w-3" aria-hidden />
          予約・決済機能は準備中
        </span>
      ) : null}
    </div>
  );
}

function TrustStep({
  n,
  title,
  last,
  children,
}: {
  n: number;
  title: string;
  last: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={'relative flex gap-[18px] ' + (last ? '' : 'pb-[26px]')}>
      {!last ? (
        <span
          className="absolute bottom-0.5 left-[17px] top-[38px] w-px bg-primary-200"
          aria-hidden
        />
      ) : null}
      <span className="z-[1] grid h-[35px] w-[35px] shrink-0 place-items-center rounded-full border border-primary-200 bg-card text-[14px] font-bold tabular-nums text-primary-700">
        {n}
      </span>
      <div>
        <b className="block text-[15px] font-bold">{title}</b>
        <p className="mt-1 text-[13.5px] leading-loose text-neutral-500">
          {children}
        </p>
      </div>
    </div>
  );
}
