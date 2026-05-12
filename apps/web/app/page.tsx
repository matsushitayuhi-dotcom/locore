import Link from 'next/link';
import { Button } from '@locore/ui';
import { ArrowRight } from 'lucide-react';
import { CrisisBanner } from '../components/CrisisBanner';
import { SearchBox } from '../components/SearchBox';
import { BoardWidget } from '../components/BoardWidget';
import { ArticleScrollSection } from '../components/ArticleScrollSection';
import { getPublishedDbArticles } from '../lib/articles/published';
import { listCrisisEvents } from '../lib/crisis/db';
import { listBoardPosts } from '../lib/board/db';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';

export const dynamic = 'force-dynamic';

/**
 * ホームページ。
 *
 * 構成（新しい順）:
 *   1. 検索ボックス（タイトル / 本文トグル付き）
 *   2. 新着ニュース（掲示板の最新 10 件）
 *   3. スポット紹介 — 10 件、モバイル横スクロール、続きを見る → /articles?type=spot_guide
 *   4. 旅程プラン — 10 件、同上 → /articles?type=itinerary
 *   5. Founders 枠バナー
 *
 * 旧ヒーロ（「その土地の本当の物語…」）と長文説明は削除。
 * サービス概要は SideMenu → /about-service に移動。
 */
export default async function HomePage() {
  const [articles, crises, boardPosts] = await Promise.all([
    getPublishedDbArticles(60),
    listCrisisEvents(20),
    listBoardPosts(10),
  ]);
  const socialCounts = await getArticleSocialCounts(articles.map((a) => a.id));

  const seriousCrisis = crises.find((e) => e.severity >= 3);

  const spotArticles = articles.filter((a) => a.articleType === 'spot_guide');
  const itineraryArticles = articles.filter(
    (a) => a.articleType === 'itinerary',
  );

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl space-y-10 px-4 pt-8 pb-10 sm:space-y-12 sm:px-6 sm:pt-12">
        {/* 1. 検索ボックス */}
        <section aria-label="記事検索">
          <SearchBox />
        </section>

        {/* 危機情報（severity >= 3）*/}
        {seriousCrisis ? (
          <section>
            <CrisisBanner event={seriousCrisis} />
          </section>
        ) : null}

        {/* 2. 新着ニュース（掲示板）*/}
        <section>
          <SectionHeader
            kicker="新着ニュース"
            title="パリ・今日明日にあること"
            subtitle="マルシェ・展覧会・地元イベント。AI が毎朝公開情報からまとめます。"
            href="/board"
          />
          <BoardWidget posts={boardPosts} />
        </section>

        {/* 3. スポット紹介（横スクロール 10 件） */}
        <section id="spot-guide">
          <SectionHeader
            kicker="スポット紹介"
            title="1 地点を深く知る"
            subtitle="現地民が「ここはハマりますよ」と教える単独スポット。"
            href="/articles?type=spot_guide"
          />
          <ArticleScrollSection
            articles={spotArticles}
            moreHref="/articles?type=spot_guide"
            socialCounts={socialCounts}
          />
        </section>

        {/* 4. 旅程プラン（横スクロール 10 件） */}
        <section id="itinerary">
          <SectionHeader
            kicker="旅程プラン"
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

        {/* 5. Founders 枠 */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500/15 via-card to-card p-8 shadow-sm ring-1 ring-border sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary-500/20 blur-3xl"
          />
          <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full bg-primary-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-950">
                Founders 枠（先着 50 人）
              </p>
              <h2 className="mt-3 text-[24px] font-bold leading-[1.25] tracking-tight text-foreground sm:text-[28px]">
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
