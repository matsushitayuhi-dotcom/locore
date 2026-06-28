import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  CountryShelves,
  type ShelfData,
  type ShelfCard,
} from '@/components/country/CountryShelves';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getFeaturedServices } from '@/lib/services/featured';
import { listBoardPosts } from '@/lib/board/db';
import { listCommunityPosts, type CommunityPostListItem } from '@/lib/community/db';
import { getCountryBySlug, SUPPORTED_COUNTRY_SLUGS } from '@/lib/geo/countrySlug';
import {
  KIND_LABEL,
  APARTMENT_LISTING_TYPE_LABEL,
  JOB_CATEGORY_LABEL,
  MARKETPLACE_CATEGORY_LABEL,
  type CommunityKind,
} from '@/lib/community/constants';
import { tagLabel } from '@/lib/services/tagLabels';
import { BOARD_CATEGORY_LABEL } from '@/lib/board/constants';

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
    description: `${country.nameJa}（${country.nameEn}）の暮らしを、現地に住む人の一次情報で。住居・求人・売買・記事・サービスをカテゴリごとにまとめて。`,
  };
}

const HERO_BG =
  "url('https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1700&q=78')";

/** 各棚あたりの取得件数 */
const SHELF_LIMIT = 10;

/* ---------- カード変換ヘルパー ---------- */

/** コミュニティ投稿 → カード。価格や種別バッジを kind に応じて出し分ける。 */
function communityCard(
  p: CommunityPostListItem,
  basePath: string,
): ShelfCard {
  const meta = p.locationText ?? null;
  return {
    id: p.id,
    href: `${basePath}/${p.id}`,
    title: p.title,
    image: p.photos[0] ?? null,
    meta,
    badge: communityBadge(p),
  };
}

/** コミュニティ投稿のバッジ（種別ごとに metadata からカテゴリ等を拾う）。 */
function communityBadge(p: CommunityPostListItem): string | null {
  const m = p.metadata as Record<string, unknown>;
  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.length > 0 ? v : null;
  switch (p.kind) {
    case 'apartment': {
      const t = str(m.listing_type);
      return (
        (t &&
          APARTMENT_LISTING_TYPE_LABEL[
            t as keyof typeof APARTMENT_LISTING_TYPE_LABEL
          ]) ||
        KIND_LABEL.apartment
      );
    }
    case 'job': {
      const c = str(m.category);
      return (
        (c && JOB_CATEGORY_LABEL[c as keyof typeof JOB_CATEGORY_LABEL]) ||
        KIND_LABEL.job
      );
    }
    case 'marketplace': {
      const c = str(m.category);
      return (
        (c &&
          MARKETPLACE_CATEGORY_LABEL[
            c as keyof typeof MARKETPLACE_CATEGORY_LABEL
          ]) ||
        KIND_LABEL.marketplace
      );
    }
    case 'group':
      return KIND_LABEL.group;
    case 'lesson':
      return KIND_LABEL.lesson;
    case 'mutual_aid':
      return KIND_LABEL.mutual_aid;
    default:
      return null;
  }
}

/**
 * 国ハブ (/[country])。例: /france
 *
 * カテゴリごとの横スクロール棚（/services と同じデザイン）で構成する。
 * 棚の順番:
 *   新着・イベント → 住居 → 求人 → 売買 → 集まり → 習う → 助け → 記事 → サービス
 *
 * 各「すべて見る」は各カテゴリのグローバル一覧をその国でフィルタした URL
 * （/apartments?country=fr 等）へ遷移する。
 */
