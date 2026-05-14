import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CountryCarousel } from '@/components/CountryCarousel';
import { ArticleScrollSection } from '@/components/ArticleScrollSection';
import { listCountriesForPicker } from '@/lib/geo/countries';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Locore — その街に、暮らしている人から',
  description:
    '現地に住む日本人の書き手が、自分の毎日で取材した街の物語。国・地域から、スポット紹介と旅程プランを選んで深く旅できます。',
};

/**
 * 旅行者向けホーム (/explore)。
 *
 * 構成:
 *   1. Hero band（編集トーンのコピー）
 *   2. 国カルーセル（active 先頭、最大 10 件、続きは /world）
 *   3. 新着スポット記事 10 件（横スクロール、続き → /articles?type=spot_guide）
 *   4. 新着旅程プラン 10 件（同上 → /articles?type=itinerary）
 *
 * 駐在員ホームと違って、ここには「行政」「コミュニティ」「求人」「アパート」など
 * 暮らし実務系のセクションは出さない。
 */
export default async function ExplorePage() {
  const [countries, articles] = await Promise.all([
    listCountriesForPicker(),
    getPublishedDbArticles(60),
  ]);
  const socialCounts = await getArticleSocialCounts(articles.map((a) => a.id));

  const spotArticles = articles.filter((a) => a.articleType === 'spot_guide');
  const itineraryArticles = articles.filter(
    (a) => a.articleType === 'itinerary',
  );

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl space-y-12 px-4 py-8 sm:space-y-14 sm:px-6 sm:py-12">
        <section>
          <SectionHeader
            kicker="行き先から探す"
            title="どこの暮らしを覗きますか？"
            subtitle="今はフランスの 14 地域で書き手がいます。台北・ハノイ・リスボンと、信頼できる現地ライターから順に街を開いていきます。"
          />
          <CountryCarousel countries={countries} />
        </section>

        <section id="spot-guide">
          <SectionHeader
            kicker="スポット紹介"
            title="一軒の店、一本の坂道。"
            subtitle="観光地ではなく、書き手が時間をかけて何度も通った場所だけを取り上げます。地図と入り方つき。"
            href="/articles?type=spot_guide"
          />
          <ArticleScrollSection
            articles={spotArticles}
            moreHref="/articles?type=spot_guide"
            socialCounts={socialCounts}
          />
        </section>

        <section id="itinerary">
          <SectionHeader
            kicker="旅程プラン"
            title="現地民の半日、1 日の歩き方"
            subtitle="移動時間、混みやすい時間帯、ちょっとした注意点まで添えた、そのまま辿れるルート。"
            href="/articles?type=itinerary"
          />
          <ArticleScrollSection
            articles={itineraryArticles}
            moreHref="/articles?type=itinerary"
            socialCounts={socialCounts}
          />
        </section>

        {/* 駐在員ホームへの導線（軽め） */}
        <section className="rounded-2xl bg-primary-500/10 px-6 py-8 text-center ring-1 ring-border">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary-300">
            For residents
          </p>
          <h2
            className="mt-2 text-[20px] font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            その街に暮らしている方へ
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-foreground/65">
            行政の締切、求人、アパート、邦人コミュニティ。
            暮らしの実務を扱う駐在員ホームも用意しています。
          </p>
          <Link
            href="/expat"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
          >
            駐在員ホームを見る
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
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
          すべて見る
          <ArrowRight className="ml-1 inline h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}
