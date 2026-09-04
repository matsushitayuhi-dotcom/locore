import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Clock,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  UserPlus,
  Video,
} from 'lucide-react';

/**
 * `/about-service` — 「使い方」ページ（v2: エキスパート相談サービス）。
 *
 * 旧コンセプト（記事マーケットプレイス）の /about へのリダイレクトを廃止し、
 * 相談サービスの説明ページとして独立させる（/about はログインゲート下のため、
 * 未ログイン訪問者が行き止まりになっていた）。middleware の PUBLIC_PREFIXES に
 * 登録済みの公開ページ。デザインはトップ（app/page.tsx）のライム基調トークンを踏襲。
 *
 * cookie を読まない純粋な server component（完全静的）。
 */

export const metadata = {
  title: '使い方',
  description:
    'Locore の使い方。現地に住む日本人エキスパートに、30分からオンラインで相談できます。エキスパートの探し方、チャットでの相談の流れ、居住認証のしくみ、エキスパートとしての参加方法を説明します。',
};

export default function AboutServicePage() {
  return (
    <main className="bg-background text-foreground">
      {/* ===== hero ===== */}
      <section className="border-b border-border px-6 pb-14 pt-12 sm:pb-16 sm:pt-[64px]">
        <div className="mx-auto max-w-[760px] text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[12.5px] font-bold text-primary-900 shadow-xs">
            <span className="h-[7px] w-[7px] rounded-full bg-primary-500" aria-hidden />
            Locore の使い方
          </span>
          <h1 className="text-[clamp(27px,4vw,40px)] font-bold leading-[1.4] tracking-tight">
            現地に住む日本人に、
            <br className="sm:hidden" />
            <span className="text-primary-700">30分から</span>相談できる。
          </h1>
          <p className="mx-auto mt-5 max-w-[36em] text-[15px] leading-relaxed text-neutral-700">
            移住、留学、駐在準備、こだわりの旅行——。ガイドブックにも検索にも出てこない「実際のところ」を、
            <b className="font-bold">居住認証済みの海外在住日本人</b>
            にオンラインで直接聞けるサービスです。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[12.5px] text-neutral-500">
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
      </section>

      {/* ===== 相談者向け: 使い方ステップ ===== */}
      <section className="border-b border-border bg-muted px-6 py-14 sm:py-[72px]">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto mb-10 max-w-[640px] text-center">
            <span className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-700">
              For you
            </span>
            <h2 className="text-[clamp(23px,3vw,30px)] font-bold">
              相談は、4ステップ。
            </h2>
            <p className="mt-3 text-[14.5px] text-neutral-500">
              知りたい街のエキスパートを見つけて、話すだけ。準備も移動もいりません。
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Step no="01" icon={<Search className="h-[22px] w-[22px]" aria-hidden />} title="エキスパートを探す">
              都市と相談したいテーマで検索。プロフィールと相談メニュー、レビューを見て、自分に合う人を選びます。
            </Step>
            <Step no="02" icon={<MessageCircle className="h-[22px] w-[22px]" aria-hidden />} title="チャットで相談">
              気になることをまず気軽に質問。相談内容のすり合わせをしてから、日程を決められます。
            </Step>
            <Step no="03" icon={<Video className="h-[22px] w-[22px]" aria-hidden />} title="オンラインで話す" soon>
              30分または60分、ビデオ通話でじっくり。あなたの事情に合わせた「現地のリアル」が聞けます。
            </Step>
            <Step no="04" icon={<Star className="h-[22px] w-[22px]" aria-hidden />} title="レビューを残す">
              相談後にレビューを書くと、次の相談者の道しるべに。エキスパートの信頼の積み重ねにもなります。
            </Step>
          </div>
          <div className="mt-9 text-center">
            <Link
              href="/experts"
              className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-[30px] py-3.5 text-[15px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
            >
              エキスパートを探す
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <div className="mt-3.5 text-[12px] text-neutral-400">
              会員登録は無料。チャットでの事前相談から始められます。
            </div>
          </div>
        </div>
      </section>

      {/* ===== 居住認証 ===== */}
      <section className="border-b border-primary-200 bg-gradient-to-b from-primary-50 to-background px-6 py-14 sm:py-[72px]">
        <div className="mx-auto grid max-w-[1120px] items-center gap-11 lg:grid-cols-[1fr_.92fr] lg:gap-16">
          <div>
            <span className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-700">
              Trust
            </span>
            <h2 className="text-[clamp(23px,3vw,30px)] font-bold leading-snug">
              信頼の根幹は、居住認証。
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

      {/* ===== 記事（読みもの）の位置付け ===== */}
      <section className="border-b border-border px-6 py-14 sm:py-[72px]">
        <div className="mx-auto grid max-w-[1120px] items-center gap-10 lg:grid-cols-[.92fr_1fr] lg:gap-16">
          <div className="order-last lg:order-first">
            <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-900">
                <BookOpen className="h-[22px] w-[22px]" aria-hidden />
              </div>
              <p className="text-[14px] font-bold">読みものは、相談の前の予習に。</p>
              <p className="mt-2 text-[13px] leading-loose text-neutral-500">
                エキスパートが実体験をもとに書いた記事を、無料で読めます。「この人は本当に詳しい」を確かめてから相談すると、30分がもっと濃くなります。
              </p>
              <Link
                href="/articles"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary-700 hover:underline hover:underline-offset-4"
              >
                読みものを見る
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
          <div>
            <span className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-700">
              Articles
            </span>
            <h2 className="text-[clamp(23px,3vw,30px)] font-bold leading-snug">
              記事は、エキスパートの
              <br className="hidden sm:block" />
              「詳しさ」の証明。
            </h2>
            <p className="mt-3 max-w-[640px] text-[14.5px] leading-relaxed text-neutral-500">
              Locoreの記事は、エキスパートが現地での暮らしについて発信する読みものです。売り物ではなく、相談相手を選ぶための判断材料。記事のページからは、書いた本人にそのまま相談を申し込めます。
            </p>
          </div>
        </div>
      </section>

      {/* ===== エキスパート向け ===== */}
      <section className="border-b border-border bg-muted px-6 py-14 sm:py-[72px]">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto mb-10 max-w-[640px] text-center">
            <span className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-700">
              For experts
            </span>
            <h2 className="text-[clamp(23px,3vw,30px)] font-bold">
              あなたの海外経験を、誰かの30分に。
            </h2>
            <p className="mt-3 text-[14.5px] text-neutral-500">
              海外での暮らしの知識を、30分からのオンライン相談として提供できます。参加は無料です。
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Step no="01" icon={<UserPlus className="h-[22px] w-[22px]" aria-hidden />} title="エキスパート登録">
              無料の会員登録のあと、エキスパートとして参加を申請します。都市・在住年数などを入力するだけです。
            </Step>
            <Step no="02" icon={<ShieldCheck className="h-[22px] w-[22px]" aria-hidden />} title="居住認証を申請">
              滞在許可証などの書類で居住実態を認証。バッジが付くと、相談者からの信頼が大きく上がります。
            </Step>
            <Step no="03" icon={<ClipboardList className="h-[22px] w-[22px]" aria-hidden />} title="相談メニューを作成">
              30分・60分の相談メニュー（料金・得意テーマ）を登録。得意分野は移住でも子育てでも、あなた次第です。
            </Step>
            <Step no="04" icon={<MessageCircle className="h-[22px] w-[22px]" aria-hidden />} title="一覧に掲載・相談を受ける">
              エキスパート一覧に掲載され、相談リクエストがチャットに届きます。日程をすり合わせて相談を実施します。
            </Step>
          </div>
          <div className="mt-9 text-center">
            <Link
              href="/become-writer"
              className="inline-flex items-center gap-2 rounded-full border border-border-strong px-[26px] py-3 text-[14.5px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground"
            >
              エキスパートとして参加する
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="px-6 py-14 sm:py-[72px]">
        <div className="mx-auto max-w-[760px]">
          <div className="mb-8 text-center">
            <span className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-700">
              FAQ
            </span>
            <h2 className="text-[clamp(23px,3vw,30px)] font-bold">よくある質問</h2>
          </div>
          <div className="space-y-3">
            <FaqItem
              q="料金はいくらですか？"
              a="相談メニューごとにエキスパートが設定しています。目安は30分 ¥3,000〜。各エキスパートのページで、時間と料金を確認してから申し込めます。"
            />
            <FaqItem
              q="予約や決済はどうやるのですか？"
              a="予約・決済機能は現在準備中です。まずはLocore内のチャットで相談内容と日程をすり合わせてください。やり取りはすべてLocore内で完結し、個人連絡先の交換は相談成立後まで不要です。"
            />
            <FaqItem
              q="エキスパートは信頼できますか？"
              a="エキスパートは書類審査による居住認証を受けられます。「居住認証済み」バッジは、運営が滞在許可証などの書類で現地の居住実態を確認した人だけに表示されます。相談後のレビューも公開されるので、あわせて参考にしてください。"
            />
            <FaqItem
              q="無料でできることはありますか？"
              a="会員登録は無料で、エキスパート探し・記事（読みもの）・チャットでの事前のすり合わせまでは無料の範囲です。有料になるのは、相談メニューを申し込んでからです。"
            />
            <FaqItem
              q="どんなことを相談できますか？"
              a="移住・留学・駐在準備の段取り、住むエリア選び、生活の手続き、子育てや学校、仕事や起業、こだわりの旅行プランまで。エキスパートごとの「こんな相談に乗れます」を見て選んでください。"
            />
            <FaqItem
              q="海外からでも使えますか？"
              a="はい。ブラウザ・スマホからどこからでも利用できます。相談はオンライン（ビデオ通話・チャット）で完結するので、時差だけすり合わせれば大丈夫です。"
            />
            <FaqItem
              q="プライバシー・規約について"
              a={
                <>
                  <Link
                    href="/legal/privacy"
                    className="font-bold text-primary-700 underline-offset-4 hover:underline"
                  >
                    プライバシーポリシー
                  </Link>
                  {' / '}
                  <Link
                    href="/legal/terms"
                    className="font-bold text-primary-700 underline-offset-4 hover:underline"
                  >
                    利用規約
                  </Link>
                  をご覧ください。
                </>
              }
            />
          </div>
        </div>
      </section>

      {/* ===== final CTA ===== */}
      <section className="px-6 pb-24">
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
          </div>
        </div>
      </section>
    </main>
  );
}

/** トップの HowStep と同型のステップカード（4列グリッド用） */
function Step({
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
    <div className="rounded-2xl border border-border bg-background px-[22px] pb-[22px] pt-6">
      <span className="mb-4 inline-flex items-center gap-2.5 text-[13px] font-bold tabular-nums text-primary-700">
        {no}
        <span className="h-px w-7 bg-primary-200" aria-hidden />
      </span>
      <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-900">
        {icon}
      </span>
      <h3 className="text-[15.5px] font-bold">{title}</h3>
      <p className="mt-2 text-[13px] leading-loose text-neutral-500">{children}</p>
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

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-border-strong">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-[14px] font-bold">
        <span>{q}</span>
        <span
          className="text-[18px] text-neutral-400 transition-transform group-open:rotate-45"
          aria-hidden
        >
          +
        </span>
      </summary>
      <div className="mt-3 text-[13px] leading-loose text-neutral-500">{a}</div>
    </details>
  );
}
