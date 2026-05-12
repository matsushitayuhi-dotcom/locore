import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@locore/ui';
import { ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { SearchBox } from '@/components/SearchBox';
import { BoardWidget } from '@/components/BoardWidget';
import { ArticleScrollSection } from '@/components/ArticleScrollSection';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { listBoardPosts } from '@/lib/board/db';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';
import { getRegionBySlug } from '@/lib/geo/countries';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const region = await getRegionBySlug(params.slug);
  if (!region) return { title: '見つかりません' };
  return {
    title: `${region.countryNameJa}・${region.nameJa} — Locore`,
    description: `${region.countryNameJa}・${region.nameJa} の現地民が書いた旅の記事と新着ニュース。`,
  };
}

/**
 * 地域ホーム /region/[slug]。
 *
 * 構成（旧 / と同じ）:
 *   1. 検索ボックス（タイトル / 本文トグル付き、検索対象は全地域共通）
 *   2. 新着ニュース（地域非依存の掲示板。後でリージョン別に拡張予定）
 *   3. スポット紹介 — 10 件、横スクロール、続きを見る → /articles?region=&type=
 *   4. 旅程プラン — 同上
 *
 * 地域がロック中（is_active=false）の場合は Coming Soon 画面を出して、
 * 記事一覧は出さない。
 */
export default async function RegionHomePage({ params }: Props) {
  const region = await getRegionBySlug(params.slug);
  if (!region) notFound();

  // 非アクティブ地域は Coming Soon
  if (!region.isActive) {
    return (
      <main className="mx-auto max-w-screen-md px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          世界マップに戻る
        </Link>

        <div className="mt-8 rounded-3xl bg-card p-10 text-center ring-1 ring-border">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground/55">
            <Lock className="h-3 w-3" />
            Coming Soon
          </p>
          <h1
            className="mt-3 text-[28px] font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            {region.countryNameJa}・{region.nameJa}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground/70">
            この地域はまだ準備中です。クリエイターを募集しているので、現地在住で
            書いてみたい方はぜひ Founders 枠にご応募ください。
          </p>
          <Link
            href="/founders"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 hover:bg-primary-300"
          >
            Founders 枠を見る
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>
    );
  }

  const [articles, boardPosts] = await Promise.all([
    getPublishedDbArticles(60, region.slug),
    listBoardPosts(10),
  ]);
  const socialCounts = await getArticleSocialCounts(articles.map((a) => a.id));

  const spotArticles = articles.filter((a) => a.articleType === 'spot_guide');
  const itineraryArticles = articles.filter(
    (a) => a.articleType === 'itinerary',
  );

  const moreSpot = `/articles?type=spot_guide&region=${region.slug}`;
  const moreItinerary = `/articles?type=itinerary&region=${region.slug}`;

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl space-y-10 px-4 pt-6 pb-10 sm:space-y-12 sm:px-6 sm:pt-8">
        {/* ヘッダー: 国 → 地域 のパンくず + 地域タイトル */}
        <header>
          <nav className="text-[11px] text-foreground/55">
            <Link href="/" className="hover:underline">
              世界
            </Link>
            <span className="mx-1.5 text-foreground/30">›</span>
            <span className="text-foreground/75">{region.countryNameJa}</span>
            <span className="mx-1.5 text-foreground/30">›</span>
            <span className="font-semibold text-foreground">{region.nameJa}</span>
          </nav>
          <h1
            className="mt-2 text-[28px] font-bold leading-tight tracking-tight sm:text-[36px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            {region.nameJa}
          </h1>
        </header>

        {/* 1. 検索 */}
        <section aria-label="記事検索">
          <SearchBox />
        </section>

        {/* 2. 新着ニュース */}
        <section>
          <SectionHeader
            kicker="新着ニュース"
            title={`${region.nameJa}・今日明日に起きていること`}
            subtitle="マルシェ・展覧会・地元イベント。AI が毎朝公開情報からまとめます。"
            href="/board"
          />
          <BoardWidget posts={boardPosts} />
        </section>

        {/* 3. スポット紹介 */}
        <section id="spot-guide">
          <SectionHeader
            kicker="スポット紹介"
            title="1 地点を深く知る"
            subtitle="現地民が「ここはハマりますよ」と教える単独スポット。"
            href={moreSpot}
          />
          <ArticleScrollSection
            articles={spotArticles}
            moreHref={moreSpot}
            socialCounts={socialCounts}
          />
        </section>

        {/* 4. 旅程プラン */}
        <section id="itinerary">
          <SectionHeader
            kicker="旅程プラン"
            title="半日 / 1 日のルート"
            subtitle="現地民がデザインしたルート。所要時間と移動手段つき。"
            href={moreItinerary}
          />
          <ArticleScrollSection
            articles={itineraryArticles}
            moreHref={moreItinerary}
            socialCounts={socialCounts}
          />
        </section>

        {/* Founders */}
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
                Locore を一緒に育てるクリエイター、
                <br className="hidden md:block" />
                いま探してます。
              </h2>
              <p className="mt-3 text-[14px] leading-[1.85] text-foreground/75">
                取り分の優遇、永久バッジ、編集チームへのフィードバック権。
                フォロワー数ではなく、街への深さを最優先で選びます。
              </p>
            </div>
            <div className="flex justify-end">
              <Link href="/founders">
                <Button size="lg" variant="primary">
                  応募ページを見る
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
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
          すべて見る →
        </Link>
      ) : null}
    </div>
  );
}
