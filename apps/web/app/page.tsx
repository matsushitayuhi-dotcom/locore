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
            その街に、暮らしている人から
          </p>
          <h1
            className="mt-4 text-[30px] font-bold leading-[1.08] tracking-tight text-foreground sm:text-[44px]"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            旅は、
            <span className="relative inline-block whitespace-nowrap">
              <span className="relative z-10 text-primary-300">誰の言葉</span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 z-0 h-2.5 rounded-full bg-primary-500/15"
              />
            </span>
            で
            <br className="sm:hidden" />
            読むかで変わる。
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] leading-[1.9] text-foreground/75 sm:text-[15px]">
            Locore は、世界の街に暮らす日本人の書き手が、自分の毎日のなかで取材し、編集して届ける小さな旅行誌です。
            SNS では流れていってしまう「現地のこと」を、後から読み返せる短い物語の形にしました。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-screen-xl space-y-12 px-4 py-10 sm:space-y-14 sm:px-6 sm:py-14">
        {/* 2. 国カルーセル */}
        <section>
          <SectionHeader
            kicker="行き先から探す"
            title="どこの暮らしを覗きますか？"
            subtitle="今はフランスの 14 地域で書き手がいます。台北・ハノイ・リスボンと、信頼できる現地ライターから順に街を開いていきます。"
          />
          <CountryCarousel countries={countries} />
        </section>

        {/* 3. スポット記事 */}
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

        {/* 4. 旅程記事 */}
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

        {/* 5. 駐在者情報 */}
        {expatArticles.length > 0 ? (
          <section id="expat-info">
            <SectionHeader
              kicker="駐在者情報"
              title="暮らしの実務、ぜんぶ"
              subtitle="蚊取り線香はどこで売っている、こどもの予防接種、年に一度の納税。観光ガイドには載らない、住んでみて初めて困ることの答え。"
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
