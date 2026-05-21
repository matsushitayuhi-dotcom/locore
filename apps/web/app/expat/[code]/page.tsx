import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Briefcase,
  Home as HomeIcon,
  Megaphone,
  Users,
  GraduationCap,
  HandHelping,
  Search,
  CalendarDays,
} from 'lucide-react';
import { listBoardPosts } from '@/lib/board/db';
import { BoardWidget } from '@/components/BoardWidget';
import { ArticleScrollSection } from '@/components/ArticleScrollSection';
import { CommunityCard } from '@/components/community/CommunityCard';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';
import { listCommunityPosts } from '@/lib/community/db';
import { getFeaturedServices } from '@/lib/services/featured';
import { ServiceCarousel } from '@/components/services/ServiceCarousel';
import { getCountryByCode } from '@/lib/geo/countries';
import {
  KIND_BASE_PATH,
  KIND_LABEL,
  type CommunityKind,
} from '@/lib/community/constants';

export const dynamic = 'force-dynamic';

type Props = { params: { code: string } };

export async function generateMetadata({ params }: Props) {
  const country = await getCountryByCode(params.code);
  if (!country) return { title: '見つかりません' };
  return {
    title: `${country.nameJa} の駐在員ホーム — Locore`,
    description: `${country.nameJa}（${country.nameEn}）に住む方のための、コミュニティ掲示板と新着ニュース。`,
  };
}

/**
 * 駐在員向け国別ホーム (/expat/[code])。
 *
 * 構成:
 *   1. コミュニティカテゴリ（6 つ）を最上部のタイル列で
 *   2. カテゴリごとの新着投稿 4 件を Airbnb 風のカードグリッドで
 *   3. 新着ニュース掲示板（BoardWidget）
 *   4. 駐在者向け記事（横スクロール）
 *   5. Founders 枠
 *
 * 国別フィルタリングについて:
 *   現状の listBoardPosts / listCommunityPosts / getFeaturedServices は
 *   国レベルのフィルタを持たない（city_id ベースのみ）。Locore で active な
 *   駐在員向け国はフランスだけなので、フランスのみ実コンテンツを出し、
 *   他国は coming_soon バナーで返す方針にしている。
 *   今後、駐在員ホームを他国にも展開する際に、ここのクエリに country フィルタを足す。
 */
