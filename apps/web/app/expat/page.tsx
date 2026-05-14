import Link from 'next/link';
import {
  ArrowRight,
  PenSquare,
  Briefcase,
  Home as HomeIcon,
  Megaphone,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { listBoardPosts } from '@/lib/board/db';
import { BoardWidget } from '@/components/BoardWidget';
import { ArticleScrollSection } from '@/components/ArticleScrollSection';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Locore for Residents — 暮らしの実務、ぜんぶ',
  description:
    '駐在員と、駐在員と繋がりたい人のためのホーム。行政の締切、求人、アパート、邦人コミュニティ、駐在生活の知恵。',
};

/**
 * 駐在員向けホーム (/expat)。
 *
 * 旅行者ホームと違って、暮らしの実務系（行政・コミュ・子育て・交通）を
 * 優先的に並べる。求人 / アパート / 売買 / メンバー募集 は Phase 2 で
 * 実装する予定で、ここでは Coming Soon カードを並べて存在を予告する。
 */
export default async function ExpatHomePage() {
  // 駐在員向けの新着ニュース: 旅行者ホームと同じ BoardWidget 構造で
  // 全カテゴリ（イベント含む）を resident + both で取得する
  const [residentNews, expatArticles] = await Promise.all([
    listBoardPosts({
      limit: 10,
      audiences: ['resident'],
    }),
    getPublishedDbArticles(20).then((arr) =>
      arr.filter((a) => a.articleType === 'expat_info'),
    ),
  ]);
  const socialCounts = await getArticleSocialCounts(
    expatArticles.map((a) => a.id),
  );

  return (
    <main className="bg-background">
      {/* Hero band — 旅行者ホームより落ち着いた、実務寄りトーン */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-blue-50 via-card to-card">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl"
        />
        <div className="relative mx-auto max-w-screen-xl px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-14">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 shadow-sm ring-1 ring-border">
            <Sparkles className="h-3 w-3 text-blue-600" />
            for residents
          </p>
          <h1
            className="mt-4 text-[28px] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[40px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            暮らしの実務、ぜんぶ。
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-[1.9] text-foreground/75">
            行政の締切、子育て、邦人コミュニティ、求人、アパート探し。
            「住んでみて初めて困ること」を、現地で暮らす書き手と、ここに集まる住人で
            少しずつ埋めていく場所です。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-screen-xl space-y-12 px-4 py-10 sm:space-y-14 sm:px-6 sm:py-14">
        {/* 1. クリエイター / コミュニティ参加への入口 */}
        <section className="grid gap-3 sm:grid-cols-3">
          <QuickAction
            href="/writer/articles/new"
            icon={PenSquare}
            title="記事を書く"
            description="現地で暮らす書き手として、街のことを記事に"
          />
          <QuickAction
            href="/admin/board"
            icon={Megaphone}
            title="掲示板に投稿"
            description="行政・コミュニティ・季節食材 ほか"
          />
          <QuickAction
            href="/chat"
            icon={MessageCircle}
            title="メッセージ"
            description="他の住人や書き手とつながる"
          />
        </section>

        {/* 2. 新着ニュース — 旅行者ホームと同じ構造。カテゴリ別の絞り込みは /board のタブで */}
        <section>
          <SectionHeader
            kicker="新着ニュース"
            title="パリの、今日と明日"
            subtitle="行政の締切、交通、邦人コミュニティ、旬の食材、子育て、緊急の警報まで。タブで絞り込めます。"
            href="/board?audience=resident"
          />
          <BoardWidget posts={residentNews} />
        </section>

        {/* 4. 駐在者向け記事 */}
        {expatArticles.length > 0 ? (
          <section>
            <SectionHeader
              kicker="駐在者情報"
              title="長文で読み返す、暮らしのリファレンス"
              subtitle="蚊取り線香はどこで売っている、こどもの予防接種、年に一度の納税。"
              href="/articles?type=expat_info"
            />
            <ArticleScrollSection
              articles={expatArticles}
              moreHref="/articles?type=expat_info"
              socialCounts={socialCounts}
            />
          </section>
        ) : null}

        {/* 5. コミュニティ掲示板（求人 / アパート / 売買 / 募集 / レッスン / 助け合い） */}
        <section>
          <SectionHeader
            kicker="コミュニティ掲示板"
            title="住人どうしで、直接つながる"
            subtitle="住人どうしのやり取りに使える掲示の場です。連絡は Locore メッセージ機能経由でどうぞ。"
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CommunityLinkCard
              href="/jobs"
              icon={Briefcase}
              title="求人"
              description="日系・現地企業の求人、副業、家庭教師、ベビーシッター。"
            />
            <CommunityLinkCard
              href="/apartments"
              icon={HomeIcon}
              title="アパート"
              description="日本人歓迎の物件、シェア、家具付き短期、サブレ、引越し譲渡。"
            />
            <CommunityLinkCard
              href="/marketplace"
              icon={Megaphone}
              title="売ります・買います"
              description="帰任セール、家具家電、車、子供用品。物を介して住人が繋がる場所。"
            />
            <CommunityLinkCard
              href="/groups"
              icon={MessageCircle}
              title="メンバー募集"
              description="ママ友会、テニス・ランニング仲間、勉強会、言語交換。"
            />
            <CommunityLinkCard
              href="/lessons"
              icon={Sparkles}
              title="教えます・習います"
              description="子供向け日本語、フランス語家庭教師、料理、楽器。短時間から。"
            />
            <CommunityLinkCard
              href="/help"
              icon={MessageCircle}
              title="助け合い"
              description="空港送迎、書類の翻訳、こどもの一時預かりなど小さな相互扶助。"
            />
          </ul>
        </section>

        {/* 6. Founders 枠（駐在員ページ専用） */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500/15 via-card to-card p-6 shadow-sm ring-1 ring-border sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary-500/20 blur-3xl"
          />
          <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full bg-primary-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-950">
                Founders 枠（先着 50 人）
              </p>
              <h2 className="mt-3 text-[22px] font-bold leading-[1.25] tracking-tight text-foreground sm:text-[26px]">
                最初の 50 人を、
                <br className="hidden md:block" />
                ぼくらは長く覚えていたい。
              </h2>
              <p className="mt-3 text-[14px] leading-[1.9] text-foreground/75">
                Locore は、読み手と書き手の信頼でできている小さなメディアです。
                立ち上げから一緒に走ってくれる Founders には、
                認証バッジ、手数料優遇、サービスの方向性に対する発言権をお渡しします。
                判断基準は、フォロワー数ではなく、その街への愛着の深さです。
              </p>
            </div>
            <div className="flex justify-end">
              <Link
                href="/founders"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-5 py-2.5 text-[14px] font-bold text-neutral-950 transition hover:bg-primary-300"
              >
                応募ページを見る
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 7. 旅行者ホームへ */}
        <section className="rounded-2xl bg-card px-6 py-8 text-center ring-1 ring-border">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-foreground/55">
            For travelers
          </p>
          <h2
            className="mt-2 text-[20px] font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            旅行者として、もう一度パリを歩いてみる
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-foreground/65">
            自分の街を、旅行者の視点で見直したくなったときに。
          </p>
          <Link
            href="/explore"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
          >
            旅行者ホームを見る
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
    </main>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-300 transition group-hover:bg-primary-500 group-hover:text-neutral-950">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-foreground">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-foreground/65">
          {description}
        </p>
      </div>
      <ArrowRight className="mt-2 h-3.5 w-3.5 shrink-0 text-foreground/30 group-hover:text-primary-300" />
    </Link>
  );
}

function CommunityLinkCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full gap-3 rounded-xl bg-card p-4 ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-300 transition group-hover:bg-primary-500 group-hover:text-neutral-950">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-foreground">{title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-foreground/65">
            {description}
          </p>
        </div>
        <ArrowRight className="mt-2 h-3.5 w-3.5 shrink-0 text-foreground/30 group-hover:text-primary-300" />
      </Link>
    </li>
  );
}

function SectionHeader({
  kicker,
  title,
  subtitle,
  href,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          {kicker}
        </p>
        <h2
          className="mt-2 text-[22px] font-bold leading-tight tracking-tight sm:text-[26px]"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[12px] text-foreground/75 sm:text-[13px]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="hidden whitespace-nowrap rounded-full bg-card px-4 py-1.5 text-[13px] font-semibold text-primary-300 ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300 sm:inline-flex"
        >
          すべて見る
          <ArrowRight className="ml-1 inline h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}
