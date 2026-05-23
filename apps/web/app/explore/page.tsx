import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Users,
} from 'lucide-react';
import { CountryGridByContinent } from '@/components/CountryGridByContinent';
import { ArticleScrollSection } from '@/components/ArticleScrollSection';
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
 * 2026-05 再設計: 「他の旅行メディアと何が違うか」を 1 スクロールで伝える構成。
 *   1. Hero  — 「現地に住む人と、つながる旅。」 + 主要 CTA
 *   2. 3 サービス紹介 (ロコア トラベル / サービス / コミュニティ)
 *   3. 今週の特集記事 (雑誌表紙風、1 本だけ大きく)
 *   4. 駐在員ピックアップ — 顔出しカルーセル (差別化の核)
 *   5. 旅程プラン (記事カルーセル)
 *   6. スポット紹介 (記事カルーセル)
 *   7. 行き先 (国グリッド)
 *   8. 駐在員ホーム導線
 *
 * 「人」と「3 サービス」を上に厚く出して、コンテンツは下に。
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
    .slice(0, 10);
  const itineraries = articles
    .filter((a) => a.articleType === 'itinerary')
    .slice(0, 10);

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
            <ArticleScrollSection
              articles={itineraries}
              moreHref="/articles?type=itinerary"
              socialCounts={socialCounts}
            />
          </section>
        ) : null}

        {/* ============ 6. スポット紹介 (記事) ============ */}
        {spotGuides.length > 0 ? (
          <section id="articles">
            <SectionHeader
              title="スポット紹介"
              href="/articles?type=spot_guide"
            />
            <ArticleScrollSection
              articles={spotGuides}
              moreHref="/articles?type=spot_guide"
              socialCounts={socialCounts}
            />
          </section>
        ) : null}

        {/* ============ 7. 行き先 (国グリッド) ============ */}
        <section id="destinations">
          <SectionHeader title="行き先" />
          <CountryGridByContinent countries={countries} />
        </section>

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
