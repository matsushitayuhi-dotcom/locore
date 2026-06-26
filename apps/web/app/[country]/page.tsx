import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  Newspaper,
  Sparkles,
  Users,
  MapPin,
} from 'lucide-react';
import { ArticleScrollSection } from '@/components/ArticleScrollSection';
import { ServiceCarousel } from '@/components/services/ServiceCarousel';
import { CommunityCard } from '@/components/community/CommunityCard';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';
import { getFeaturedServices } from '@/lib/services/featured';
import { listCommunityPosts } from '@/lib/community/db';
import { getCountryBySlug, SUPPORTED_COUNTRY_SLUGS } from '@/lib/geo/countrySlug';
import { KIND_BASE_PATH } from '@/lib/community/constants';
import { TAG_LABEL } from '@/lib/services/tagLabels';

export const revalidate = 300;

export function generateStaticParams() {
  return SUPPORTED_COUNTRY_SLUGS.map((country) => ({ country }));
}

type Props = { params: { country: string } };

export async function generateMetadata({ params }: Props) {
  const country = await getCountryBySlug(params.country);
  if (!country) return { title: '見つかりません — Locore' };
  return {
    title: `${country.nameJa} — Locore`,
    description: `${country.nameJa}（${country.nameEn}）の暮らしを、現地に住む人の一次情報で。記事・サービス・コミュニティをまとめて。`,
  };
}

/** 国別ランディングのヒーロー背景（当面はパリ＝フランス固定）。 */
const HERO_BG =
  "url('https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1700&q=78')";

/**
 * 国別ランディング (/[country])。例: /france
 *
 * 上から:
 *   1. フルブリードのヒーロー（国名 + 記事 / サービス / コミュニティへの導線チップ）
 *   2. 記事       — Pickup 1 本 + カルーセル + 「すべて見る」
 *   3. サービス   — Pickup 1 件 + カルーセル + 「すべて見る」
 *   4. コミュニティ — Pickup 1 投稿 + カルーセル + 「すべて見る」
 *
 * 各セクションのデータは国コードで絞り込む（記事=countryCode, サービス=countryCode,
 * コミュニティ=city→country サブクエリ）。静的レンダリング (revalidate=300)。
 */
