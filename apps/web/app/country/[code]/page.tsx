import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Lock, MapPin } from 'lucide-react';
import { getCountryByCode } from '@/lib/geo/countries';
import type { RegionInfo } from '@/lib/geo/countries';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';
import { listServices } from '@/lib/services/list';
import { listCommunityPosts } from '@/lib/community/db';
import { ArticleGrid } from '@/components/ArticleGrid';
import { ServiceCard } from '@/components/services/ServiceCard';
import { CountryTabNav, type CountryTabKey } from '@/components/country/CountryTabNav';
import {
  KIND_LABEL,
  KIND_BASE_PATH,
  type CommunityKind,
} from '@/lib/community/constants';
import type { CommunityPostListItem } from '@/lib/community/db';

export const revalidate = 60;

type Props = {
  params: { code: string };
  searchParams?: { tab?: string };
};

function parseTab(v: string | undefined): CountryTabKey {
  if (v === 'services' || v === 'residents') return v;
  return 'articles';
}

export async function generateMetadata({ params }: Props) {
  const country = await getCountryByCode(params.code);
  if (!country) return { title: '見つかりません' };
  return {
    title: `${country.nameJa} — Locore`,
    description: `${country.nameJa}（${country.nameEn}）の地域一覧。現地民が書いた旅の記事を、地域ごとに探せます。`,
  };
}

/**
 * 国詳細 / ドリルダウンページ。
 *
 * - 上部に国の hero 画像 + タイトル
 * - 「公開中の地域」 — クリックで /region/<slug> へ
 * - 「準備中の地域」 — 灰色で表示、CTA は Founders へ
 *
 * Coming Soon の国でもこのページに着地可能（locked カードでも一覧が見られる）。
 * 地域がまだ 1 つもない国は「準備中」メッセージのみ。
 */
/**
 * UI から完全に隠す region slug の集合。
 *
 * 「DB には残すが見せない」運用。地理的に他リージョンと被ったり、
 * 写真や記事が他で十分カバーされる地域はここに入れる。
 * 削除ではなく非表示なので、後で復活したくなれば 1 行外すだけ。
 *
 * - nice-cote-azur: Provence と被るのと、独立した記事が少ないため
 * - french-alps:    通年運用が想定外、特集として別途扱う想定
 */
const HIDDEN_REGION_SLUGS = new Set<string>([
  'nice-cote-azur',
  'french-alps',
]);

