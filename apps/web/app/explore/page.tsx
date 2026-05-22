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
 * セクション順 (PR3 サービス推し改修):
 *   1. 今探されているサービス — 横スクロールカルーセル
 *   2. カテゴリから探す       — chip リストで /services?cat= に飛ばす
 *   3. 旅程プラン            — 記事カルーセル
 *   4. スポット紹介          — 記事カルーセル
 *   5. 行き先 (国グリッド)
 *   6. 駐在員ホーム導線
 *
 * 「サービスから始まり、記事と地域は補助」という建付け。タイトル文言は
 * 機能名のみのミニマリスト方針を踏襲。
 */

/** /services?cat=... のカテゴリチップ。サービス分類は大カテゴリ 8 つ。 */
const SERVICE_CATEGORIES: { slug: string; label: string; emoji: string }[] = [
  { slug: 'tourism', label: '観光・アテンド', emoji: '🗺️' },
  { slug: 'consulting', label: 'コンサル・相談', emoji: '💬' },
  { slug: 'translation', label: '翻訳・通訳', emoji: '🈳' },
  { slug: 'attend', label: '同行・代行', emoji: '🤝' },
  { slug: 'shipping', label: '買付・発送', emoji: '📦' },
  { slug: 'shooting', label: '撮影', emoji: '📸' },
  { slug: 'access', label: '現地アクセス', emoji: '🗝️' },
  { slug: 'other', label: 'その他', emoji: '✨' },
];

export default async function ExplorePage() {
  const [countries, articles, services] = await Promise.all([
    listCountriesForPicker(),
    getPublishedDbArticles(40),
    getFeaturedServices({ audience: 'traveler', limit: 12 }),
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
        {/* 1. 今探されているサービス */}
        {services.length > 0 ? (
          <section id="services">
            <SectionHeader title="今探されているサービス" href="/services" />
            <ServiceCarousel services={services} />
          </section>
        ) : null}

        {/* 2. カテゴリから探す */}
        <section id="service-categories">
          <SectionHeader title="カテゴリから探す" href="/services" />
          <ul className="flex flex-wrap gap-2">
            {SERVICE_CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/services?cat=${c.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[13px] font-medium text-foreground/80 ring-1 ring-border transition hover:bg-primary-500/10 hover:text-foreground hover:ring-primary-300"
                >
                  <span aria-hidden>{c.emoji}</span>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* 3. 旅程プラン */}
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

        {/* 4. スポット紹介 */}
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

        {/* 5. 行き先 (国グリッド) */}
        <section>
          <SectionHeader title="行き先" />
          <CountryGridByContinent countries={countries} />
        </section>

        {/* 6. 駐在員ホームへの導線 (軽め) */}
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
