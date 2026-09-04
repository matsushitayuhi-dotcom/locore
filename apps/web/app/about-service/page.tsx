import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Info,
  Link2,
  MessageCircle,
  Mic,
  MonitorSmartphone,
  PhoneOff,
  Search,
  ShieldCheck,
  UserPlus,
  Video,
} from 'lucide-react';
import { AboutHowTabs } from './AboutHowTabs';

/**
 * `/about-service` — 「使い方」ページ（GrowthMentor 構成）。
 * mockups/v2/about-service-v2.html の 11 セクションを忠実に実装:
 *   [1] hero + アバター無限カルーセル / [2][3] 使い方タブ（相談する｜相談にのる）/
 *   [4] ユースケース / [5] 居住認証（ダーク帯・縦タイムライン）/ [6] 料金 /
 *   [7] オンライン完結 / [8] タイムゾーン（週グリッド縮小版）/ [9] 相談例 /
 *   [10] FAQ / [11] final CTA
 * ヘッダー/フッターはサイト共通（SiteHeader / SiteFooter）を使うため持たない。
 * cookie を読まない純粋な server component（タブとカルーセルのみ client / CSS）。
 */

export const metadata = {
  title: '使い方',
  description:
    '現地に住む日本人が、あなたの「これから」に伴走する。移住・留学・駐在準備・旅行の「あなたの場合はどうか」を、居住認証済みの海外在住日本人に30分からオンラインで相談できます。使い方・居住認証・料金の説明ページです。',
};

/* ===== 小物 ===== */

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-700">
      {children}
    </span>
  );
}

function SectionH({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-2 text-[clamp(23px,3vw,30px)] font-bold leading-[1.45]">
      {children}
    </h2>
  );
}

function VerifiedChip({ small = false }: { small?: boolean }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-primary-300 bg-primary-100 font-bold text-primary-900 ' +
        (small ? 'px-[7px] py-px text-[9px]' : 'px-[9px] py-0.5 text-[10px]')
      }
    >
      <ShieldCheck className={small ? 'h-[9px] w-[9px]' : 'h-[10px] w-[10px]'} aria-hidden />
      {small ? '認証済み' : '居住認証済み'}
    </span>
  );
}

/* ===== [1] hero: アバターカルーセル ===== */

type Person = { initial: string; name: string; city: string };

const CAROUSEL_COL1: Person[] = [
  { initial: '彩', name: '佐々木 彩', city: '🇫🇷 パリ在住 8年' },
  { initial: '大', name: '中村 大輔', city: '🇹🇭 バンコク在住 10年' },
  { initial: '絵', name: '藤田 絵里', city: '🇺🇸 ニューヨーク在住 7年' },
  { initial: '亮', name: '石井 亮', city: '🇳🇱 アムステルダム在住 9年' },
];
const CAROUSEL_COL2: Person[] = [
  { initial: '健', name: '高橋 健太郎', city: '🇬🇧 ロンドン在住 5年' },
  { initial: '実', name: '山本 実咲', city: '🇩🇪 ベルリン在住 6年' },
  { initial: '遥', name: '小川 遥', city: '🇦🇺 メルボルン在住 4年' },
  { initial: '千', name: '森本 千夏', city: '🇨🇦 バンクーバー在住 6年' },
];

function PersonCard({ p }: { p: Person }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-[15px] shadow-xs">
      <div className="flex items-center gap-[11px]">
        <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-primary-100 text-[15px] font-bold text-primary-900">
          {p.initial}
        </span>
        <div>
          <div className="text-[13.5px] font-bold leading-[1.3]">{p.name}</div>
          <div className="mt-0.5 text-[11px] text-neutral-500">{p.city}</div>
        </div>
      </div>
      <div className="mt-[9px]">
        <VerifiedChip />
      </div>
    </div>
  );
}

function CarouselCol({ people, rev = false }: { people: Person[]; rev?: boolean }) {
  return (
    <div className="flex w-[min(230px,46%)] flex-col gap-3.5">
      <div
        className={'about-carousel-track flex flex-col gap-3.5' + (rev ? ' rev' : '')}
      >
        {/* ループ用に 2 周分描画（-50% translate で継ぎ目なし） */}
        {[...people, ...people].map((p, i) => (
          <PersonCard key={`${p.name}-${i}`} p={p} />
        ))}
      </div>
    </div>
  );
}

/* ===== [2][3] 使い方ステップ ===== */

