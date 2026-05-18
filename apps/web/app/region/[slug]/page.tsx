import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { SearchBox } from '@/components/SearchBox';
import { BoardWidget } from '@/components/BoardWidget';
import { ArticleScrollSection } from '@/components/ArticleScrollSection';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { listBoardPosts } from '@/lib/board/db';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';
import { getRegionBySlug } from '@/lib/geo/countries';
import { getRegionsWithContent } from '@/lib/geo/region-content';

/**
 * UI から完全に隠す region slug。/country/[code] と同じ集合を共有したい
 * ところだが、export 制約と循環依存を避けるためにこちらでも複製。
 * 2 箇所しか無いので運用上は問題ない。
 */
const HIDDEN_REGION_SLUGS = new Set<string>([
  'nice-cote-azur',
  'french-alps',
]);

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const region = await getRegionBySlug(params.slug);
  if (!region) return { title: '見つかりません' };
  return {
    title: `${region.countryNameJa}・${region.nameJa} — Locore`,
    description: `${region.countryNameJa}・${region.nameJa} の現地民が書いた旅の記事と新着ニュース。`,
  };
}

/**
 * 地域ホーム /region/[slug]。
 *
 * 構成（旧 / と同じ）:
 *   1. 検索ボックス（タイトル / 本文トグル付き、検索対象は全地域共通）
 *   2. 新着ニュース（地域非依存の掲示板。後でリージョン別に拡張予定）
 *   3. スポット紹介 — 10 件、横スクロール、続きを見る → /articles?region=&type=
 *   4. 旅程プラン — 同上
 *
 * 地域がロック中（is_active=false）の場合は Coming Soon 画面を出して、
 * 記事一覧は出さない。
 */