export default async function CountryLandingPage({ params }: Props) {
  const country = await getCountryBySlug(params.country);
  if (!country) notFound();

  const base = `/${params.country}`;

  const [articles, services, jobPosts, apartmentPosts, marketplacePosts] =
    await Promise.all([
      getPublishedDbArticles(13, undefined, country.code),
      getFeaturedServices({
        audience: 'resident',
        limit: 13,
        countryCode: country.code,
      }),
      listCommunityPosts({ kind: 'job', limit: 6, countryCode: country.code }),
      listCommunityPosts({
        kind: 'apartment',
        limit: 6,
        countryCode: country.code,
      }),
      listCommunityPosts({
        kind: 'marketplace',
        limit: 6,
        countryCode: country.code,
      }),
    ]);

  // コミュニティは複数カテゴリを新着順にマージして 1 本のカルーセルに。
  const communityPosts = [...jobPosts, ...apartmentPosts, ...marketplacePosts]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 10);

  const socialCounts = await getArticleSocialCounts(articles.map((a) => a.id));

  const pickupArticle = articles[0];
  const restArticles = articles.slice(1);
  const pickupService = services[0];
  const restServices = services.slice(1);
  const pickupServiceTag = pickupService?.tags[0];
  const pickupPost = communityPosts[0];
  const restPosts = communityPosts.slice(1);

  const nav = [
    { href: `${base}/articles`, label: '記事', icon: Newspaper },
    { href: `${base}/services`, label: 'サービス', icon: Sparkles },
    { href: `${base}/community`, label: 'コミュニティ', icon: Users },
  ];

  return (
    <main className="bg-background">
      {/* 1. ヒーロー */}
      <header className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: HERO_BG }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-950/55 via-neutral-950/45 to-neutral-950/75"
        />
        <div className="mx-auto max-w-screen-xl px-4 pb-10 pt-16 sm:px-6 sm:pb-14 sm:pt-24">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary-300">
            {country.nameEn}
          </p>
          <h1 className="mt-3 text-[32px] font-bold leading-[1.12] tracking-tight text-white sm:text-[46px]">
            {country.nameJa}の暮らしを、
            <br className="hidden sm:block" />
            現地の人の言葉で。
          </h1>
          <p className="mt-4 max-w-xl text-[13px] leading-[1.9] text-white/80 sm:text-[15px]">
            ガイドブックにない一次情報。{country.nameJa}に住む人が書く記事、
            現地で頼れるサービス、同じ街の人とつながる掲示板を、ここにまとめました。
          </p>

          {/* 導線チップ */}
          <nav
            aria-label={`${country.nameJa}のセクション`}
            className="mt-7 flex flex-wrap gap-2.5"
          >
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-[13px] font-bold text-neutral-900 shadow-sm ring-1 ring-white/30 transition hover:bg-primary-500 hover:text-neutral-950"
              >
                <Icon className="h-4 w-4 text-primary-700 transition group-hover:text-neutral-950" />
                {label}
                <ArrowRight className="h-3.5 w-3.5 -translate-x-0.5 opacity-60 transition group-hover:translate-x-0 group-hover:opacity-100" />
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-screen-xl space-y-12 px-4 py-10 sm:space-y-16 sm:px-6 sm:py-14">
        {/* 2. 記事 */}
        <Section
          label="記事"
          title={`${country.nameJa}の暮らしを読む`}
          allHref={`${base}/articles`}
        >
          {pickupArticle ? (
            <PickupCard
              href={`/articles/${pickupArticle.id}`}
              image={pickupArticle.coverImageUrl}
              eyebrow="Pickup 記事"
              title={pickupArticle.title}
              meta={
                <>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {pickupArticle.area || country.nameJa}
                  </span>
                  {pickupArticle.writerName ? (
                    <span>by {pickupArticle.writerName}</span>
                  ) : null}
                </>
              }
            />
          ) : null}
          {restArticles.length > 0 ? (
            <ArticleScrollSection
              articles={restArticles}
              moreHref={`${base}/articles`}
              socialCounts={socialCounts}
            />
          ) : pickupArticle ? null : (
            <EmptyNote>まだ記事がありません。</EmptyNote>
          )}
        </Section>

        {/* 3. サービス */}
        <Section
          label="サービス"
          title={`${country.nameJa}で頼れる人`}
          allHref={`${base}/services`}
        >
          {pickupService ? (
            <PickupCard
              href={`/residents/${pickupService.ownerId}`}
              image={pickupService.coverImageUrl}
              eyebrow="Pickup サービス"
              title={pickupService.title}
              meta={
                <>
                  <span>{pickupService.ownerDisplayName}</span>
                  {pickupService.cityNameJa ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {pickupService.cityNameJa}
                    </span>
                  ) : null}
                  {pickupServiceTag ? (
                    <span className="rounded-full bg-primary-500/15 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                      {TAG_LABEL[pickupServiceTag] ?? pickupServiceTag}
                    </span>
                  ) : null}
                </>
              }
            />
          ) : null}
          {restServices.length > 0 ? (
            <ServiceCarousel services={restServices} />
          ) : pickupService ? null : (
            <EmptyNote>まだサービスがありません。</EmptyNote>
          )}
        </Section>

        {/* 4. コミュニティ */}
        <Section
          label="コミュニティ"
          title={`${country.nameJa}の掲示板`}
          allHref={`${base}/community`}
        >
          {pickupPost ? (
            <PickupCard
              href={`${KIND_BASE_PATH[pickupPost.kind]}/${pickupPost.id}`}
              image={pickupPost.photos[0] ?? null}
              eyebrow="Pickup 投稿"
              title={pickupPost.title}
              meta={
                pickupPost.locationText ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {pickupPost.locationText}
                  </span>
                ) : null
              }
            />
          ) : null}
          {restPosts.length > 0 ? (
            <ul
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollSnapStop: 'always' }}
            >
              {restPosts.map((p) => (
                <li
                  key={p.id}
                  className="w-[62%] shrink-0 snap-start sm:w-[32%] lg:w-[23%]"
                >
                  <CommunityCard post={p} showKindBadge />
                </li>
              ))}
              <li className="flex w-[62%] shrink-0 snap-start items-center justify-center rounded-xl bg-card text-center ring-1 ring-dashed ring-border sm:w-[32%] lg:w-[23%]">
                <Link
                  href={`${base}/community`}
                  aria-label="コミュニティをすべて見る"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full text-primary-700 hover:bg-primary-500/10"
                >
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </li>
            </ul>
          ) : pickupPost ? null : (
            <EmptyNote>まだ投稿がありません。</EmptyNote>
          )}
        </Section>
      </div>
    </main>
  );
}

/* ---------- セクション共通の見た目 ---------- */

function Section({
  label,
  title,
  allHref,
  children,
}: {
  label: string;
  title: string;
  allHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700">
            {label}
          </p>
          <h2 className="mt-1 text-[20px] font-bold tracking-tight sm:text-[26px]">
            {title}
          </h2>
        </div>
        <Link
          href={allHref}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-3.5 py-2 text-[12px] font-semibold text-foreground ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
        >
          すべて見る
          <ArrowUpRight className="h-3.5 w-3.5 text-primary-700" />
        </Link>
      </div>
      {children}
    </section>
  );
}

/** 各セクション先頭の大きな Pickup カード（写真左 / テキスト右）。 */
function PickupCard({
  href,
  image,
  eyebrow,
  title,
  meta,
}: {
  href: string;
  image: string | null;
  eyebrow: string;
  title: string;
  meta?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group grid overflow-hidden rounded-3xl bg-card ring-1 ring-border transition hover:ring-primary-300 sm:grid-cols-[1.25fr_1fr]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted sm:aspect-auto sm:min-h-[260px]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-500/10 text-primary-700">
            <Sparkles className="h-10 w-10" aria-hidden />
          </div>
        )}
        <span className="absolute left-4 top-4 rounded-full bg-primary-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-950 shadow-sm">
          {eyebrow}
        </span>
      </div>
      <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
        <h3 className="text-[20px] font-bold leading-snug tracking-tight sm:text-[24px]">
          {title}
        </h3>
        {meta ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] font-medium text-foreground/65">
            {meta}
          </div>
        ) : null}
        <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary-700">
          詳しく見る
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-[13px] text-foreground/55">
      {children}
    </div>
  );
}
