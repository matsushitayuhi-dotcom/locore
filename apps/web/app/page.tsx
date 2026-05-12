import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { CountryCarousel } from '../components/CountryCarousel';
import { ArticleScrollSection } from '../components/ArticleScrollSection';
import { listCountriesForPicker } from '@/lib/geo/countries';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Locore — 世界の "本物" を、現地民が案内する',
  description:
    'Locore は在外邦人クリエイターが現地で書く、観光ガイドにはない街の物語。国・地域から、スポット記事と旅程プランを選んで深く旅できます。',
};

/**
 * ルート / — トップページ。
 *
 * 構成:
 *   1. Hero band（コピー）
 *   2. 国カルーセル（active + 準備中、全 28 ヶ国を横スクロール）
 *   3. 「すべての国の」最新スポット記事 10 件（横スクロール、続きを見る → /articles?type=spot_guide）
 *   4. 「すべての国の」最新旅程プラン 10 件（同上 → /articles?type=itinerary）
 *
 * 記事カードにはサーバ側で「国・地域」タグが入っている（area = "フランス・パリ＆近郊"）。
 * 国→地域→記事 のドリルダウンは /country/[code] → /region/[slug] へ。
 */
export default async function HomePage() {
  const [countries, articles] = await Promise.all([
    listCountriesForPicker(),
    getPublishedDbArticles(60),
  ]);
  const socialCounts = await getArticleSocialCounts(articles.map((a) => a.id));

  const spotArticles = articles.filter((a) => a.articleType === 'spot_guide');
  const itineraryArticles = articles.filter(
    (a) => a.articleType === 'itinerary',
  );
  const expatArticles = articles.filter((a) => a.articleType === 'expat_info');

  return (
    <main className="bg-background">
      {/* Hero band */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary-50 via-card to-card">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-24 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-accent-300/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-screen-xl px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-14">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300 shadow-sm ring-1 ring-border">
            <Sparkles className="h-3 w-3 text-primary-500" />
            現地民の "本物" だけ
          </p>
          <h1
            className="mt-4 text-[30px] font-bold leading-[1.08] tracking-tight text-foreground sm:text-[44px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            世界のどこを、
            <br className="sm:hidden" />
            <span className="relative inline-block">
              <span className="relative z-10 text-primary-300">深く</span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 z-0 h-2.5 rounded-full bg-primary-500/15"
              />
            </span>
            旅しますか？
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] leading-[1.85] text-foreground/75 sm:text-[15px]">
            在外邦人クリエイターが、現地でしか書けない街の輪郭を届けます。
            まずは流れる国カードから気になる場所を、または下の記事から旅のヒントを。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-screen-xl space-y-12 px-4 py-10 sm:space-y-14 sm:px-6 sm:py-14">
        {/* 2. 国カルーセル */}
        <section>
          <SectionHeader
            kicker="国から探す"
            title="どこから始めますか？"
            subtitle="タップでその国の地域一覧へ。準備中の国は順次オープンします。"
          />
          <CountryCarousel countries={countries} />
        </section>

        {/* 3. スポット記事 */}
        <section id="spot-guide">
          <SectionHeader
            kicker="新着スポット"
            title="1 地点を深く知る"
            subtitle="現地民が「ここはハマりますよ」と教える単独スポット。国・地域タグつき。"
            href="/articles?type=spot_guide"
          />
          <ArticleScrollSection
            articles={spotArticles}
            moreHref="/articles?type=spot_guide"
            socialCounts={socialCounts}
          />
        </section>

        {/* 4. 旅程記事 */}
        <section id="itinerary">
          <SectionHeader
            kicker="新着旅程"
            title="半日 / 1 日のルート"
            subtitle="現地民がデザインしたルート。所要時間と移動手段つき。"
            href="/articles?type=itinerary"
          />
          <ArticleScrollSection
            articles={itineraryArticles}
            moreHref="/articles?type=itinerary"
            socialCounts={socialCounts}
          />
        </section>

        {/* 5. 駐在者情報 */}
        {expatArticles.length > 0 ? (
          <section id="expat-info">
            <SectionHeader
              kicker="駐在者情報"
              title="現地で暮らすための実用情報"
              subtitle="日用品・行政手続き・医療など、現地で困った時の知恵袋。"
              href="/articles?type=expat_info"
            />
            <ArticleScrollSection
              articles={expatArticles}
              moreHref="/articles?type=expat_info"
              socialCounts={socialCounts}
            />
          </section>
        ) : null}
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
