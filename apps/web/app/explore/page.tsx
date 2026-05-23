import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ArticleMagazineGrid } from '@/components/explore/ArticleMagazineGrid';
import { FloatingMapButton } from '@/components/FloatingMapButton';
import { listCountriesForPicker } from '@/lib/geo/countries';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';
import { listFeaturedResidents } from '@/lib/residents/featured';
import { ResidentAvatarStrip } from '@/components/explore/ResidentAvatarStrip';
import { FeatureArticleHero } from '@/components/explore/FeatureArticleHero';
import { ThreeServicesIntro } from '@/components/explore/ThreeServicesIntro';

export const revalidate = 60;

export const metadata = {
  title: 'Locore — 現地に住む人と、つながる旅',
  description:
    '駐在員が書く一次情報の記事と、現地で直接頼めるサービス。海外の街と、そこに暮らす人にもう一歩近づくプラットフォーム。',
};

/**
 * 旅行者向けホーム (/explore)。
 *
 * 2026-05 再設計（行き先撤去版）:
 *   階層構造: ホーム → 国 → 記事 / サービス / コミュニティ
 *   /explore は「全国合算 aggregate」、国別のコンテンツは /country/[code] に集約。
 *
 *   1. Hero  — 「現地に住む人と、つながる旅。」 + 主要 CTA
 *   1.5 コンパクトな国チップ行 (人気上位 8 + すべての国を見る)
 *   2. 3 サービス紹介 (ロコア トラベル / サービス / コミュニティ)
 *   3. 今週の特集記事 (雑誌表紙風、1 本だけ大きく)
 *   4. 駐在員ピックアップ — 顔出しカルーセル (差別化の核)
 *   5. 旅程プラン (記事カルーセル)
 *   6. スポット紹介 (記事カルーセル)
 *   7. 駐在員ホーム導線
 *
 * 大きな国グリッド（CountryGridByContinent）は撤去し、
 * 国選択はチップ行から /country/[code] に直行する。
 */