export default async function RegionHomePage({ params }: Props) {
  // 完全非表示の region は 404 として扱う (Coming Soon すら出さない)
  if (HIDDEN_REGION_SLUGS.has(params.slug)) notFound();

  const region = await getRegionBySlug(params.slug);
  if (!region) notFound();

  // 非アクティブ地域、または記事 / コミュニティ投稿が一切ない地域は
  // Coming Soon 画面に飛ばす。「空っぽの地域ホーム」を見せると
  // 「Locore、この街では何もない」と勘違いされるため。
  const slugsWithContent = await getRegionsWithContent();
  const hasContent = slugsWithContent.has(region.slug);

  if (!region.isActive || !hasContent) {
    return (
      <main className="mx-auto max-w-screen-md px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          世界マップに戻る
        </Link>

        <div className="mt-8 rounded-3xl bg-card p-10 text-center ring-1 ring-border">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground/55">
            <Lock className="h-3 w-3" />
            Coming Soon
          </p>
          <h1
            className="mt-3 text-[28px] font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
            }}
          >
            {region.countryNameJa}・{region.nameJa}
          </h1>
          <p className="mt-3 text-[14px] leading-[1.9] text-foreground/70">
            この街で書ける人を、いま探しています。
            <br />
            {region.nameJa} に 1 年以上住んでいて、文章で街のことを伝えたい方は、
            Founders 枠から声をかけてください。
          </p>
          <Link
            href="/founders"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 hover:bg-primary-300"
          >
            Founders 枠を見る
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>
    );
  }

  // 掲示板は現在 Paris のみで運用 (記事と異なり地域フィルタを仕込んでない)。
  // それ以外の region では Coming Soon プレースホルダで意図を示す。
  // ボルドー / ニース等で掲示板を本格運用するときに hasBoard を拡張する。
  const hasBoard = region.slug === 'paris';

  const [articles, boardPosts] = await Promise.all([
    getPublishedDbArticles(60, region.slug),
    hasBoard ? listBoardPosts(10) : Promise.resolve([]),
  ]);
  const socialCounts = await getArticleSocialCounts(articles.map((a) => a.id));

  const spotArticles = articles.filter((a) => a.articleType === 'spot_guide');
  const itineraryArticles = articles.filter(
    (a) => a.articleType === 'itinerary',
  );

  const moreSpot = `/articles?type=spot_guide&region=${region.slug}`;
  const moreItinerary = `/articles?type=itinerary&region=${region.slug}`;

  return (
    <main className="bg-background">
      {/*
        Hero band。region.heroImageUrl (cities.hero_image_url) を背景に、
        パンくず + 地域名を白文字で配置。下端に向けたグラデと text-shadow で
        明るい画像でも可読性を確保。
      */}
      {region.heroImageUrl ? (
        <section className="relative overflow-hidden border-b border-border">
          <div className="relative h-[200px] w-full bg-muted sm:h-[280px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={region.heroImageUrl}
              alt={region.nameJa}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* 写真の下端だけにふんわり dark gradient + 軽い text-shadow */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
            />
            <div
              className="relative z-10 mx-auto flex h-full max-w-screen-xl flex-col justify-end px-4 pb-5 sm:px-6 sm:pb-7"
              style={{
                textShadow:
                  '0 0 10px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,1), 0 0 24px rgba(0,0,0,0.55)',
              }}
            >
              <nav className="text-[11px] text-white/85">
                <Link href="/" className="hover:underline">
                  世界
                </Link>
                <span className="mx-1.5 text-white/45">›</span>
                <span className="text-white/85">{region.countryNameJa}</span>
                <span className="mx-1.5 text-white/45">›</span>
                <span className="font-semibold text-white">{region.nameJa}</span>
              </nav>
              <h1
                className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[36px]"
                style={{
                  fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
                  textShadow: '0 2px 16px rgba(0,0,0,0.65)',
                }}
              >
                {region.nameJa}
              </h1>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-screen-xl space-y-10 px-4 pt-6 pb-10 sm:space-y-12 sm:px-6 sm:pt-8">
        {/* hero 画像がない場合 (legacy 地域 等) はテキストのみのヘッダーを出す */}
        {!region.heroImageUrl ? (
          <header>
            <nav className="text-[11px] text-foreground/55">
              <Link href="/" className="hover:underline">
                世界
              </Link>
              <span className="mx-1.5 text-foreground/30">›</span>
              <span className="text-foreground/75">{region.countryNameJa}</span>
              <span className="mx-1.5 text-foreground/30">›</span>
              <span className="font-semibold text-foreground">{region.nameJa}</span>
            </nav>
            <h1
              className="mt-2 text-[28px] font-bold leading-tight tracking-tight sm:text-[36px]"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              {region.nameJa}
            </h1>
          </header>
        ) : null}

        {/* 1. 検索 */}
        <section aria-label="記事検索">
          <SearchBox />
        </section>

        {/* 2. 新着ニュース */}
        <section>
          <SectionHeader
            kicker="新着ニュース"
            title={`${region.nameJa} の、今日と明日`}
            subtitle="マルシェ、突然始まった工事、見ておいて損のない展覧会。書き手と編集チームが現地時間に合わせて毎朝更新します。"
            href={hasBoard ? '/board' : undefined}
          />
          {hasBoard ? (
            <BoardWidget posts={boardPosts} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center sm:p-10">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
                <Lock className="h-3 w-3" />
                Coming Soon
              </p>
              <p className="mt-3 text-[13px] leading-[1.85] text-foreground/70">
                {region.nameJa} の新着ニュースは準備中です。
                <br className="hidden sm:inline" />
                編集チームと現地の書き手が揃い次第、ここに毎朝の情報を載せていきます。
              </p>
              <p className="mt-2 text-[11px] text-foreground/45">
                記事とスポット紹介は下にすでに公開されています。
              </p>
            </div>
          )}
        </section>

        {/* 3. スポット紹介 */}
        <section id="spot-guide">
          <SectionHeader
            kicker="スポット紹介"
            title="一軒の店、一本の坂道。"
            subtitle="観光地ではなく、書き手が時間をかけて何度も通った場所だけを取り上げます。"
            href={moreSpot}
          />
          <ArticleScrollSection
            articles={spotArticles}
            moreHref={moreSpot}
            socialCounts={socialCounts}
          />
        </section>

        {/* 4. 旅程プラン */}
        <section id="itinerary">
          <SectionHeader
            kicker="旅程プラン"
            title="現地民の半日、1 日の歩き方"
            subtitle="移動時間、混みやすい時間帯、ちょっとした注意点まで添えた、そのまま辿れるルート。"
            href={moreItinerary}
          />
          <ArticleScrollSection
            articles={itineraryArticles}
            moreHref={moreItinerary}
            socialCounts={socialCounts}
          />
        </section>

        {/* Founders は駐在員ページ (/expat) のみで表示する方針 — region home からは削除 */}
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