function StepCard({
  no,
  icon,
  title,
  vis,
  free,
  compact = false,
  children,
}: {
  no: string;
  icon: React.ReactNode;
  title: string;
  vis: React.ReactNode;
  free?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      <div
        className={
          'relative grid place-items-center overflow-hidden border-b border-border bg-muted ' +
          (compact ? 'h-[132px]' : 'h-[168px]')
        }
      >
        {vis}
      </div>
      <div className="px-[22px] pb-[22px] pt-5">
        <span className="inline-flex items-center gap-[9px] text-[13px] font-bold tabular-nums text-primary-700 after:h-px after:w-7 after:bg-primary-200 after:content-['']">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-primary-50 text-primary-900">
            {icon}
          </span>
          {no}
        </span>
        <h3 className="mt-2.5 text-[16px] font-bold">{title}</h3>
        <p className="mt-[7px] text-[13px] leading-[1.85] text-neutral-500">
          {children}
        </p>
        {free ? (
          <span className="mt-2.5 inline-flex w-max items-center gap-1.5 rounded-full border border-primary-300 bg-primary-100 px-3 py-[3px] text-[11.5px] font-bold text-primary-900">
            {free}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** mini UI: 検索ヒットカード（hero の trust デモでも使用） */
function MiniHit({ city = false }: { city?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary-200 bg-card px-[13px] py-2.5 shadow-sm">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-100 text-[12px] font-bold text-primary-900">
        彩
      </span>
      <div>
        <div className="text-[12px] font-bold leading-[1.3]">佐々木 彩</div>
        <div className="text-[10px] text-neutral-500">
          {city ? '🇫🇷 ' : ''}パリ在住 8年 ・ ¥4,000/30分
        </div>
      </div>
      <span className="ml-auto">
        <VerifiedChip small />
      </span>
    </div>
  );
}

function UserFlowPanel() {
  return (
    <>
      <div className="grid gap-5 lg:grid-cols-3">
        <StepCard
          no="01"
          icon={<Search className="h-[17px] w-[17px]" aria-hidden />}
          title="探す"
          vis={
            <div className="flex w-[82%] flex-col gap-[9px]">
              <div className="flex gap-1.5">
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-border-strong bg-card px-3 py-[7px] text-[11px] font-bold">
                  🇫🇷 フランス
                </span>
                <span className="flex flex-1 items-center gap-[7px] rounded-full border border-border-strong bg-card px-[13px] py-[7px] text-[11px] text-neutral-500">
                  <Search className="h-3 w-3 shrink-0" aria-hidden />
                  移住・エリア選び…
                </span>
              </div>
              <MiniHit />
            </div>
          }
        >
          国とテーマで絞り込んで、プロフィール・相談メニュー・レビューを見比べます。全員に居住認証バッジ付き。
        </StepCard>

        <StepCard
          no="02"
          icon={<MessageCircle className="h-[17px] w-[17px]" aria-hidden />}
          title="チャットで相談"
          free="ここまで完全無料 — 合わなければやめてOK"
          vis={
            <div className="flex w-[82%] flex-col gap-2 text-[11px] leading-[1.7]">
              <span className="self-center rounded-full border border-primary-300 bg-primary-100 px-2.5 py-0.5 text-[9.5px] font-bold text-primary-900">
                事前チャットは無料
              </span>
              <div className="max-w-[86%] self-end rounded-[13px] rounded-br-[5px] bg-neutral-900 px-3 py-2 text-white shadow-xs">
                来春パリ移住予定です。ビザとエリア選び、30分で相談できますか？
              </div>
              <div className="max-w-[86%] self-start rounded-[13px] rounded-bl-[5px] border border-border bg-card px-3 py-2 shadow-xs">
                できますよ。事前に現在の状況を教えてもらえると、当日が濃くなります。
              </div>
            </div>
          }
        >
          申し込む前に、気になることを本人に直接質問。相談内容と日程をすり合わせてから決められます。
        </StepCard>

        <StepCard
          no="03"
          icon={<Video className="h-[17px] w-[17px]" aria-hidden />}
          title="オンラインで話す"
          vis={
            <>
              <span className="absolute right-3.5 top-3 z-[2] rounded-full bg-black/45 px-[9px] py-0.5 text-[10px] tabular-nums text-white">
                29:41
              </span>
              <div className="w-[78%] rounded-[14px] bg-neutral-950 p-3 shadow-md">
                <div className="flex gap-2">
                  <div className="grid aspect-[4/3.4] flex-1 place-items-center rounded-[9px] bg-gradient-to-br from-neutral-700 to-neutral-900">
                    <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-primary-100 text-[13px] font-bold text-primary-900">
                      彩
                    </span>
                  </div>
                  <div className="grid aspect-[4/3.4] flex-1 place-items-center rounded-[9px] bg-gradient-to-br from-neutral-700 to-neutral-900">
                    <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-neutral-700 text-[13px] font-bold text-white">
                      あ
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-center gap-2">
                  <i className="grid h-[26px] w-[26px] place-items-center rounded-full bg-white/15 not-italic">
                    <Mic className="h-3 w-3 text-white" aria-hidden />
                  </i>
                  <i className="grid h-[26px] w-[26px] place-items-center rounded-full bg-white/15 not-italic">
                    <Video className="h-3 w-3 text-white" aria-hidden />
                  </i>
                  <i className="grid h-[26px] w-[26px] place-items-center rounded-full bg-danger-500 not-italic">
                    <PhoneOff className="h-3 w-3 text-white" aria-hidden />
                  </i>
                </div>
              </div>
            </>
          }
        >
          30分または60分、ビデオ通話でじっくり。「あなたの場合はどうか」まで踏み込んで聞けます。終わったらレビューで次の人の道しるべに。
        </StepCard>
      </div>
      <div className="mt-[34px] text-center">
        <Link
          href="/experts"
          className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-[30px] py-[13px] text-[15px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
        >
          エキスパートを探す
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <div className="mt-3 text-[12px] text-neutral-400">
          会員登録は無料。チャットでの事前相談から始められます。
        </div>
      </div>
    </>
  );
}

function DocLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-border bg-card px-[11px] py-2 text-[10.5px] text-neutral-700">
      <span className="shrink-0 text-primary-700">{icon}</span>
      {children}
    </div>
  );
}

function ExpertFlowPanel() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StepCard
          compact
          no="01"
          icon={<UserPlus className="h-[17px] w-[17px]" aria-hidden />}
          title="登録する"
          vis={
            <div className="flex w-[76%] flex-col gap-2">
              <DocLine icon={<UserPlus className="h-3 w-3" aria-hidden />}>
                プロフィールを入力
              </DocLine>
              <DocLine icon={<Globe className="h-3 w-3" aria-hidden />}>
                都市・在住年数を申告
              </DocLine>
            </div>
          }
        >
          無料の会員登録のあと、エキスパート参加を申請。都市・在住年数・得意なことを入力します。
        </StepCard>

        <StepCard
          compact
          no="02"
          icon={<ShieldCheck className="h-[17px] w-[17px]" aria-hidden />}
          title="居住認証を受ける"
          vis={
            <div className="flex w-[76%] flex-col gap-2">
              <DocLine icon={<FileText className="h-3 w-3" aria-hidden />}>
                滞在許可証 など
              </DocLine>
              <DocLine icon={<Check className="h-3 w-3" strokeWidth={3} aria-hidden />}>
                運営が書類を照合
              </DocLine>
            </div>
          }
        >
          滞在許可証などの書類で、居住実態を運営が審査。通過するとバッジが付き、一覧に掲載されます。
        </StepCard>

        <StepCard
          compact
          no="03"
          icon={<FileText className="h-[17px] w-[17px]" aria-hidden />}
          title="相談メニューを作る"
          vis={
            <div className="w-[78%] rounded-xl border border-border bg-card px-3.5 py-3 shadow-xs">
              <div className="flex items-baseline gap-1.5 text-[12px] font-bold">
                30分相談
                <i className="ml-auto text-[14px] font-bold not-italic tabular-nums">
                  ¥4,000
                </i>
              </div>
              <div className="mt-2 h-1.5 rounded bg-muted" />
              <div className="mt-2 h-1.5 w-[64%] rounded bg-muted" />
            </div>
          }
        >
          30分・60分の料金と得意テーマを設定。移住でも子育てでも受験でも、あなたの経験がメニューになります。
        </StepCard>

        <StepCard
          compact
          no="04"
          icon={<CalendarCheck className="h-[17px] w-[17px]" aria-hidden />}
          title="予約が入る"
          vis={
            <div className="w-[80%] rounded-xl border border-warning-500/40 bg-card px-[13px] py-[11px] shadow-sm">
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-neutral-700">
                  高
                </span>
                高橋さん
                <span className="ml-auto rounded-full border border-warning-500/40 bg-warning-50 px-2 py-0.5 text-[9px] font-bold text-warning-700">
                  リクエスト
                </span>
              </div>
              <div className="mt-[7px] text-[10.5px] tabular-nums text-neutral-500">
                9/18（金）13:00 現地時間 ・ 30分相談
              </div>
              <div className="mt-2 flex gap-1.5">
                <span className="rounded-full bg-primary-500 px-3 py-[3px] text-[9.5px] font-bold text-neutral-950">
                  承諾する
                </span>
                <span className="px-3 py-[3px] text-[9.5px] font-bold text-neutral-500">
                  辞退
                </span>
              </div>
            </div>
          }
        >
          空き時間を登録しておくと、予約リクエストが届きます。時間はあなたの現地時間で管理できます。
        </StepCard>
      </div>
      <div className="mt-[34px] text-center">
        <Link
          href="/become-writer"
          className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-[30px] py-[13px] text-[15px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
        >
          エキスパートとして参加する
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <div className="mt-3 text-[12px] text-neutral-400">
          参加は無料。あなたの海外経験が、誰かの30分になります。
        </div>
      </div>
    </>
  );
}

/* ===== [4] ユースケース ===== */

const USE_CASES: Array<{ q: string; label: string; topic: string }> = [
  { q: '子連れでの移住、何から始めればいい？', label: '移住', topic: 'immigration' },
  { q: '現地校とインター、うちの子はどっち？', label: '子育て・教育', topic: 'childcare' },
  { q: 'ワーホリの家探し、保証人がいない', label: '住まい', topic: 'housing' },
  { q: '駐在の帯同、会社任せで大丈夫？', label: '駐在準備', topic: 'expat_prep' },
  { q: '現地就職の実際。求人の探し方から', label: '就職・転職', topic: 'work' },
  { q: 'フリーランス登録と税金の段取りは？', label: '仕事・起業', topic: 'work' },
  { q: '口座・保険・携帯、最初の1か月の順番', label: '生活手続き', topic: 'procedures' },
  { q: '留学前に、学校のリアルを聞きたい', label: '留学', topic: 'study_abroad' },
  { q: '観光じゃない旅がしたい。住民の目線で', label: '旅行プラン', topic: 'travel' },
];

/* ===== [5] 居住認証: ダーク帯の縦タイムライン ===== */

function TrustStepDark({
  n,
  title,
  gate,
  last = false,
  children,
}: {
  n: number;
  title: string;
  gate?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={'relative flex gap-[18px]' + (last ? '' : ' pb-[26px]')}>
      {!last ? (
        <span
          className="absolute bottom-0.5 left-[17px] top-10 w-px bg-primary-500/35"
          aria-hidden
        />
      ) : null}
      <span className="z-[1] grid h-[35px] w-[35px] shrink-0 place-items-center rounded-full border border-primary-500/50 bg-neutral-950 text-[14px] font-bold tabular-nums text-primary-500">
        {n}
      </span>
      <div>
        <b className="block text-[15.5px] font-bold">{title}</b>
        <p className="mt-1 text-[13.5px] leading-[1.85] text-white/65">
          {children}
          {gate ? (
            <span className="mt-2 inline-flex rounded-full border border-primary-500/40 px-[11px] py-0.5 text-[11px] font-bold text-primary-500">
              {gate}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

/* ===== [6] 料金 ===== */

function PriceLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 leading-[1.7]">
      <Check
        className="mt-1 h-3.5 w-3.5 shrink-0 text-primary-700"
        strokeWidth={3}
        aria-hidden
      />
      {children}
    </li>
  );
}

/* ===== [8] タイムゾーン: 週グリッド縮小版 ===== */

function TzSlot({ on = false, children }: { on?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={
        'rounded-lg border py-[7px] text-center text-[11.5px] font-semibold tabular-nums ' +
        (on
          ? 'border-primary-500 bg-primary-500 font-bold text-neutral-950'
          : 'border-border-strong text-neutral-700')
      }
    >
      {children}
    </span>
  );
}

/* ===== [9] 相談例 ===== */

function OutcomeCard({
  theme,
  title,
  before,
  after,
}: {
  theme: string;
  title: string;
  before: string;
  after: string;
}) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-[22px] shadow-xs">
      <span className="absolute -top-2.5 left-[18px] rounded-full bg-neutral-900 px-[11px] py-0.5 text-[10px] font-semibold tracking-[0.1em] text-white">
        相談例
      </span>
      <span className="inline-flex rounded-full bg-muted px-3 py-[3px] text-[11px] font-bold text-neutral-700">
        {theme}
      </span>
      <h3 className="mt-2.5 text-[15.5px] font-bold leading-[1.6]">{title}</h3>
      <div className="mt-3.5 flex flex-col gap-[9px] text-[12.5px] leading-[1.75]">
        <div className="flex items-start gap-[9px]">
          <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-md bg-muted px-[7px] py-0.5 text-[9.5px] font-bold text-neutral-500">
            相談前
          </span>
          <span className="text-neutral-500">{before}</span>
        </div>
        <div className="flex items-start gap-[9px]">
          <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-md bg-primary-100 px-[7px] py-0.5 text-[9.5px] font-bold text-primary-900">
            30分後
          </span>
          <span className="font-medium text-neutral-700">{after}</span>
        </div>
      </div>
    </div>
  );
}

/* ===== [10] FAQ ===== */

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-[14px] border border-border bg-card px-5 py-[17px] transition-colors hover:border-border-strong open:border-primary-300">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-bold [&::-webkit-details-marker]:hidden">
        {q}
        <span
          className="shrink-0 text-[18px] leading-none text-neutral-400 transition-transform group-open:rotate-45 group-open:text-primary-700"
          aria-hidden
        >
          +
        </span>
      </summary>
      <div className="mt-[11px] text-[13px] leading-[1.95] text-neutral-500">
        {children}
      </div>
    </details>
  );
}

