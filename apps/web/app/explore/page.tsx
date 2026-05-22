import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CountryGridByContinent } from '@/components/CountryGridByContinent';
import { ArticleScrollSection } from '@/components/ArticleScrollSection';
import { ServiceCarousel } from '@/components/services/ServiceCarousel';
import { listCountriesForPicker } from '@/lib/geo/countries';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';
import { getFeaturedServices } from '@/lib/services/featured';

export const revalidate = 60;

export const metadata = {
  title: 'Locore',
};

/**
 * 旅行者向けホーム (/explore)。
 *
 * セクション順 (2026-05 改修):
 *   1. 行き先     — 国を大陸別タイルグリッドで
 *   2. スポット紹介 — 横スクロールカルーセル
 *   3. 旅程プラン   — 横スクロールカルーセル
 *   4. 旅行者向けサービス — 現地民が出品しているサービス
 *   5. 駐在員ホーム導線
 *
 * タイトル文言は機能名のみ。副題・キャッチコピー（「一軒の店、一本の坂道」等）
 * は撤去してミニマリスト方針。
 */
export default async function ExplorePage() {
  // 公開記事 + 社会的カウント + 旅行者サービスを並列フェッチ
  const [countries, articles, services] = await Promise.all([
    listCountriesForPicker(),
    getPublishedDbArticles(40),
    getFeaturedServices({ audience: 'traveler', limit: 10 }),
  ]);

  const articleIds = articles.map((a) => a.id);
  const socialCounts =
    articleIds.length > 0
      ? await getArticleSocialCounts(articleIds)
      : new Map();

  const spotGuides = articles
    .filter((a) => a.articleType === 'spot_guide')
    .slice(0, 10);
  const itineraries = articles
    .filter((a) => a.articleType === 'itinerary')
    .slice(0, 10);

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl space-y-12 px-4 py-8 sm:space-y-14 sm:px-6 sm:py-12">
        {/* 1. 行き先 */}
        <section>
          <SectionHeader title="行き先" />
          <CountryGridByContinent countries={countries} />
        </section>

        {/* 2. 旅程プラン (スポット紹介より先に見せる) */}
        {itineraries.length > 0 ? (
          <section id="itinerary">
            <SectionHeader title="旅程プラン" href="/articles?type=itinerary" />
            <ArticleScrollSection
              articles={itineraries}
              moreHref="/articles?type=itinerary"
              socialCounts={socialCounts}
            />
          </section>
        ) : null}

        {/* 3. スポット紹介 */}
        {spotGuides.length > 0 ? (
          <section id="spot-guide">
            <SectionHeader title="スポット紹介" href="/articles?type=spot_guide" />
            <ArticleScrollSection
              articles={spotGuides}
              moreHref="/articles?type=spot_guide"
              socialCounts={socialCounts}
            />
          </section>
        ) : null}

        {/* 4. 旅行者向けサービス (現地民が出品しているサービス) */}
        {services.length > 0 ? (
          <section id="services">
            <SectionHeader title="旅行者向けサービス" href="/services" />
            <ServiceCarousel services={services} />
          </section>
        ) : null}

        {/* 5. 駐在員ホームへの導線 (軽め) */}
        <section className="rounded-2xl bg-primary-500/10 px-6 py-8 text-center ring-1 ring-border">
          <h2 className="text-[20px] font-bold tracking-tight">
            暮らしている方へ
          </h2>
          <Link
            href="/expat"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
          >
            駐在員ホーム
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
    </main>
  );
}

function SectionHeader({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-[20px] font-bold leading-tight tracking-tight sm:text-[24px]">
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          aria-label={`${title}をすべて見る`}
          className="hidden h-8 w-8 items-center justify-center rounded-full bg-card text-primary-300 ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300 sm:inline-flex"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
