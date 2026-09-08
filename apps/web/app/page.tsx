import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Info,
  MessageCircle,
  Search,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { listFeaturedExperts } from '@/lib/experts/list';
import { CardCarousel } from '@/components/CardCarousel';
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
  title: 'Locore — 海外大学の在学生・卒業生に、留学相談',
  description:
    '大学院・MBA・学部の出願から現地生活まで。予備校の一般論ではなく、いま現地で学ぶ先輩のリアルを30分¥3,000〜で。',
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
              在学生・アルムナイによる留学相談・伴走
            </span>
            {/* 見出しが大きすぎるという指摘を受けて約 1 割縮小（46→41px / スマホ 30→27px）。
                本文・注釈は読みやすさのため据え置き（11px 未満は禁止） */}
            <h1 className="text-[clamp(27px,4.15vw,41px)] font-bold leading-[1.36] tracking-tight">
              いまその大学に通う先輩に、
              <br />
              <span className="text-primary-700">30分から</span>相談できる。
            </h1>
            <p className="mt-5 max-w-[33em] text-[15.5px] leading-relaxed text-neutral-700">
              エッセイも、研究室選びも、現地の家探しも。
              <b className="font-bold">合格した先輩・いま通っている先輩</b>
              に、あなたの場合を直接聞けます。
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <Link
                href="/experts"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 px-[30px] py-3.5 text-[15.5px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300 sm:w-auto"
              >
                エキスパートを探す
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {/* 下の #pricing（料金 & FAQ）へ。詳しい説明はそのセクションの
                  末尾から /about-service へ送る */}
              <Link
                href="#pricing"
                className="inline-flex w-full items-center justify-center rounded-full border border-border-strong px-[18px] py-2.5 text-[13.5px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground sm:w-auto"
              >
                料金とよくある質問
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-neutral-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary-700" aria-hidden />
                全員、在籍確認済み
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
          {/* 携帯（sm 未満）では重ねる演出をやめ、カード → 吹き出しの縦並びにする。
              幅 390px だと重なって文字が潰れ、名前や肩書きが 1 文字ずつ折り返してしまうため。 */}
          <div className="relative mx-auto w-full max-w-[520px] max-sm:min-h-0 sm:min-h-[420px]" aria-hidden>
            <div className="absolute inset-[8%_4%_6%_2%] rounded-3xl border border-border bg-muted max-sm:hidden" />
            <div className="absolute left-[16%] top-[13%] h-[190px] w-[63%] rotate-3 rounded-2xl border border-border bg-card opacity-55 shadow-md max-sm:hidden" />
            <div className="absolute left-[8%] top-[6%] w-[76%] rounded-2xl border border-border bg-card p-5 shadow-md max-sm:static max-sm:w-full sm:w-[63%]">
              <div className="flex items-center gap-3.5">
                <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-primary-100 text-[19px] font-bold text-primary-900">
                  里
                </span>
                {/* バッジは肩書きではなく名前の隣に置く。肩書きは 1 行まるごと使えるので折り返さない */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 truncate text-[15.5px] font-bold leading-tight">
                      高村 里奈
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-primary-300 bg-primary-100 px-2.5 py-0.5 text-[11px] font-bold text-primary-900">
                      <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
                      在籍確認済み
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-neutral-500">
                    🇺🇸 ボストン・HBS在学中
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['MBA', 'エッセイ・出願書類', '面接対策'].map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-muted px-[11px] py-1 text-[11px] font-medium text-neutral-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-3.5 flex items-baseline gap-1.5 border-t border-border pt-3">
                <b className="text-[19px] font-bold tabular-nums">¥6,000</b>
                <span className="text-[12px] text-neutral-500">/ 30分〜</span>
              </div>
            </div>
            <div className="absolute bottom-[24%] right-0 max-w-[78%] rounded-2xl rounded-br-md bg-neutral-900 px-4 py-3 text-[12.5px] leading-relaxed text-white shadow-md max-sm:static max-sm:ml-auto max-sm:mt-3 max-sm:max-w-[88%] sm:max-w-[66%]">
              {/* 話者ラベルはスマホ 11px（PC は 10.5px のまま） */}
              <span className="block text-[11px] sm:text-[10.5px] text-white/60">
                相談者
              </span>
              来年秋入学でMBA出願を予定しています。エッセイの方向性を相談したいです…!
            </div>
            <div className="absolute bottom-[4%] left-[4%] flex max-w-[66%] items-start gap-2.5 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-[12.5px] leading-relaxed shadow-md max-sm:static max-sm:mt-3 max-sm:max-w-[92%]">
              <span className="mt-0.5 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-primary-100 text-[12px] font-bold text-primary-900">
                里
              </span>
              <div>
                {/* 話者ラベルはスマホ 11px（PC は 10.5px のまま） */}
                <span className="block text-[11px] sm:text-[10.5px] text-neutral-500">
                  高村さん
                </span>
                もちろんです。ご職歴とターゲット校を教えてください。エッセイの軸を一緒に絞りましょう。
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
            <h2 className="text-[clamp(21px,2.7vw,27px)] font-bold">
              使い方は、3ステップ。
            </h2>
            <p className="mt-3 text-[14.5px] text-neutral-500">
              志望校の先輩を見つけて、話すだけ。準備も移動もいりません。
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <HowStep no="01" icon={<Search className="h-[22px] w-[22px]" aria-hidden />} title="探す">
              国と相談したいテーマで検索。プロフィールと相談メニュー、レビューを見て、自分に合う先輩を選びます。
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
              title="セッションで伴走"
              soon
            >
              30分または60分、ビデオ通話でじっくり。出願から渡航後まで、あなたの状況に合わせて伴走してもらえます。
            </HowStep>
          </div>
        </div>
      </section>

      {/* ===== featured experts ===== */}
      {experts.length > 0 ? (
        <section className="px-6 py-14 sm:py-[72px]">
          <div className="mx-auto max-w-[1120px]">
            <div className="mb-7 max-w-[640px]">
              <span className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-700">
                Experts
              </span>
              <h2 className="text-[clamp(21px,2.7vw,27px)] font-bold">
                その大学の「先輩」に聞く。
              </h2>
              <p className="mt-3 text-[14.5px] text-neutral-500">
                全員が学生証・入学証明書・卒業証書による在籍確認済み。いま、本当にその学校で学んでいる・学んだ人たちです。
              </p>
              {/* /experts への主要導線。CardCarousel の viewAllHref は上下 padding が
                  無くタップ領域 36px を満たさないので、見出し側に枠線ピルとして置く
                  （両方に置くと同じリンクが 2 つ並ぶので、カルーセルには渡さない） */}
              <Link
                href="/experts"
                className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-border-strong px-[18px] py-2.5 text-[13.5px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground"
              >
                すべてのエキスパート
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </div>
            {/* 縦グリッドだとスマホで 1 画面に 1〜2 枚しか入らず一覧性が悪いので、
                横スワイプのカルーセルにする。PC の送り矢印は CardCarousel の
                ヘッダーが持つ */}
            <CardCarousel ariaLabel="注目のエキスパート">
              {experts.map((e) => (
                <ExpertCard key={e.userId} expert={e} />
              ))}
            </CardCarousel>
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
            <h2 className="text-[clamp(21px,2.7vw,27px)] font-bold leading-snug">
              「本当にそこで学んだ人」だけが、
              <br />
              答えられることがある。
            </h2>
            <p className="mt-3 max-w-[640px] text-[14.5px] text-neutral-500">
              SNSで見つけた「合格者」は本物でしょうか。Locoreのエキスパートは全員、学生証・入学証明書・卒業証書で在学・卒業の実態を運営が確認しています。
            </p>
            <div className="mt-7 flex flex-col">
              <TrustStep n={1} title="在学・卒業を証明する書類の提出" last={false}>
                入学証明書・在籍証明書、学生証、卒業証書・学位記のいずれかを提出してもらいます。
              </TrustStep>
              <TrustStep n={2} title="運営による審査" last={false}>
                書類と申告内容（学校名・在学中か卒業か）を運営が照合。基準を満たした人だけが登録されます。
              </TrustStep>
              <TrustStep n={3} title="認証バッジの付与" last>
                審査を通過したエキスパートに「在籍確認済み」バッジを表示。在学中かアルムナイかも分かり、相談後のレビューと合わせて信頼の目印になります。
              </TrustStep>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-9 text-center shadow-md">
            <div className="mx-auto mb-5 grid h-[84px] w-[84px] place-items-center rounded-full border border-primary-200 bg-primary-50 text-primary-700">
              <ShieldCheck className="h-10 w-10" strokeWidth={1.8} aria-hidden />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-100 px-[18px] py-1.5 text-[13.5px] font-bold text-primary-900">
              <ShieldCheck className="h-[15px] w-[15px]" aria-hidden />
              在籍確認済み
            </span>
            <p className="mt-4 text-[13px] leading-relaxed text-neutral-500">
              このバッジは、運営が書類で在学・卒業を確認したエキスパートだけに表示されます。「詳しいらしい」ではなく「本当にその学校で学んだ」人の言葉です。
            </p>
          </div>
        </div>
      </section>

      {/* ===== 料金 & よくある質問（/about-service の要点をトップに要約） ===== */}
      {/* 「使い方はトップにあった方がいい」という要望。ページの入れ替えはせず、
          about-service の「料金の考え方」と FAQ の主要な数問だけを、入口に合う
          密度に要約して置く。続き（在籍確認の詳細・全 FAQ）は /about-service へ */}
      <section className="border-t border-border bg-muted px-6 py-14 sm:py-[72px]" id="pricing">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto mb-9 max-w-[640px] text-center">
            <span className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-700">
              Pricing &amp; FAQ
            </span>
            <h2 className="text-[clamp(21px,2.7vw,27px)] font-bold">
              料金と、はじめる前の疑問。
            </h2>
            <p className="mt-3 text-[14.5px] text-neutral-500">
              相談メニューの料金は、内容に応じてエキスパートが設定します。申し込む前のチャットは無料です。
            </p>
          </div>

          {/* 3 カラム化は md から。sm(640px) で 3 列にすると 1 枚の内容幅が
              約 147px しかなく、「月額 / 内容に応じて設定」が必ず折り返す */}
          <div className="grid gap-4 md:grid-cols-3">
            <PriceCard label="30分相談" price="¥3,000" unit="〜 / 税込" highlight>
              聞きたいことがはっきりしているとき。
            </PriceCard>
            <PriceCard label="60分相談" price="¥6,000" unit="〜 / 税込">
              書類を見てもらいながら、出願全体を整理したいとき。
            </PriceCard>
            <PriceCard label="継続プラン" price="月額" unit="内容に応じて設定">
              出願から渡航までを、同じ先輩とやり切りたいとき。
            </PriceCard>
          </div>

          <p className="mt-4 flex items-start gap-2.5 rounded-2xl border border-dashed border-border-strong bg-card px-5 py-3.5 text-[13px] leading-relaxed text-neutral-700">
            <Info className="mt-[3px] h-4 w-4 shrink-0 text-primary-700" aria-hidden />
            <span className="min-w-0">
              エキスパート探しも、申し込み前のチャットでの質問も無料。決済機能は現在準備中です。
            </span>
          </p>

          {/* トップに置くのは 3 問だけ。回答も 1〜2 行に圧縮し、続きは /about-service へ。
              about-service の FAQ をそのまま並べると重複コンテンツになり、詳細ページへ
              送る動機も消える。在籍確認の話は上の trust セクションが持っているので外した。
              JS を足さずに畳めるよう details/summary で書く */}
          <div className="mx-auto mt-9 max-w-[760px] space-y-2.5">
            <TopFaq q="いくらかかりますか？">
              金額はエキスパートが自分で決めます。目安は
              <b className="font-bold text-neutral-700">30分 ¥3,000〜、60分 ¥6,000〜</b>
              。申し込む前に、その人のページで確認できます。
            </TopFaq>
            <TopFaq q="どこから有料になりますか？">
              エキスパートを探すのも、
              <b className="font-bold text-neutral-700">申し込み前のチャット</b>
              も無料。お金がかかるのは、相談メニューを申し込んだあとだけです。
            </TopFaq>
            <TopFaq q="相手が海外にいても大丈夫？">
              日時はすべて
              <b className="font-bold text-neutral-700">あなたの現地時間で表示</b>
              されるので、時差の計算はいりません。
            </TopFaq>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/about-service"
              className="inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-border-strong bg-card px-[18px] py-2.5 text-[13.5px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground"
            >
              使い方とよくある質問をすべて見る
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== final CTA ===== */}
      <section className="px-6 pb-24 pt-[88px]">
        {/* 320px では px-10 だと内側が約 192px しか残らず、CTA ボタンの
            「エキスパートを探す」が途中で折り返す。スマホだけ余白を詰める（PC は据え置き） */}
        <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-3xl border border-border bg-card px-10 py-16 text-center shadow-sm max-sm:px-5 max-sm:py-11">
          <span className="absolute -right-[70px] -top-[90px] h-60 w-60 rounded-full bg-primary-50" aria-hidden />
          <span className="absolute -bottom-[110px] -left-20 h-[260px] w-[260px] rounded-full bg-muted" aria-hidden />
          <div className="relative">
            <h2 className="text-[clamp(22px,3.1vw,31px)] font-bold">
              その疑問、<span className="text-primary-700">現地の30分</span>
              で解決するかもしれない。
            </h2>
            <p className="mt-3.5 text-[14.5px] text-neutral-500">
              検索を3時間続けるより、住んでいる人にひとこと聞いてみませんか。
            </p>
            {/* 狭い端末ではラベルを折り返させないため左右余白を詰める（PC は据え置き） */}
            <Link
              href="/experts"
              className="mt-7 inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full bg-primary-500 px-9 py-[15px] text-[15.5px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300 max-sm:px-6"
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

/** トップの料金カード（about-service の料金表を 1 行ずつに要約したもの） */
function PriceCard({
  label,
  price,
  unit,
  highlight = false,
  children,
}: {
  label: string;
  price: string;
  unit: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        'flex flex-col rounded-2xl bg-background px-5 py-6 ' +
        (highlight ? 'border-[1.5px] border-primary-500 shadow-sm' : 'border border-border')
      }
    >
      <span className="text-[13.5px] font-bold">{label}</span>
      {/* 狭い幅では「月額」と「内容に応じて設定」が 1 行に入らないので折り返させる。
          26px の数字の直下に貼り付かないよう gap-y も要る */}
      <span className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <b className="shrink-0 text-[26px] font-bold tabular-nums tracking-tight">{price}</b>
        <span className="shrink-0 whitespace-nowrap text-[12px] text-neutral-500">{unit}</span>
      </span>
      <p className="mt-2.5 text-[13px] leading-relaxed text-neutral-500">{children}</p>
    </div>
  );
}

/** トップの FAQ 1 問。JS なしで開閉できる details/summary */
function TopFaq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-border bg-card px-5">
      {/* タップ領域は 14px の行 + py-3.5 で 36px 以上。ブラウザ既定の三角は消す */}
      <summary className="flex cursor-pointer list-none items-center gap-3 py-3.5 text-[14px] font-bold [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{q}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-neutral-500 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <p className="pb-4 text-[13px] leading-loose text-neutral-500">{children}</p>
    </details>
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