export default async function CountryPage({ params, searchParams }: Props) {
  const country = await getCountryByCode(params.code);
  if (!country) notFound();

  const tab = parseTab(searchParams?.tab);

  const visibleRegions = country.regions.filter(
    (r) => !HIDDEN_REGION_SLUGS.has(r.slug),
  );

  const activeRegions = visibleRegions.filter(
    (r) => r.isActive && r.kind !== 'other',
  );
  const otherRegion = visibleRegions.find((r) => r.kind === 'other');
  const lockedRegions = visibleRegions.filter(
    (r) => !r.isActive && r.kind !== 'other',
  );

  // tab に応じて該当データを読む。articles タブが多くの人の入口なので、
  // 他タブを開いていない場合は記事だけ読んで余計な DB I/O を避ける。
  const articlesP =
    tab === 'articles'
      ? getPublishedDbArticles(48, undefined, country.code)
      : Promise.resolve([]);
  const servicesP =
    tab === 'services'
      ? listServices({ countryCode: country.code, limit: 48 })
      : Promise.resolve({ services: [], total: 0 });
  const communityP =
    tab === 'residents'
      ? Promise.all([
          listCommunityPosts({ kind: 'apartment', countryCode: country.code, limit: 10 }),
          listCommunityPosts({ kind: 'job', countryCode: country.code, limit: 10 }),
          listCommunityPosts({ kind: 'marketplace', countryCode: country.code, limit: 10 }),
          listCommunityPosts({ kind: 'group', countryCode: country.code, limit: 10 }),
          listCommunityPosts({ kind: 'lesson', countryCode: country.code, limit: 10 }),
          listCommunityPosts({ kind: 'mutual_aid', countryCode: country.code, limit: 10 }),
        ])
      : Promise.resolve([
          [] as CommunityPostListItem[],
          [] as CommunityPostListItem[],
          [] as CommunityPostListItem[],
          [] as CommunityPostListItem[],
          [] as CommunityPostListItem[],
          [] as CommunityPostListItem[],
        ] as const);

  const [articlesForTab, servicesForTab, communityForTab] = await Promise.all([
    articlesP,
    servicesP,
    communityP,
  ]);
  const articleSocialCounts =
    articlesForTab.length > 0
      ? await getArticleSocialCounts(articlesForTab.map((a) => a.id))
      : new Map();

  return (
    <main className="bg-background">
      {/* Hero with country image */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="relative h-[260px] w-full bg-muted sm:h-[360px]">
          <Image
            src={
              country.heroImageUrl ??
              `https://picsum.photos/seed/${country.code}/1600/900`
            }
            alt={country.nameJa}
            fill
            sizes="100vw"
            priority
            className="object-cover"
            unoptimized
          />
          {/* 写真全体にフラット tint + 加工なしの白文字 */}
          <div aria-hidden className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-screen-xl px-4 pb-6 sm:px-6 sm:pb-10">
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-3 py-1 text-[11px] font-medium text-foreground/75 backdrop-blur hover:bg-card"
              style={{ textShadow: 'none' }}
            >
              <ArrowLeft className="h-3 w-3" />
              世界ピッカーに戻る
            </Link>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-300">
              {country.nameEn}
            </p>
            <h1
              className="!text-white mt-1 text-[36px] font-bold leading-tight tracking-tight sm:text-[48px]"
            >
              {country.nameJa}
            </h1>
            {country.shortDescription ? (
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/90 sm:text-[14px]">
                {country.shortDescription}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-screen-xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
        {/* 国内コンテンツの 3 タブ (記事 / サービス / コミュニティ) */}
        <section aria-label={`${country.nameJa}のコンテンツ`}>
          <CountryTabNav active={tab} />
          <div className="mt-5">
            {tab === 'articles' ? (
              articlesForTab.length > 0 ? (
                <ArticleGrid
                  articles={articlesForTab}
                  socialCounts={articleSocialCounts}
                />
              ) : (
                <EmptyTabState
                  title="この国の記事はまだありません"
                  hint="駐在員が増えると、街ごとの記事が公開されていきます。"
                />
              )
            ) : null}

            {tab === 'services' ? (
              servicesForTab.services.length > 0 ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {servicesForTab.services.map((s) => (
                    <li key={s.id} className="h-full">
                      <ServiceCard service={s} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyTabState
                  title="この国のサービスはまだありません"
                  hint="駐在員が出品を始めると、ここに表示されます。"
                />
              )
            ) : null}

            {tab === 'residents' ? (
              <CommunityTabContent
                countryCode={country.code}
                groups={communityForTab}
              />
            ) : null}
          </div>
        </section>

        {/* Active regions — もう少し小さめのグリッドで密度を上げる */}
        {activeRegions.length > 0 ? (
          <section>
            <SectionHeader
              title="公開中"
              count={activeRegions.length}
            />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {activeRegions.map((r) => (
                <li key={r.id}>
                  <RegionCard region={r} variant="active" />
                </li>
              ))}
              {otherRegion && otherRegion.isActive ? (
                <li>
                  <RegionCard region={otherRegion} variant="other" />
                </li>
              ) : null}
            </ul>
          </section>
        ) : (
          <section className="rounded-2xl bg-card p-10 text-center ring-1 ring-border">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground/55">
              <Lock className="h-3 w-3" />
              準備中
            </p>
            <h2
              className="mt-3 text-[24px] font-bold tracking-tight"
            >
              {country.nameJa}は、もうすぐ
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.9] text-foreground/70">
              この国に住んでいて、街のことを書いてみたい方を探しています。
              ペースを焦らず、書き手が育ったタイミングで地域ごとに開けていきます。
            </p>
            <Link
              href="/founders"
              className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 hover:bg-primary-300"
            >
              Founders 枠を見る
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}

        {/* Locked regions（active 国でも未公開の地方を見せる）*/}
        {lockedRegions.length > 0 ? (
          <section>
            <SectionHeader
              title="準備中"
              count={lockedRegions.length}
            />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {lockedRegions.map((r) => (
                <li key={r.id}>
                  <RegionCard region={r} variant="locked" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function EmptyTabState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[12px] text-foreground/60">{hint}</p>
    </div>
  );
}

function CommunityTabContent({
  countryCode,
  groups,
}: {
  countryCode: string;
  groups: readonly [
    CommunityPostListItem[],
    CommunityPostListItem[],
    CommunityPostListItem[],
    CommunityPostListItem[],
    CommunityPostListItem[],
    CommunityPostListItem[],
  ];
}) {
  const order: CommunityKind[] = [
    'apartment',
    'marketplace',
    'job',
    'group',
    'lesson',
    'mutual_aid',
  ];
  const sections = order.map((kind, idx) => ({
    kind,
    posts: groups[idx] ?? [],
  }));
  const hasAny = sections.some((s) => s.posts.length > 0);
  if (!hasAny) {
    return (
      <EmptyTabState
        title="この国のコミュニティ投稿はまだありません"
        hint="駐在員が増えると住居・求人・売買などの投稿が集まってきます。"
      />
    );
  }
  // 軽量にサマリーだけ。kind 別に件数 + 直近 1 件のタイトル + 一覧へのリンク。
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map(({ kind, posts }) => {
        const top = posts[0];
        return (
          <li
            key={kind}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[14px] font-bold text-foreground">
                {KIND_LABEL[kind]}
                <span className="ml-1.5 text-[11px] font-semibold text-foreground/45">
                  ({posts.length})
                </span>
              </h3>
              <Link
                href={`${KIND_BASE_PATH[kind]}?country=${countryCode}`}
                className="text-[11px] font-semibold text-primary-300 hover:underline"
              >
                すべて見る →
              </Link>
            </div>
            {top ? (
              <p className="mt-2 line-clamp-2 text-[12px] text-foreground/70">
                {top.title}
              </p>
            ) : (
              <p className="mt-2 text-[12px] text-foreground/45">
                投稿はまだありません
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count?: number;
}) {
  return (
    <header className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-[20px] font-bold leading-tight tracking-tight sm:text-[24px]">
        {title}
      </h2>
      {typeof count === 'number' ? (
        <span className="text-[11px] text-foreground/45 tabular">{count}</span>
      ) : null}
    </header>
  );
}

function RegionCard({
  region,
  variant,
}: {
  region: RegionInfo;
  variant: 'active' | 'locked' | 'other';
}) {
  const locked = variant === 'locked';
  const isOther = variant === 'other';

  const inner = (
    <div
      className={
        'group relative h-full overflow-hidden rounded-xl ring-1 transition ' +
        (locked
          ? 'cursor-not-allowed bg-neutral-100 opacity-70 ring-border'
          : 'bg-card ring-border hover:shadow-md hover:ring-primary-300')
      }
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          src={
            region.heroImageUrl ??
            `https://picsum.photos/seed/${region.slug}/1000/800`
          }
          alt={region.nameJa}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className={
            'object-cover transition duration-500 ' +
            (locked ? 'grayscale' : 'group-hover:scale-[1.04]')
          }
          unoptimized
        />
        {locked ? (
          <div aria-hidden className="absolute inset-0 bg-neutral-100/45" />
        ) : null}
        {/* 写真全体にフラットな薄暗 tint。gradient 無し、上下分割無し。
            重要: h3 等の見出しは globals.css で color: neutral-900 が
            直接指定されているため、親の text-white は継承で勝てない。
            h3 自体に !text-white (Tailwind important modifier) を当てて
            上書きする。 */}
        <div
          aria-hidden
          className={'absolute inset-0 ' + (locked ? 'bg-black/45' : 'bg-black/30')}
        />
        {locked ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-neutral-50/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/55 backdrop-blur">
            <Lock className="h-2.5 w-2.5" />
            準備中
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 px-3 py-3 text-white">
          <h3
            className="!text-white truncate text-[14px] font-bold leading-tight tracking-tight sm:text-[15px]"
          >
            {region.nameJa}
          </h3>
          {!locked ? (
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-white/95">
              <MapPin className="h-2.5 w-2.5" />
              {isOther ? 'その他のエリア' : '記事を見る'}
              <ArrowRight className="h-2.5 w-2.5" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (locked) {
    return (
      <div aria-disabled title="準備中" className="block h-full">
        {inner}
      </div>
    );
  }
  return (
    <Link href={`/region/${region.slug}`} className="block h-full">
      {inner}
    </Link>
  );
}