export default async function ExpatCountryHomePage({ params }: Props) {
  const country = await getCountryByCode(params.code);
  if (!country) notFound();

  // フランス以外はまだコンテンツが整っていないので Coming Soon を返す。
  // ナビ的にここに辿りつけるのは PlaceMenu の active 国経由 + 直接 URL のみ。
  if (country.code !== 'fr') {
    return (
      <main className="bg-background">
        <div className="mx-auto max-w-screen-md space-y-6 px-4 py-16 text-center sm:py-24">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
            Coming Soon
          </p>
          <h1
            className="text-[24px] font-bold tracking-tight sm:text-[28px]"
          >
            {country.nameJa} の駐在員ホームは準備中です
          </h1>
          <p className="mx-auto max-w-md text-[13px] leading-[1.9] text-foreground/70">
            Locore は今フランスから始めています。
            {country.nameJa} で暮らす方の声を反映できる準備が整いしだい、
            掲示板・新着ニュース・暮らしの記事をここで公開します。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/expat"
              className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[13px] font-semibold text-foreground ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
            >
              他の国を見る
            </Link>
            <Link
              href="/founders"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
            >
              Founders 枠を見る
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 表示順は lib/community/constants.ts の COMMUNITY_KINDS と揃える:
  // アパート → 売買 → 求人 → イベント → 習い事 → 助け合い
  const KINDS: { kind: CommunityKind; icon: typeof Briefcase }[] = [
    { kind: 'apartment', icon: HomeIcon },
    { kind: 'marketplace', icon: Megaphone },
    { kind: 'job', icon: Briefcase },
    { kind: 'group', icon: Users },
    { kind: 'lesson', icon: GraduationCap },
    { kind: 'mutual_aid', icon: HandHelping },
  ];

  const [
    residentNews,
    expatArticles,
    jobPosts,
    apartmentPosts,
    marketplacePosts,
    groupPosts,
    lessonPosts,
    mutualAidPosts,
    residentServices,
  ] = await Promise.all([
    listBoardPosts({ limit: 5, audiences: ['resident'] }),
    getPublishedDbArticles(20).then((arr) =>
      arr.filter((a) => a.articleType === 'expat_info'),
    ),
    listCommunityPosts({ kind: 'job', limit: 4 }),
    listCommunityPosts({ kind: 'apartment', limit: 4 }),
    listCommunityPosts({ kind: 'marketplace', limit: 4 }),
    listCommunityPosts({ kind: 'group', limit: 4 }),
    listCommunityPosts({ kind: 'lesson', limit: 4 }),
    listCommunityPosts({ kind: 'mutual_aid', limit: 4 }),
    getFeaturedServices({ audience: 'resident', limit: 12 }),
  ]);

  const socialCounts = await getArticleSocialCounts(
    expatArticles.map((a) => a.id),
  );

  const postsByKind: Record<CommunityKind, typeof jobPosts> = {
    job: jobPosts,
    apartment: apartmentPosts,
    marketplace: marketplacePosts,
    group: groupPosts,
    lesson: lessonPosts,
    mutual_aid: mutualAidPosts,
  };

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl space-y-10 px-4 py-8 sm:space-y-14 sm:px-6 sm:py-12">
        {/* 国名のごく軽いヘッダ（旧 /expat には無かったが、国別になったので
            「今どの国を見ているか」を明示する） */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
              {country.nameEn} — Residents
            </p>
            <h1
              className="mt-1 text-[22px] font-bold tracking-tight sm:text-[26px]"
            >
              {country.nameJa} の駐在員ホーム
            </h1>
          </div>
          <Link
            href="/expat"
            className="hidden whitespace-nowrap rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground/70 ring-1 ring-border transition hover:bg-primary-500/10 hover:text-foreground sm:inline-flex"
          >
            国を選び直す
          </Link>
        </div>

        {/* 1. コミュニティ掲示板カテゴリ — 最上部 */}
        <section aria-labelledby="board-nav-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
                コミュニティ掲示板
              </p>
              <h2
                id="board-nav-title"
                className="mt-1 text-[20px] font-semibold tracking-tight sm:text-[24px]"
              >
                住人どうしで、直接つながる
              </h2>
            </div>
            <Link
              href="/residents"
              className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
            >
              <Search className="h-3 w-3" />
              住人を探す
            </Link>
          </div>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
            {KINDS.map(({ kind, icon: Icon }) => (
              <li key={kind}>
                <Link
                  href={KIND_BASE_PATH[kind]}
                  className="group flex flex-col items-center gap-1.5 rounded-xl bg-card px-2 py-3 text-center ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300 sm:gap-2 sm:py-4"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-500/10 text-primary-300 transition group-hover:bg-primary-500 group-hover:text-neutral-950 sm:h-11 sm:w-11">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <p className="text-[11px] font-bold text-foreground sm:text-[12px]">
                    {KIND_LABEL[kind]}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* 2. 新着ニュース掲示板 (カテゴリタイルの直下) */}
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
                新着ニュース
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-tight sm:text-[20px]">
                今日と明日の暮らし情報
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/calendar"
                className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-primary-300 hover:underline"
              >
                <CalendarDays className="h-3 w-3" />
                カレンダー
              </Link>
              <Link
                href="/board?audience=resident"
                className="text-[12px] font-semibold text-primary-300 hover:underline"
              >
                すべて見る →
              </Link>
            </div>
          </div>
          <BoardWidget posts={residentNews} />
        </section>

        {/* 2.5 提供サービス — 駐在員向け。空のときはセクションごと出さない。 */}
        {residentServices.length > 0 ? (
          <section aria-labelledby="resident-services-title">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
                  提供サービス
                </p>
                <h2
                  id="resident-services-title"
                  className="mt-1 text-[18px] font-semibold tracking-tight sm:text-[20px]"
                >
                  暮らしを助けてくれる住人
                </h2>
              </div>
            </div>
            <ServiceCarousel services={residentServices} />
          </section>
        ) : null}

        {/* 3. カテゴリ別の新着 — 横スクロールのカルーセル */}
        {KINDS.map(({ kind }) => {
          const posts = postsByKind[kind];
          if (posts.length === 0) return null;
          return (
            <section key={kind} aria-labelledby={`new-${kind}-title`}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2
                  id={`new-${kind}-title`}
                  className="text-[18px] font-semibold tracking-tight sm:text-[20px]"
                >
                  {KIND_LABEL[kind]}
                  <span className="ml-2 text-[12px] font-normal text-foreground/55 tabular">
                    新着 {posts.length} 件
                  </span>
                </h2>
                <Link
                  href={KIND_BASE_PATH[kind]}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary-300 hover:underline"
                >
                  すべて見る
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {/* 横スクロール: 各カードは固定幅、snap で左端揃え。
                  スマホは 1.6 枚、PC は 4.2 枚見えるイメージ */}
              <ul
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                style={{ scrollSnapStop: 'always' }}
              >
                {posts.map((p) => (
                  <li
                    key={p.id}
                    className="w-[62%] shrink-0 snap-start sm:w-[32%] lg:w-[23%]"
                  >
                    <CommunityCard post={p} />
                  </li>
                ))}
                {/* カテゴリ TOP への末尾カード */}
                <li className="flex w-[62%] shrink-0 snap-start items-center justify-center rounded-xl bg-card text-center ring-1 ring-dashed ring-border sm:w-[32%] lg:w-[23%]">
                  <Link
                    href={KIND_BASE_PATH[kind]}
                    className="block p-6 text-[12px] font-semibold text-primary-300 hover:underline"
                  >
                    {KIND_LABEL[kind]} を<br />
                    すべて見る →
                  </Link>
                </li>
              </ul>
            </section>
          );
        })}

        {/* 4. 駐在者向け記事 */}
        {expatArticles.length > 0 ? (
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-[18px] font-semibold tracking-tight sm:text-[20px]">
                駐在者情報
                <span className="ml-2 text-[12px] font-normal text-foreground/55">
                  長文の暮らしリファレンス
                </span>
              </h2>
              <Link
                href="/articles?type=expat_info"
                className="text-[12px] font-semibold text-primary-300 hover:underline"
              >
                すべて見る →
              </Link>
            </div>
            <ArticleScrollSection
              articles={expatArticles}
              moreHref="/articles?type=expat_info"
              socialCounts={socialCounts}
            />
          </section>
        ) : null}

        {/* 5. Founders 枠 */}
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
              <h2 className="mt-3 text-[20px] font-semibold leading-[1.3] tracking-tight text-foreground sm:text-[24px]">
                最初の 50 人を、長く覚えていたい。
              </h2>
              <p className="mt-2 text-[13px] leading-[1.8] text-foreground/70">
                立ち上げから一緒に走ってくれる Founders には、認証バッジ・手数料優遇・サービス方針への発言権をお渡しします。
              </p>
            </div>
            <div className="flex justify-end">
              <Link
                href="/founders"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-5 py-2.5 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
              >
                応募ページを見る
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
