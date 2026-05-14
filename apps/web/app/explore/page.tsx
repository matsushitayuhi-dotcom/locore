import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
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
  const photoJournalArticles = articles.filter(
    (a) => a.articleType === 'photo_journal',
  );

  return (
    <main className="bg-background">
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

        {/* フォト日記 — インスタ風の没入記事 */}
        {photoJournalArticles.length > 0 ? (
          <section id="photo-journal">
            <SectionHeader
              kicker="フォト日記"
              title="写真と短い言葉で街を歩く"
              subtitle="縦スクロールで 1 枚ずつ全画面表示。インスタを読むみたいに没入できます。"
              href="/articles?type=photo_journal"
            />
            <ArticleScrollSection
              articles={photoJournalArticles}
              moreHref="/articles?type=photo_journal"
              socialCounts={socialCounts}
            />
          </section>
        ) : null}

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
