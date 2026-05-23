import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CountryGridByContinent } from '@/components/CountryGridByContinent';
import { ArticleScrollSection } from '@/components/ArticleScrollSection';
import { FloatingMapButton } from '@/components/FloatingMapButton';
import { listCountriesForPicker } from '@/lib/geo/countries';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';

export const revalidate = 60;

export const metadata = {
  title: 'Locore',
};

/**
 * 旅行者向けホーム (/explore)。
 *
 * IA 3 領域モデル (2026-05) では:
 *   ①記事     → /explore (このページ)
 *   ②サービス → /services
 *   ③駐在員向け → /expat
 *
 * /explore からはサービス系セクション (カルーセル / カテゴリ chips) を撤去し、
 * 記事と地域の導線に専念する。地図機能は記事領域に統合する形で
 * 画面右下の FloatingMapButton から /map に飛ばす。
 *
 * セクション順:
 *   1. 旅程プラン
 *   2. スポット紹介
 *   3. 行き先 (国グリッド)
 *   4. 駐在員ホーム導線 (軽め)
 */
export default async function ExplorePage() {
  const [countries, articles] = await Promise.all([
    listCountriesForPicker(),
    getPublishedDbArticles(40),
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
        {/* 1. 旅程プラン */}
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

        {/* 2. スポット紹介 */}
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

        {/* 3. 行き先 (国グリッド) */}
        <section>
          <SectionHeader title="行き先" />
          <CountryGridByContinent countries={countries} />
        </section>

        {/* 4. 駐在員ホームへの導線 (軽め) */}
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

      {/* 右下に浮かぶ「地図で見る」ボタン。/map への導線。 */}
      <FloatingMapButton />
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