export default async function CountryHubPage({ params }: Props) {
  const country = await getCountryBySlug(params.country);
  if (!country) notFound();

  const code = country.code;

  // 各カテゴリのデータをまとめて取得（コミュニティ各 kind は国コードで絞り込み）。
  const [
    boardPosts,
    apartments,
    jobs,
    marketplace,
    groups,
    lessons,
    mutualAid,
    articles,
    services,
  ] = await Promise.all([
    listBoardPosts({ limit: 24 }),
    listCommunityPosts({ kind: 'apartment', limit: SHELF_LIMIT, countryCode: code }),
    listCommunityPosts({ kind: 'job', limit: SHELF_LIMIT, countryCode: code }),
    listCommunityPosts({ kind: 'marketplace', limit: SHELF_LIMIT, countryCode: code }),
    listCommunityPosts({ kind: 'group', limit: SHELF_LIMIT, countryCode: code }),
    listCommunityPosts({ kind: 'lesson', limit: SHELF_LIMIT, countryCode: code }),
    listCommunityPosts({ kind: 'mutual_aid', limit: SHELF_LIMIT, countryCode: code }),
    getPublishedDbArticles(SHELF_LIMIT, undefined, code),
    getFeaturedServices({ audience: 'resident', limit: SHELF_LIMIT, countryCode: code }),
  ]);

  // 新着・イベント棚: 掲示板の新着 + 近日イベントを新しい順でまとめる。
  // board posts は国非依存（当面フランスのみ運用）。イベントは日付を持つもの。
  const newsCards: ShelfData['cards'] = boardPosts.slice(0, SHELF_LIMIT).map((b) => {
    const d = b.eventStartDate ?? b.eventDate;
    const dt = d ? new Date(d) : null;
    const dateLabel =
      dt && !Number.isNaN(dt.getTime())
        ? `${dt.getMonth() + 1}/${dt.getDate()}`
        : null;
    const catLabel =
      BOARD_CATEGORY_LABEL[b.category as keyof typeof BOARD_CATEGORY_LABEL] ??
      null;
    return {
      id: b.id,
      href: `/board/${b.id}`,
      title: b.title,
      image: null,
      meta: b.eventLocation ?? null,
      badge: catLabel,
      dateLabel,
    };
  });

  // 棚の組み立て（件数0の棚は出さない）。順番は仕様どおり厳守。
  const shelves: ShelfData[] = [];

  if (newsCards.length > 0) {
    shelves.push({
      key: 'news',
      cardKind: 'news',
      title: '新着・イベント',
      sub: 'News & Events',
      allHref: `/board?country=${code}`,
      cards: newsCards,
    });
  }

  const pushCommunity = (
    key: string,
    kind: CommunityKind,
    title: string,
    sub: string,
    basePath: string,
    allHref: string,
    posts: CommunityPostListItem[],
  ) => {
    if (posts.length === 0) return;
    shelves.push({
      key,
      cardKind: 'community',
      title,
      sub,
      allHref,
      cards: posts.map((p) => communityCard(p, basePath)),
    });
  };

  pushCommunity('apartment', 'apartment', 'アパート（住居）', 'Apartments', '/apartments', `/apartments?country=${code}`, apartments);
  pushCommunity('job', 'job', '求人', 'Jobs', '/jobs', `/jobs?country=${code}`, jobs);
  pushCommunity('marketplace', 'marketplace', '売買', 'Marketplace', '/marketplace', `/marketplace?country=${code}`, marketplace);
  pushCommunity('group', 'group', '集まり', 'Groups', '/groups', `/groups?country=${code}`, groups);
  pushCommunity('lesson', 'lesson', '習う', 'Lessons', '/lessons', `/lessons?country=${code}`, lessons);
  pushCommunity('mutual_aid', 'mutual_aid', '助け', 'Mutual Aid', '/help', `/help?country=${code}`, mutualAid);

  // 記事
  if (articles.length > 0) {
    shelves.push({
      key: 'articles',
      cardKind: 'article',
      title: '記事',
      sub: 'Articles',
      allHref: `/articles?country=${code}`,
      cards: articles.map((a) => ({
        id: a.id,
        href: `/articles/${a.id}`,
        title: a.title,
        image: a.coverImageUrl ?? null,
        meta: a.area || country.nameJa,
        badge: a.writerName ? `by ${a.writerName}` : null,
      })),
    });
  }

  // サービス（最後）
  if (services.length > 0) {
    shelves.push({
      key: 'services',
      cardKind: 'service',
      title: 'サービス',
      sub: 'Services',
      allHref: `/services?country=${code}`,
      cards: services.map((s) => ({
        id: s.id,
        href: `/services/${s.id}`,
        title: s.title,
        image: s.coverImageUrl ?? null,
        meta: s.cityNameJa ?? null,
        badge: s.category ? tagLabel(s.category) : null,
      })),
    });
  }

  return (
    <main className="bg-background">
      {/* ヒーロー */}
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
        <div className="mx-auto max-w-screen-xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-20">
          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/85 ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            国を選び直す
          </Link>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-primary-300">
            {country.nameEn}
          </p>
          <h1 className="mt-3 text-[32px] font-bold leading-[1.12] tracking-tight text-white sm:text-[46px]">
            {country.nameJa}の暮らしを、
            <br className="hidden sm:block" />
            現地の人の言葉で。
          </h1>
          <p className="mt-4 max-w-xl text-[13px] leading-[1.9] text-white/80 sm:text-[15px]">
            ガイドブックにない一次情報。{country.nameJa}の住居・求人・売買・集まり・
            記事・サービスを、カテゴリごとにまとめました。
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-10">
        {shelves.length > 0 ? (
          <CountryShelves shelves={shelves} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center text-[13px] text-foreground/55">
            {country.nameJa}のコンテンツはまだ準備中です。
            <br />
            <Link href="/community" className="mt-3 inline-block font-semibold text-primary-700 hover:underline">
              ほかの国を見る →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
