import Link from 'next/link';
import { ArrowRight, Clock, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';

/**
 * `/about` — Locoreについて（ブランド/ミッションページ）。
 * mockups/v2/about-page-v1.html（558951c）を忠実に実装。
 * 役割: /about = なぜLocoreか。how-to・料金・FAQ は /about-service に譲る。
 * 7 セクション: hero（写真帯・CTAなし）/ 課題 / 3つの柱 / 居住認証ダーク帯 /
 * エキスパートとは（実写4人カード）/ 名前の由来 / 最終CTA（写真帯）。
 * 写真（/about/*.jpg・/experts/*.jpg）はデモ用プレースホルダ（Pexels 商用可素材。
 * 特定の実在人物・エキスパートではない）。デザイン言語は about-service v7 と同一
 * （ライム・白基調・ゴシック統一・強調はウェイト+ライム色）。
 */

export const metadata = {
  title: 'Locoreについて',
  description:
    'Locoreは、海外大学の在学生・卒業生に直接相談できる留学相談サービスです。学部・大学院・MBA・語学・交換留学の「あなたの場合」に、その大学で実際に学んだ（現在・過去の）居住認証済みエキスパートが答えます。',
};

/* ===== 小物（about-service v7 と同じ言語） ===== */

function Kicker({ dark = false, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={
        'inline-flex items-center gap-2 rounded-full border px-4 py-[5px] text-[12.5px] font-bold ' +
        (dark
          ? 'border-primary-500/45 bg-transparent text-primary-500'
          : 'border-primary-300 bg-primary-100 text-primary-900')
      }
    >
      <i
        className={
          'h-[7px] w-[7px] rounded-full not-italic ' +
          (dark ? 'bg-primary-500' : 'bg-primary-700')
        }
        aria-hidden
      />
      {children}
    </span>
  );
}

function SectionH({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-[18px] text-[clamp(25px,3.6vw,38px)] font-black leading-[1.42] tracking-[-0.028em]">
      {children}
    </h2>
  );
}

/** 強調: ゴシックのままウェイト + ライム色（明朝・斜体不使用） */
function Em({ children }: { children: React.ReactNode }) {
  return <span className="font-black text-primary-700">{children}</span>;
}

function VBadge({ label = '居住認証済み' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border border-primary-300 bg-primary-100 px-2.5 py-[3px] text-[11px] font-bold text-primary-900">
      <ShieldCheck className="h-[11px] w-[11px] shrink-0" aria-hidden />
      {label}
    </span>
  );
}

/* ===== [5] エキスパートカード ===== */

type WhoCard = {
  img: string;
  name: string;
  city: string;
  tale: string;
};

const WHO_CARDS: WhoCard[] = [
  {
    img: '/experts/aya.jpg',
    name: '高村 里奈',
    city: '🇺🇸 ハーバード・ビジネス・スクール在学中',
    tale: '元総合商社。2024年出願でHBSとWhartonに合格し、私費×奨学金でMBA留学中。',
  },
  {
    img: '/experts/kentaro.jpg',
    name: '伊藤 蓮',
    city: '🇺🇸 コロンビア大学 CS修士在学中',
    tale: '事業会社エンジニアから社会人出願。SoPと社会人経験の見せ方に詳しい。',
  },
  {
    img: '/experts/chinatsu.jpg',
    name: '三宅 楓',
    city: '🇫🇷 シアンスポ修了・パリ勤務',
    tale: '英語プログラムで修士を修了し、現地就職。出願から面接までを経験者として。',
  },
  {
    img: '/experts/eri.jpg',
    name: '岡部 咲',
    city: '🇨🇦 ブリティッシュコロンビア大学在学中',
    tale: '日本の高校から直接出願でUBCへ。学部出願とキャンパス生活のいまを話せる。',
  },
];

/* ============================== page ============================== */

export default function AboutPage() {
  return (
    <main className="overflow-hidden bg-background text-foreground">
      {/* ===== [1] hero（写真帯・CTAなし）。写真はデモ用プレースホルダ ===== */}
      <section className="about-brand-hero-bg relative px-6 pb-[110px] pt-24 text-center text-white max-sm:pb-[84px] max-sm:pt-[72px]">
        <div className="mx-auto max-w-[1080px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-500/50 bg-white/10 px-4 py-[5px] text-[12.5px] font-bold text-primary-500">
            <i className="h-[7px] w-[7px] rounded-full bg-primary-500 not-italic" aria-hidden />
            About Locore
          </span>
          <h1 className="mx-auto mt-6 max-w-[22em] text-[clamp(30px,4.8vw,52px)] font-black leading-[1.42] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.4)]">
            海外での「これから」を、
            <br />
            経験者と。
          </h1>
          <p className="mx-auto mt-6 max-w-[36em] text-[16px] leading-[2.15] text-white/85">
            学部、大学院、MBA、語学・交換留学。ネットには一般論しかなくて、SNSやAIは&quot;あなたの場合&quot;には答えてくれません。Locoreは、
            <b className="font-bold text-white">
              その大学に通う日本人、そして学んだ経験のある日本人
            </b>
            に、直接相談できる場所です。
          </p>
        </div>
      </section>

      {/* ===== [2] なぜLocoreか ===== */}
      <section className="px-6 pb-[88px] pt-20">
        <div className="mx-auto max-w-[1080px]">
          <div className="mx-auto max-w-[720px] text-center">
            <Kicker>Why Locore</Kicker>
            <SectionH>
              入ってからの本当のことは、
              <br />
              <Em>いま通っている人</Em>しか知らない。
            </SectionH>
            <p className="mt-4 text-[15.5px] leading-[2.1] text-neutral-500">
              留学の準備は、わからないことだらけです。予備校が教えてくれるのは出願テクニックの一般論、ブログや動画は数年前の情報で止まっています。エッセイに何を書けば刺さるのか、その専攻・研究室の実際はどうか、奨学金はどれが現実的か。こういうことを本当に知っているのは、いまその大学で学んでいる人と、そこを出た人だけです。
            </p>
          </div>
          <div
            className="mx-auto mt-11 flex max-w-[820px] flex-wrap justify-center gap-3"
            aria-hidden
          >
            {[
              'エッセイ、何を書けば刺さる？',
              '研究室は、どう選ぶ？',
              '奨学金は、どれが現実的？',
            ].map((q) => (
              <span
                key={q}
                className="rounded-full border border-border bg-card px-[22px] py-2.5 text-[13.5px] font-bold text-neutral-700 shadow-xs"
              >
                <span className="text-primary-700">「</span>
                {q}
                <span className="text-primary-700">」</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== [3] 私たちの答え（3つの柱） ===== */}
      <section className="about-tint-b px-6 pb-[88px] pt-20">
        <div className="mx-auto max-w-[1080px]">
          <div className="max-w-[720px]">
            <Kicker>Our answer</Kicker>
            <SectionH>
              だから、いま通っている先輩に<Em>直接聞ける場所</Em>をつくりました。
            </SectionH>
          </div>
          <div className="mt-11 grid gap-[18px] lg:grid-cols-3">
            {[
              {
                icon: <Clock className="h-6 w-6" aria-hidden />,
                no: '01',
                t: '予備校は、出願テクニックの一般論',
                p: (
                  <>
                    合格までのテクニックは教えてくれても、
                    <b className="font-bold text-foreground">
                      入ってからの授業・研究室・生活のリアル
                    </b>
                    は教えてくれません。しかも高額です。
                  </>
                ),
              },
              {
                icon: <MessageCircle className="h-6 w-6" aria-hidden />,
                no: '02',
                t: 'ブログや動画は、古くて一方通行',
                p: (
                  <>
                    体験記は数年前の情報で止まりがちで、
                    <b className="font-bold text-foreground">
                      「あなたの場合はどうか」には答えてくれません
                    </b>
                    。制度もキャンパスも毎年変わります。
                  </>
                ),
              },
              {
                icon: <ShieldCheck className="h-6 w-6" aria-hidden />,
                no: '03',
                t: 'Locoreは、いまのLIVE情報 × 1対1の伴走',
                p: (
                  <>
                    居住認証済みの在学生・アルムナイに、
                    <b className="font-bold text-foreground">
                      いまの情報を、あなたの状況に合わせて
                    </b>
                    。30分の単発から、出願・渡航までの継続伴走まで。
                  </>
                ),
              },
            ].map((c) => (
              <div
                key={c.no}
                className="rounded-[18px] border border-border bg-card px-7 py-[30px] shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-[15px] bg-primary-100 text-primary-900">
                    {c.icon}
                  </span>
                  <i className="text-[13px] font-extrabold not-italic tabular-nums text-primary-700">
                    {c.no}
                  </i>
                </div>
                <h3 className="mt-4 text-[17.5px] font-black leading-[1.6]">{c.t}</h3>
                <p className="mt-2 text-[14px] leading-[2] text-neutral-500">{c.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== [4] 居住認証（ダーク帯） ===== */}
      <section className="about-trust-bg px-6 pb-[88px] pt-20 text-white">
        <div className="mx-auto grid max-w-[1080px] items-center gap-11 lg:grid-cols-[1.04fr_.96fr] lg:gap-14">
          <div>
            <Kicker dark>Trust</Kicker>
            <h2 className="mt-[18px] text-[clamp(25px,3.6vw,38px)] font-black leading-[1.42] tracking-[-0.028em] text-white">
              話す相手が、本当に
              <br />
              <b className="font-black text-primary-500">その街で暮らした人</b>か。
            </h2>
            <p className="mt-4 max-w-[34em] text-[15.5px] leading-[2.1] text-white/75">
              オンラインの相談で、いちばん確かめにくいのがここです。Locoreのエキスパートは全員、現地での居住実績（現在または過去）を書類で確認しています。プロフィールには居住認証済みのバッジが付きます。
            </p>
            <Link
              href="/about-service"
              className="mt-[26px] inline-flex items-center gap-2 text-[14.5px] font-bold text-primary-500 hover:underline hover:underline-offset-4"
            >
              審査のステップをくわしく見る
              <ArrowRight className="h-[15px] w-[15px]" aria-hidden />
            </Link>
          </div>
          {/* 白カード。text-foreground 明示でダーク帯の白文字継承を遮断 */}
          <div className="rounded-[22px] bg-card px-8 py-[34px] text-center text-foreground shadow-[0_26px_60px_-20px_rgba(0,0,0,0.5)]">
            <div className="mx-auto mb-4 grid h-[84px] w-[84px] place-items-center rounded-full border-[1.5px] border-primary-200 bg-primary-50 text-primary-700">
              <ShieldCheck className="h-10 w-10" strokeWidth={1.8} aria-hidden />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-100 px-[18px] py-1.5 text-[13.5px] font-bold text-primary-900">
              <ShieldCheck className="h-[13px] w-[13px]" aria-hidden />
              居住認証済み
            </span>
            <p className="mt-[15px] text-[14px] leading-[2] text-neutral-500">
              このバッジは、現地での居住実績を運営が書類で確認したエキスパートだけのものです。
            </p>
            <div className="mt-5 border-t border-dashed border-border-strong pt-4 text-left">
              <div className="mb-2.5 text-[9.5px] tracking-[0.12em] text-neutral-500">
                ▼ 一覧でもプロフィールでも
              </div>
              <div className="rounded-[14px] border border-border bg-card px-4 py-3.5">
                <div className="flex items-center gap-[11px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/experts/aya.jpg"
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full bg-muted object-cover"
                  />
                  <div>
                    <div className="text-[13.5px] font-extrabold">高村 里奈</div>
                    <div className="mt-px text-[11.5px] text-neutral-500">
                      🇺🇸 ボストン ・ HBS在学中
                    </div>
                  </div>
                  <span className="ml-auto">
                    <VBadge label="認証済み" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== [5] エキスパートとは ===== */}
      <section className="px-6 pb-[88px] pt-20">
        <div className="mx-auto max-w-[1080px]">
          <div className="max-w-[720px]">
            <Kicker>Who they are</Kicker>
            <SectionH>
              商業インフルエンサーではなく、
              <br />
              その大学の<Em>先輩</Em>。
            </SectionH>
            <p className="mt-4 text-[15.5px] leading-[2.1] text-neutral-500">
              いまHBSでMBAに通う人、コロンビアの大学院で研究する人、シアンスポを出てパリで働く先輩。いま通っている人も、かつて学んだ人もいます。フォロワー数ではなく、その大学で学んだ経験の深さで選んでいます。
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHO_CARDS.map((w) => (
              <div
                key={w.name}
                className="rounded-[18px] border border-border bg-card px-5 py-6 text-center shadow-xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={w.img}
                  alt=""
                  className="mx-auto h-[84px] w-[84px] rounded-full border-[3px] border-white bg-muted object-cover shadow-sm"
                />
                <div className="mt-3.5 text-[15px] font-extrabold">{w.name}</div>
                <div className="mt-[3px] text-[12.5px] text-neutral-500">{w.city}</div>
                <p className="mt-2.5 text-[12.5px] leading-[1.9] text-neutral-500">
                  {w.tale}
                </p>
                <div className="mt-3">
                  <VBadge />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-[22px] text-center text-[12.5px] text-neutral-500">
            写真はサンプルです。エキスパートの経歴は登録時の申告と居住認証にもとづいて掲載します。
          </p>
        </div>
      </section>

      {/* ===== [6] 名前の由来 ===== */}
      <section className="about-tint-b px-6 pb-[88px] pt-20">
        <div className="mx-auto max-w-[640px] text-center">
          <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-primary-500 text-neutral-950 shadow-md">
            <MapPin className="h-8 w-8" aria-hidden />
          </span>
          <div className="text-[clamp(19px,2.6vw,26px)] font-extrabold tracking-[-0.01em] tabular-nums">
            Locore = <b className="font-extrabold text-primary-700">Local</b>
            <span className="text-[0.62em] font-bold text-neutral-500">（現地）</span> +{' '}
            <b className="font-extrabold text-primary-700">Lore</b>
            <span className="text-[0.62em] font-bold text-neutral-500">
              （その土地の知恵）
            </span>
          </div>
          <p className="mt-4 text-[15px] leading-[2.1] text-neutral-500">
            現地で暮らした人だけが持っている知恵を、それを必要とする人へ。そんな思いでつけた名前です。
          </p>
        </div>
      </section>

      {/* ===== [7] 最終CTA（写真帯）。写真はデモ用プレースホルダ ===== */}
      <section className="px-6 pb-[92px]">
        <div className="mx-auto max-w-[1080px]">
          <div className="about-final-bg overflow-hidden rounded-3xl px-10 py-[72px] text-center text-white max-sm:px-[22px] max-sm:py-[52px]">
            <h2 className="text-[clamp(27px,4.2vw,44px)] font-black leading-[1.35] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
              あなたの海外を、
              <b className="font-black text-primary-500">経験者</b>と。
            </h2>
            <p className="mt-4 text-[15.5px] text-white/85">
              検索を3時間続けるより、暮らした人にひとこと聞いてみませんか。
            </p>
            <div className="mt-[30px] flex flex-wrap items-center justify-center gap-6">
              <Link
                href="/experts"
                className="inline-flex items-center gap-[9px] rounded-full bg-primary-500 px-8 py-3.5 text-[15px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
              >
                エキスパートを探す
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/become-writer"
                className="inline-flex items-center text-[15px] font-bold text-white"
              >
                <u className="underline decoration-primary-500 decoration-[3px] underline-offset-[5px] hover:decoration-primary-300">
                  エキスパートとして参加
                </u>
              </Link>
            </div>
            <p className="mt-5 text-[13.5px] text-white/80">
              <Link
                href="/about-service"
                className="font-bold text-white underline decoration-primary-500 decoration-2 underline-offset-4"
              >
                使い方をくわしく見る
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