const B = ({ children }: { children: React.ReactNode }) => (
  <b className="font-bold text-neutral-700">{children}</b>
);

/* ============================== page ============================== */

export default function AboutServicePage() {
  return (
    <main className="overflow-hidden bg-background text-foreground">
      {/* ===== [1] hero ===== */}
      <section className="px-6 pb-[68px] pt-[60px]">
        <div className="mx-auto grid max-w-[1120px] items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[12.5px] font-bold text-primary-900 shadow-xs">
              <span className="h-[7px] w-[7px] rounded-full bg-primary-500" aria-hidden />
              居住認証つき・海外在住日本人への相談サービス
            </span>
            <h1 className="mt-5 text-[clamp(29px,4.4vw,44px)] font-black leading-[1.38] tracking-[-0.02em]">
              現地に住む日本人が、
              <br />
              あなたの<em className="not-italic text-primary-700">「これから」</em>
              に伴走する。
            </h1>
            <p className="mt-[18px] max-w-[33em] text-[15.5px] leading-[1.95] text-neutral-700">
              移住、留学、駐在準備、こだわりの旅行——。検索では答えが出ない「あなたの場合はどうか」を、
              <b className="font-bold">いまその街で暮らす日本人</b>
              に、30分からオンラインで相談できます。
            </p>
            <div className="mt-[26px] flex flex-wrap items-center gap-3.5">
              <Link
                href="/experts"
                className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-[30px] py-[13px] text-[15px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
              >
                エキスパートを探す
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/become-writer"
                className="inline-flex items-center rounded-full border border-border-strong px-6 py-[11px] text-[14px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground"
              >
                エキスパートとして参加
              </Link>
            </div>
            <div className="mt-[18px] flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-neutral-500">
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

          {/* アバター無限カルーセル（イニシャル CSS アバター・写真なし） */}
          <div
            className="relative flex h-[340px] justify-center gap-4 lg:h-[440px] [mask-image:linear-gradient(transparent,black_14%,black_86%,transparent)]"
            aria-hidden
          >
            <CarouselCol people={CAROUSEL_COL1} />
            <CarouselCol people={CAROUSEL_COL2} rev />
          </div>
        </div>
      </section>

      {/* ===== [2][3] 使い方（相談する｜相談にのる タブ） ===== */}
      <section className="border-y border-border bg-muted px-6 pb-[72px] pt-16">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto max-w-[640px] text-center">
            <Kicker>How it works</Kicker>
            <SectionH>使い方は、シンプル。</SectionH>
            <p className="mt-3 text-[14.5px] leading-[1.9] text-neutral-500">
              相談したい人も、相談に乗る人も。それぞれの流れはこれだけです。
            </p>
          </div>
          <AboutHowTabs userPanel={<UserFlowPanel />} expertPanel={<ExpertFlowPanel />} />
        </div>
      </section>

      {/* ===== [4] ユースケース ===== */}
      <section className="px-6 pb-[72px] pt-[66px]">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto mb-[34px] max-w-[640px] text-center">
            <Kicker>Use cases</Kicker>
            <SectionH>こんな「調べても出てこないこと」を。</SectionH>
            <p className="mt-3 text-[14.5px] leading-[1.9] text-neutral-500">
              悩みからテーマを選んで、そのまま合うエキスパートを探せます。
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u) => (
              <Link
                key={u.q}
                href={`/experts?topic=${u.topic}`}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-[22px] py-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
              >
                <span className="text-[14.5px] font-bold leading-[1.65]">
                  <span className="text-primary-700">「</span>
                  {u.q}
                  <span className="text-primary-700">」</span>
                </span>
                <span className="mt-auto flex items-center gap-2">
                  <span className="rounded-full bg-muted px-[13px] py-1 text-[11.5px] font-bold text-neutral-700">
                    {u.label}
                  </span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-primary-700" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== [5] 居住認証（最重要・ダーク帯 + 縦タイムライン） ===== */}
      <section className="about-trust-bg relative overflow-hidden px-6 pb-[84px] pt-[76px] text-white">
        <div className="mx-auto grid max-w-[1120px] items-center gap-14 lg:grid-cols-[1fr_.92fr]">
          <div>
            <span className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-500">
              Trust
            </span>
            <h2 className="mt-2 text-[clamp(25px,3.4vw,36px)] font-black leading-[1.4] tracking-[-0.02em]">
              誰でもは、載れません。
              <br />
              <em className="not-italic text-primary-500">居住認証</em>
              という関門があります。
            </h2>
            <p className="mt-3 text-[14.5px] leading-[1.9] text-white/70">
              SNSで見つけた「現地在住」は、本当にいまその街に住んでいるでしょうか。Locoreに掲載される全エキスパートは、現地の居住実態を書類で確認済み。すべてのカードとプロフィールにバッジが表示されます。
            </p>
            <div className="mt-[30px] flex flex-col">
              <TrustStepDark n={1} title="居住を証明する書類の提出">
                現地の滞在許可証・公共料金の請求書・賃貸契約書など、「いま住んでいる」ことを示す書類を提出してもらいます。
              </TrustStepDark>
              <TrustStepDark
                n={2}
                title="運営による審査"
                gate="基準を満たさなければ、掲載されません"
              >
                書類と申告内容（都市・在住年数）を運営が照合します。
              </TrustStepDark>
              <TrustStepDark n={3} title="認証バッジの付与" last>
                審査を通過した人だけに「居住認証済み」バッジ。相談後の公開レビューと合わせて、信頼の目印になります。
              </TrustStepDark>
            </div>
          </div>
          <div className="rounded-3xl bg-card p-8 text-center text-foreground shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]">
            <div className="mx-auto mb-[18px] grid h-[84px] w-[84px] place-items-center rounded-full border border-primary-200 bg-primary-50 text-primary-700">
              <ShieldCheck className="h-10 w-10" strokeWidth={1.8} aria-hidden />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-100 px-[18px] py-1.5 text-[13.5px] font-bold text-primary-900">
              <ShieldCheck className="h-[15px] w-[15px]" aria-hidden />
              居住認証済み
            </span>
            <p className="mt-3.5 text-[13px] leading-[1.9] text-neutral-500">
              このバッジは、運営が書類で居住実態を確認したエキスパートだけに表示されます。「行ったことがある」ではなく、
              <b className="font-bold text-neutral-700">「いま住んでいる」</b>
              人の言葉です。
            </p>
            <div className="mt-5 border-t border-dashed border-border-strong pt-4 text-left">
              <div className="mb-[9px] text-[10px] tracking-[0.1em] text-neutral-500">
                ▼ すべてのカードにバッジが付きます
              </div>
              <MiniHit city />
            </div>
          </div>
        </div>
      </section>

      {/* ===== [6] 料金 ===== */}
      <section className="border-b border-border bg-muted px-6 pb-[72px] pt-16">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto mb-[30px] max-w-[640px] text-center">
            <Kicker>Pricing</Kicker>
            <SectionH>料金は、はじめから全部見える。</SectionH>
            <p className="mt-3 text-[14.5px] leading-[1.9] text-neutral-500">
              エキスパートごとにメニューと料金が明示されています。隠れた費用はありません。
            </p>
          </div>
          <div className="mx-auto mb-[26px] flex max-w-[720px] items-start gap-3.5 rounded-2xl border border-primary-100 bg-primary-50 px-[22px] py-4">
            <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-primary-500 text-[15px] font-bold tabular-nums text-neutral-950">
              ¥0
            </span>
            <div>
              <b className="text-[15px]">予約前のチャット相談は、無料。</b>
              <p className="mt-0.5 text-[12.5px] leading-[1.7] text-neutral-500">
                エキスパート探しも、読みものも、申し込む前の質問も無料。有料になるのは相談メニューを申し込んでからです。
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-[960px] gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col rounded-2xl border border-primary-200 bg-card p-6 shadow-md">
              <div className="flex items-center gap-2 text-[14.5px] font-bold">
                30分相談
                <span className="ml-auto rounded-full border border-primary-100 bg-primary-50 px-2.5 py-[3px] text-[10.5px] font-bold text-primary-900">
                  はじめての方に
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <b className="text-[29px] font-bold tabular-nums">¥3,000</b>
                <span className="text-[12px] text-neutral-500">〜 / 30分・税込</span>
              </div>
              <ul className="mt-3.5 flex flex-col gap-2 text-[12.5px] text-neutral-700">
                <PriceLi>ピンポイントの疑問に。テーマ1〜2個をじっくり</PriceLi>
                <PriceLi>料金はエキスパートごとに設定・事前に明示</PriceLi>
              </ul>
              <div className="mt-3.5 text-[10.5px] text-neutral-400">
                料金はエキスパート設定の目安です
              </div>
            </div>
            <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center gap-2 text-[14.5px] font-bold">60分相談</div>
              <div className="mt-3 flex items-baseline gap-1">
                <b className="text-[29px] font-bold tabular-nums">¥6,000</b>
                <span className="text-[12px] text-neutral-500">〜 / 60分・税込</span>
              </div>
              <ul className="mt-3.5 flex flex-col gap-2 text-[12.5px] text-neutral-700">
                <PriceLi>移住・駐在の全体設計など、腰を据えた相談に</PriceLi>
                <PriceLi>「渡航までのやること」を時系列で一緒に整理</PriceLi>
              </ul>
              <div className="mt-3.5 text-[10.5px] text-neutral-400">
                料金はエキスパート設定の目安です
              </div>
            </div>
            <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center gap-2 text-[14.5px] font-bold">
                継続プラン（月額）
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <b className="text-[29px] font-bold">月額</b>
                <span className="text-[12px] text-neutral-500">エキスパートごとに設定</span>
              </div>
              <ul className="mt-3.5 flex flex-col gap-2 text-[12.5px] text-neutral-700">
                <PriceLi>渡航準備の数か月間、同じ人に伴走してほしいときに</PriceLi>
                <PriceLi>定期相談＋チャットでの継続フォロー</PriceLi>
              </ul>
              <div className="mt-3.5 text-[10.5px] text-neutral-400">
                対応しているエキスパートのみ
              </div>
            </div>
          </div>
          <div className="mx-auto mt-6 flex max-w-[720px] items-start gap-[9px] rounded-xl bg-info-50 px-4 py-3 text-[12px] leading-[1.8] text-info-500">
            <Info className="mt-[3px] h-3.5 w-3.5 shrink-0" aria-hidden />
            決済機能は現在準備中です。まずは無料のチャットと予約リクエストからお試しください。
          </div>
        </div>
      </section>

      {/* ===== [7] オンライン完結 ===== */}
      <section className="px-6 py-[54px]">
        <div className="mx-auto grid max-w-[960px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <MonitorSmartphone className="h-5 w-5" aria-hidden />,
              t: '特別なアプリは不要',
              p: 'ブラウザとスマホがあれば大丈夫。インストールも設定もいりません。',
            },
            {
              icon: <Link2 className="h-5 w-5" aria-hidden />,
              t: '確定後に届く参加リンクから',
              p: '相談が確定すると、参加リンクがマイ相談ページとメールに届きます。当日はワンクリック。',
            },
            {
              icon: <Video className="h-5 w-5" aria-hidden />,
              t: 'Zoom / Google Meet でOK',
              p: '使い慣れたツールのままで構いません。エキスパートの相談室リンクに入るだけです。',
            },
          ].map((c) => (
            <div
              key={c.t}
              className="flex items-start gap-3.5 rounded-2xl border border-border px-5 py-[18px] shadow-xs"
            >
              <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-900">
                {c.icon}
              </span>
              <div>
                <b className="block text-[14px]">{c.t}</b>
                <p className="mt-[3px] text-[12px] leading-[1.75] text-neutral-500">{c.p}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== [8] タイムゾーン ===== */}
      <section className="border-t border-border px-6 pb-[72px] pt-16">
        <div className="mx-auto grid max-w-[1120px] items-center gap-[52px] lg:grid-cols-[1fr_.95fr]">
          <div>
            <Kicker>Timezone</Kicker>
            <SectionH>時差の計算は、しなくていい。</SectionH>
            <p className="mt-3 text-[14.5px] leading-[1.9] text-neutral-500">
              相手は海外在住。でも、あなたが時差を計算する必要はありません。
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-start gap-[11px] text-[14px] text-neutral-700">
                <Clock className="mt-[3px] h-[18px] w-[18px] shrink-0 text-primary-700" aria-hidden />
                <span>
                  空き枠も確定日時も、<B>すべて日本時間で表示</B>
                  。エキスパートが地球の裏側でも迷いません。
                </span>
              </div>
              <div className="flex items-start gap-[11px] text-[14px] text-neutral-700">
                <Globe className="mt-[3px] h-[18px] w-[18px] shrink-0 text-primary-700" aria-hidden />
                <span>
                  エキスパート側には現地時間で表示。<B>換算はLocoreが自動で行います</B>。
                </span>
              </div>
              <div className="flex items-start gap-[11px] text-[14px] text-neutral-700">
                <CalendarCheck className="mt-[3px] h-[18px] w-[18px] shrink-0 text-primary-700" aria-hidden />
                <span>
                  週カレンダーから空き枠を選ぶだけ。<B>前日にはリマインドも届きます</B>。
                </span>
              </div>
            </div>
          </div>
          {/* 週グリッド縮小版（静的ビジュアル） */}
          <div className="rounded-2xl border border-border bg-card px-[22px] py-5 shadow-sm" aria-hidden>
            <div className="flex items-center gap-[9px]">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-border-strong bg-card text-neutral-700">
                <ChevronLeft className="h-3 w-3" />
              </span>
              <span className="text-[12.5px] font-bold tabular-nums">9月14日〜9月20日</span>
              <span className="grid h-7 w-7 place-items-center rounded-full border border-border-strong bg-card text-neutral-700">
                <ChevronRight className="h-3 w-3" />
              </span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-[11px] py-[3px] text-[10.5px] font-bold text-primary-900">
                <Clock className="h-[11px] w-[11px] text-primary-700" />
                日本時間
              </span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              <div className="flex flex-col gap-[5px]">
                <div className="border-b border-border pb-1.5 text-center leading-[1.3]">
                  <span className="block text-[10px] text-neutral-500">水</span>
                  <span className="block text-[13px] font-bold tabular-nums">16</span>
                </div>
                <TzSlot>20:00</TzSlot>
                <TzSlot>20:30</TzSlot>
                <TzSlot>21:00</TzSlot>
              </div>
              <div className="flex flex-col gap-[5px]">
                <div className="border-b border-border pb-1.5 text-center leading-[1.3] opacity-40">
                  <span className="block text-[10px] text-neutral-500">木</span>
                  <span className="block text-[13px] font-bold tabular-nums">17</span>
                </div>
                <span className="py-[7px] text-center text-[12px] text-border-strong">—</span>
              </div>
              <div className="flex flex-col gap-[5px]">
                <div className="border-b border-border pb-1.5 text-center leading-[1.3]">
                  <span className="block text-[10px] text-neutral-500">金</span>
                  <span className="block text-[13px] font-bold tabular-nums">18</span>
                </div>
                <TzSlot on>20:00</TzSlot>
                <TzSlot>20:30</TzSlot>
                <TzSlot>21:00</TzSlot>
              </div>
              <div className="flex flex-col gap-[5px]">
                <div className="border-b border-border pb-1.5 text-center leading-[1.3]">
                  <span className="block text-[10px] text-neutral-500">土</span>
                  <span className="block text-[13px] font-bold tabular-nums">19</span>
                </div>
                <TzSlot>16:00</TzSlot>
                <TzSlot>16:30</TzSlot>
                <TzSlot>17:00</TzSlot>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== [9] 相談例 ===== */}
      <section className="border-y border-border bg-muted px-6 pb-[72px] pt-16">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto mb-8 max-w-[680px] text-center">
            <Kicker>In 30 minutes</Kicker>
            <SectionH>30分で、ここまで進む。</SectionH>
            <p className="mt-3 text-[14.5px] leading-[1.9] text-neutral-500">
              実際にできる相談の「例」です。あなたの事情に合わせて、もっと具体的に聞けます。
            </p>
          </div>
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            <OutcomeCard
              theme="移住"
              title="パリ移住のビザ、どれで行く？"
              before="ビザの種類が多すぎて、1か月調べても決められない。"
              after="自分の職歴・予算なら現実的な選択肢は2つ。必要書類と申請の順番までメモが残る。"
            />
            <OutcomeCard
              theme="子育て・教育"
              title="現地校の見学、何を見ればいい？"
              before="学校のWebサイトを眺めても、違いが分からない。"
              after="子連れ移住した先輩から「見学で必ず確認する5点」と学区の実情を聞き、候補が3校に絞れる。"
            />
            <OutcomeCard
              theme="住まい"
              title="保証人なしの家探し、詰まない段取り"
              before="内見の申し込みが全部スルーされる。理由も分からない。"
              after="書類（ドシエ）の作り方と、保証人サービスの現実的な使い方が分かり、次の一手が決まる。"
            />
          </div>
        </div>
      </section>

      {/* ===== [10] FAQ ===== */}
      <section className="px-6 pb-[72px] pt-16">
        <div className="mx-auto max-w-[760px]">
          <div className="mb-7 text-center">
            <Kicker>Before you start</Kicker>
            <SectionH>はじめる前に、よくある質問</SectionH>
          </div>
          <div className="space-y-2.5">
            <FaqItem q="料金はいくらですか？">
              相談メニューごとにエキスパートが設定しています。目安は
              <B>30分 ¥3,000〜、60分 ¥6,000〜</B>
              。各エキスパートのページで、時間と料金を確認してから申し込めます。継続プラン（月額）を用意しているエキスパートもいます。
            </FaqItem>
            <FaqItem q="予約や決済はどうやるのですか？">
              空き枠からの予約リクエストとチャットは使えます。
              <B>決済機能は現在準備中</B>
              のため、料金の支払いが必要になる段階の前で止まります。まずはチャットでの相談内容のすり合わせからお試しください。
            </FaqItem>
            <FaqItem q="「居住認証」は何を確認しているのですか？">
              現地の滞在許可証・公共料金の請求書・賃貸契約書などの書類で、
              <B>「いま、その街に実際に住んでいる」こと</B>
              を運営が確認しています。経歴や肩書きの審査ではなく、居住実態の審査です。確認済みのエキスパートだけにバッジが表示されます。
            </FaqItem>
            <FaqItem q="無料でできることはありますか？">
              会員登録・エキスパート探し・記事（読みもの）・
              <B>申し込み前のチャットでの質問</B>
              まで、すべて無料です。有料になるのは相談メニューを申し込んでからです。
            </FaqItem>
            <FaqItem q="どんなことを相談できますか？">
              移住・留学・駐在準備の段取り、住むエリア選び、生活の手続き、子育てや学校、仕事や起業、こだわりの旅行プランまで。各エキスパートの「こんな相談に乗れます」を見て選んでください。医療・法律・税務など資格が必要な業務のアドバイスは対象外です（経験談としてのお話は可能です）。
            </FaqItem>
            <FaqItem q="エキスパートは海外在住。時差は大丈夫？">
              空き枠も確定日時も<B>すべて日本時間で表示</B>
              されるので、時差の計算は不要です。エキスパート側には現地時間で表示され、換算はLocoreが自動で行います。多くのエキスパートが日本時間の夜・週末に枠を設定しています。
            </FaqItem>
            <FaqItem q="キャンセルはできますか？">
              エキスパートが承諾する前のリクエストは、いつでも取り消せます。確定後に都合が悪くなった場合は、できるだけ早くチャットで相手に連絡して日程を調整してください。決済導入にあわせて、キャンセルポリシーを正式に整備する予定です。
            </FaqItem>
            <FaqItem q="相談相手と合わなかったら？">
              そのために<B>申し込み前の無料チャット</B>
              があります。話し方や詳しさが合うか、まず質問して確かめてください。相談後はレビューで率直な評価を残せます。やり取りで問題があった場合は、運営までご連絡ください。
            </FaqItem>
          </div>
        </div>
      </section>

      {/* ===== [11] final CTA ===== */}
      <section className="px-6 pb-[90px]">
        <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-3xl border border-border bg-card px-10 py-16 text-center shadow-sm">
          <span
            className="absolute -right-[70px] -top-[90px] h-60 w-60 rounded-full bg-primary-50"
            aria-hidden
          />
          <span
            className="absolute -bottom-[110px] -left-20 h-[260px] w-[260px] rounded-full bg-muted"
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-[clamp(24px,3.4vw,34px)] font-black tracking-[-0.02em]">
              あなたの海外を、
              <em className="not-italic text-primary-700">経験者</em>と。
            </h2>
            <p className="mt-[13px] text-[14.5px] text-neutral-500">
              検索を3時間続けるより、住んでいる人にひとこと聞いてみませんか。
            </p>
            <div className="mt-[26px] flex flex-wrap justify-center gap-3.5">
              <Link
                href="/experts"
                className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-[30px] py-[13px] text-[15px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
              >
                エキスパートを探す
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/become-writer"
                className="inline-flex items-center rounded-full border border-border-strong px-6 py-[11px] text-[14px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground"
              >
                エキスパートとして参加
              </Link>
            </div>
            <div className="mt-3.5 text-[12px] text-neutral-400">
              会員登録は無料。チャットでの事前相談から始められます。
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