export default async function ExplorePage() {
  const [countries, articles, residents] = await Promise.all([
    listCountriesForPicker(),
    getPublishedDbArticles(40),
    listFeaturedResidents(10),
  ]);

  const articleIds = articles.map((a) => a.id);
  const socialCounts =
    articleIds.length > 0
      ? await getArticleSocialCounts(articleIds)
      : new Map();

  const spotGuides = articles
    .filter((a) => a.articleType === 'spot_guide')
    .slice(0, 6);
  const itineraries = articles
    .filter((a) => a.articleType === 'itinerary')
    .slice(0, 6);

  // 「今週の特集記事」= cover ありの最新公開記事を 1 本選定。
  // 価格・タイプ問わず、ローカル度の高いものを優先。
  const feature =
    articles
      .filter((a) => !!a.coverImageUrl)
      .sort(
        (a, b) =>
          (b.localScoreAverage ?? 0) - (a.localScoreAverage ?? 0) ||
          new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime(),
      )[0] ?? null;

  return (
    <main className="bg-background">
      {/* ============ 1. Hero ============ */}
      <section className="border-b border-border bg-primary-500/5">
        <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="max-w-3xl">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.20em] text-primary-300">
              Locore — Local × Lore × Core
            </p>
            <h1 className="text-[32px] font-bold leading-[1.2] tracking-tight sm:text-[44px]">
              現地に住む人と、
              <br className="sm:hidden" />
              つながる旅。
            </h1>
            <p className="mt-5 text-[14px] leading-[1.85] text-foreground/70 sm:text-[15px]">
              駐在員が書く一次情報の記事、現地で直接頼めるサービス、在外邦人のコミュニティ。
              旅行者と、その街に暮らす人をつなぐ 3 つのサービスを 1 つに。
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/services"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-5 py-2.5 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
              >
                サービスを見る
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="#articles"
                className="inline-flex items-center gap-1.5 rounded-full bg-card px-5 py-2.5 text-[13px] font-semibold text-foreground/80 ring-1 ring-border transition hover:bg-muted"
              >
                記事を読む
              </Link>
              <Link
                href="/expat"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary-300 hover:underline"
              >
                駐在員の方はこちら
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {residents.length > 0 ? (
              <p className="mt-6 text-[12px] text-foreground/55">
                ✓ 現在 <span className="font-bold text-foreground/85">{residents.length} 名</span> の駐在員が現地から発信中
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* ============ 1.5 コンパクトな国チップ行 ============ */}
      {countries.length > 0 ? (
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-screen-xl px-4 py-4 sm:px-6 sm:py-5">
            <CountryChipsRow countries={countries} />
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-screen-xl space-y-14 px-4 py-12 sm:space-y-16 sm:px-6 sm:py-14">
        {/* ============ 2. 3 サービス紹介 ============ */}
        <section id="services-intro">
          <ThreeServicesIntro />
        </section>

        {/* ============ 3. 今週の特集 (1 本だけ大きく) ============ */}
        {feature ? (
          <section id="feature">
            <SectionHeader title="今週の特集" />
            <FeatureArticleHero article={feature} />
          </section>
        ) : null}

        {/* ============ 4. 駐在員ピックアップ ============ */}
        {residents.length > 0 ? (
          <section id="residents">
            <SectionHeader title="現地に住む人たち" href="/residents" />
            <ResidentAvatarStrip residents={residents} />
          </section>
        ) : null}

        {/* ============ 5. 旅程プラン (記事) ============ */}
        {itineraries.length > 0 ? (
          <section id="itinerary">
            <SectionHeader title="旅程プラン" href="/articles?type=itinerary" />
            <ArticleMagazineGrid
              articles={itineraries}
              limit={6}
              socialCounts={socialCounts}
            />
            <SectionFooterMore href="/articles?type=itinerary" />
          </section>
        ) : null}

        {/* ============ 6. スポット紹介 (記事) ============ */}
        {spotGuides.length > 0 ? (
          <section id="articles">
            <SectionHeader
              title="スポット紹介"
              href="/articles?type=spot_guide"
            />
            <ArticleMagazineGrid
              articles={spotGuides}
              limit={6}
              socialCounts={socialCounts}
            />
            <SectionFooterMore href="/articles?type=spot_guide" />
          </section>
        ) : null}

        {/* ============ 8. 駐在員ホーム導線 ============ */}
        <section className="rounded-2xl bg-primary-500/10 px-6 py-8 text-center ring-1 ring-border">
          <h2 className="text-[20px] font-bold tracking-tight">
            暮らしている方へ
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-foreground/65">
            在外邦人どうしの掲示板 / 求人 / 住居マッチング。
          </p>
          <Link
            href="/expat"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
          >
            駐在員ホーム
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>

      <FloatingMapButton />
    </main>
  );
}

function SectionFooterMore({ href }: { href: string }) {
  return (
    <div className="mt-5 flex justify-center">
      <Link
        href={href}
        aria-label="すべて見る"
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[12px] font-semibold text-foreground/80 ring-1 ring-border transition hover:bg-primary-500/10 hover:text-foreground"
      >
        すべて見る
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/**
 * Hero 直下のコンパクト国チップ行。
 * active な国を上位 8 件まで横並びにし、末尾に「すべての国を見る」リンクを置く。
 * 大きな国グリッド (CountryGridByContinent) は /explore から撤去したので、
 * 国選択の主な導線はここ + /world になる。
 */
function CountryChipsRow({
  countries,
}: {
  countries: Awaited<ReturnType<typeof listCountriesForPicker>>;
}) {
  // active=true（地域が存在する国）優先 + 名前順で上位 8 件
  const active = countries.filter((c) => c.activeRegionCount > 0);
  const others = countries.filter((c) => c.activeRegionCount === 0);
  const sorted = [
    ...active.sort((a, b) => a.nameJa.localeCompare(b.nameJa, 'ja')),
    ...others.sort((a, b) => a.nameJa.localeCompare(b.nameJa, 'ja')),
  ];
  const top = sorted.slice(0, 8);
  const total = countries.length;

  return (
    <nav aria-label="国 / 街を選ぶ" className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/45">
        国 / 街
      </span>
      {top.map((c) => (
        <Link
          key={c.code}
          href={`/country/${c.code}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background px-3 py-1.5 text-[12px] font-semibold text-foreground/80 ring-1 ring-border transition hover:bg-primary-500/10 hover:text-foreground"
        >
          {c.emoji ? <span aria-hidden>{c.emoji}</span> : null}
          {c.nameJa}
        </Link>
      ))}
      <Link
        href="/world"
        className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-500/10 px-3 py-1.5 text-[12px] font-bold text-primary-300 ring-1 ring-primary-300/40 transition hover:bg-primary-500/20"
      >
        すべての国を見る ({total})
        <ArrowRight className="h-3 w-3" />
      </Link>
    </nav>
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
