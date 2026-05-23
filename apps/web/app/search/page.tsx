import Link from 'next/link';
import { ArrowLeft, SearchX, MapPin, Briefcase, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { SearchBox } from '@/components/SearchBox';
import { ServiceCard } from '@/components/services/ServiceCard';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';
import { getViewerMode } from '@/lib/mode/cookie';
import {
  searchArticles,
  searchCommunityPosts,
  searchServices,
  searchUsers,
  type SearchArticleHit,
  type SearchCommunityHit,
  type SearchServiceHit,
  type SearchUserHit,
} from '@/lib/search/queries';
import type { FeaturedService } from '@/lib/services/featured';
import { KIND_LABEL, KIND_BASE_PATH } from '@/lib/community/constants';

export const dynamic = 'force-dynamic';

type Tab = 'residents' | 'services' | 'articles' | 'community';

type Props = {
  searchParams?: {
    q?: string;
    tab?: string;
    in?: string;
    areas?: string;
    country?: string;
    region?: string;
  };
};

const VALID_AREAS = ['articles', 'services', 'residents'] as const;
type Area = (typeof VALID_AREAS)[number];

function parseAreas(raw: string | undefined): Set<Area> {
  if (!raw) return new Set(VALID_AREAS);
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is Area =>
      (VALID_AREAS as readonly string[]).includes(s),
    );
  if (parts.length === 0) return new Set(VALID_AREAS);
  return new Set(parts);
}

export const metadata = { title: '検索 — Locore' };

/**
 * /search — 3 軸タブ式検索 (PR3)。
 *
 * 旅行者モード:
 *   tab=residents | services | articles
 *   各タブで `?tab=...&q=...` で切替。件数バッジ付き。
 *
 * 駐在員モード:
 *   tab=residents | community
 *   従来の「コミュニティ + 住人」を踏襲。
 *
 * デフォルトタブ判定 (旅行者):
 *   - q 空 → residents
 *   - q がサービス語彙を含む → services
 *   - それ以外 → articles
 */

// サービスタブにデフォルト誘導するためのキーワード辞書 (§13.6 検索 3 軸統合)
const SERVICE_VOCAB = [
  '予約',
  '撮影',
  '通訳',
  '買付',
  'ワイン',
  'アテンド',
  '案内',
  '翻訳',
  'コンサル',
  'リサーチ',
];

function pickDefaultTab(q: string, isResident: boolean): Tab {
  if (isResident) return 'community';
  if (!q) return 'residents';
  if (SERVICE_VOCAB.some((w) => q.includes(w))) return 'services';
  return 'articles';
}

function normalizeTab(raw: string | undefined, isResident: boolean): Tab | null {
  if (isResident) {
    if (raw === 'community' || raw === 'residents') return raw;
    return null;
  }
  if (raw === 'residents' || raw === 'services' || raw === 'articles') return raw;
  return null;
}

export default async function SearchPage({ searchParams }: Props) {
  const rawQ = (searchParams?.q ?? '').trim();
  const mode = getViewerMode();
  const isResident = mode === 'resident';

  const requestedTab = normalizeTab(searchParams?.tab, isResident);
  const activeTab: Tab = requestedTab ?? pickDefaultTab(rawQ, isResident);

  // 2026-05 IA リファクタ: areas / country / region の追加クエリ
  const areas = parseAreas(searchParams?.areas);
  const country = (searchParams?.country ?? '').trim().toLowerCase() || undefined;
  const region = (searchParams?.region ?? '').trim() || undefined;
  const scope = { countryCode: country, regionSlug: region };

  // 全タブの件数を出すため、q がある場合は並列で全部走らせる (バッジ表示)。
  // areas で領域が絞られている場合は、選ばれた領域だけ走らせて他は空のまま。
  let articleHits: SearchArticleHit[] = [];
  let communityHits: SearchCommunityHit[] = [];
  let userHits: SearchUserHit[] = [];
  let serviceHits: SearchServiceHit[] = [];

  if (rawQ) {
    if (isResident) {
      const tasks: Promise<unknown>[] = [];
      // 駐在員モードの areas マッピング:
      //   residents → users / community 両方
      const wantCommunity = areas.has('residents');
      const wantResidents = areas.has('residents');
      tasks.push(
        wantCommunity
          ? searchCommunityPosts(rawQ, 30).then((r) => {
              communityHits = r;
            })
          : Promise.resolve(),
        wantResidents
          ? searchUsers(rawQ, 30, scope).then((r) => {
              userHits = r;
            })
          : Promise.resolve(),
      );
      await Promise.all(tasks);
    } else {
      const tasks: Promise<unknown>[] = [];
      if (areas.has('articles')) {
        tasks.push(
          searchArticles(rawQ, 60, scope).then((r) => {
            articleHits = r;
          }),
        );
      }
      if (areas.has('residents')) {
        tasks.push(
          searchUsers(rawQ, 30, scope).then((r) => {
            userHits = r;
          }),
        );
      }
      if (areas.has('services')) {
        tasks.push(
          searchServices(rawQ, 30, scope).then((r) => {
            serviceHits = r;
          }),
        );
      }
      await Promise.all(tasks);
    }
  }

  // 記事のソーシャルカウントは現状未使用だが将来用に warm しておく
  await getArticleSocialCounts(articleHits.map((a) => a.id));

  const counts = {
    residents: userHits.length,
    services: serviceHits.length,
    articles: articleHits.length,
    community: communityHits.length,
  } as const;

  const placeholder = isResident
    ? 'コミュニティ投稿・駐在員を検索'
    : '駐在員・サービス・記事を検索';

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ホームに戻る
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-[24px] font-bold tracking-tight text-foreground sm:text-[28px]">
          {isResident ? '駐在員と暮らしの情報を、辿る' : '駐在員・サービス・記事から、辿る'}
        </h1>
        <p className="mt-1 text-[13px] text-foreground/65">
          {isResident
            ? 'コミュニティ投稿（求人・物件・売買・募集・教えあい・助け合い）と、駐在員プロフィールを横断検索します。'
            : '駐在員プロフィール、駐在員が提供するサービス、そして公開記事の 3 軸から検索できます。'}
        </p>
      </header>

      <SearchBox
        defaultQuery={rawQ}
        placeholder={placeholder}
        showInToggle={false}
        showLabel
      />

      {/* タブ */}
      <TabBar
        activeTab={activeTab}
        counts={counts}
        rawQ={rawQ}
        isResident={isResident}
        visibleAreas={areas}
      />

      {/* クエリ未入力 */}
      {!rawQ ? (
        <p className="mt-8 rounded-lg bg-primary-500/10 px-4 py-3 text-[13px] text-foreground/70">
          検索したい言葉を入力してみてください。
        </p>
      ) : null}

      {/* タブ別本体 */}
      {rawQ ? (
        <section className="mt-6">
          {activeTab === 'residents' ? (
            userHits.length > 0 ? (
              <UserHitGrid hits={userHits} />
            ) : (
              <EmptyState query={rawQ} label="駐在員" />
            )
          ) : null}
          {activeTab === 'services' ? (
            serviceHits.length > 0 ? (
              <ServiceHitGrid hits={serviceHits} />
            ) : (
              <EmptyState query={rawQ} label="サービス" />
            )
          ) : null}
          {activeTab === 'articles' ? (
            articleHits.length > 0 ? (
              <ArticleHitGrid hits={articleHits} />
            ) : (
              <EmptyState query={rawQ} label="記事" />
            )
          ) : null}
          {activeTab === 'community' ? (
            communityHits.length > 0 ? (
              <CommunityHitList hits={communityHits} />
            ) : (
              <EmptyState query={rawQ} label="コミュニティ投稿" />
            )
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

// ============================================================================
// タブバー
// ============================================================================

function TabBar({
  activeTab,
  counts,
  rawQ,
  isResident,
  visibleAreas,
}: {
  activeTab: Tab;
  counts: { residents: number; services: number; articles: number; community: number };
  rawQ: string;
  isResident: boolean;
  visibleAreas: Set<Area>;
}) {
  const allTabs: { key: Tab; label: string; count: number; area: Area | null }[] =
    isResident
      ? [
          { key: 'community', label: 'コミュニティ', count: counts.community, area: 'residents' },
          { key: 'residents', label: '駐在員', count: counts.residents, area: 'residents' },
        ]
      : [
          { key: 'residents', label: '駐在員', count: counts.residents, area: 'residents' },
          { key: 'services', label: 'サービス', count: counts.services, area: 'services' },
          { key: 'articles', label: '記事', count: counts.articles, area: 'articles' },
        ];
  const tabs = allTabs.filter((t) => !t.area || visibleAreas.has(t.area));

  const buildHref = (tab: Tab) => {
    const params = new URLSearchParams();
    if (rawQ) params.set('q', rawQ);
    params.set('tab', tab);
    return `/search?${params.toString()}`;
  };

  return (
    <div className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((t) => {
          const on = t.key === activeTab;
          return (
            <Link
              key={t.key}
              href={buildHref(t.key)}
              scroll={false}
              aria-current={on ? 'page' : undefined}
              className={
                'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition ' +
                (on
                  ? 'border-primary-500 text-foreground'
                  : 'border-transparent text-foreground/55 hover:text-foreground')
              }
            >
              {t.label}
              <span
                className={
                  'rounded-full px-1.5 text-[10px] font-bold tabular ' +
                  (on
                    ? 'bg-primary-500/20 text-primary-300'
                    : 'bg-foreground/10 text-foreground/55')
                }
              >
                {rawQ ? t.count : '-'}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 共通: 空状態
// ============================================================================

function EmptyState({ query, label }: { query: string; label: string }) {
  return (
    <div className="mt-2 flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center text-[13px] text-foreground/65">
      <SearchX className="h-8 w-8 text-foreground/35" />
      <p className="text-[14px] font-medium text-foreground/75">
        「{query}」に合う{label}は見つかりませんでした
      </p>
      <p className="text-[12px] text-foreground/55">
        他のタブも確認してみてください。
      </p>
    </div>
  );
}

// ============================================================================
// 記事カード (検索結果用シンプル版)
// ============================================================================

function ArticleHitGrid({ hits }: { hits: SearchArticleHit[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {hits.map((a) => (
        <li
          key={a.id}
          className="overflow-hidden rounded-xl bg-card ring-1 ring-border transition hover:ring-primary-300"
        >
          <Link href={`/articles/${a.id}`} className="block">
            <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted">
              {a.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-foreground/35">
                  <ImageIcon className="h-8 w-8" aria-hidden />
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground hover:text-primary-300">
                {a.title}
              </h3>
              {a.bodyExcerpt ? (
                <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-foreground/65">
                  {a.bodyExcerpt}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/55">
                {a.writerName ? <span>{a.writerName}</span> : null}
                {a.cityNameJa ? (
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    {a.cityNameJa}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// 駐在員カード
// ============================================================================

function UserHitGrid({ hits }: { hits: SearchUserHit[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {hits.map((u) => (
        <UserHitCard key={u.id} user={u} />
      ))}
    </ul>
  );
}

function UserHitCard({ user }: { user: SearchUserHit }) {
  return (
    <li className="rounded-xl bg-card p-4 ring-1 ring-border transition hover:ring-primary-300">
      <Link href={`/residents/${user.id}`} className="flex items-start gap-3">
        <Avatar size="lg" className="ring-1 ring-border">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback>
            {user.displayName[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[14px] font-semibold text-foreground hover:text-primary-300">
            {user.displayName}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/55">
            {user.residencyCity || user.residencyCountry ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {user.residencyCity ?? ''}
                {user.residencyCity && user.residencyCountry ? ', ' : ''}
                {user.residencyCountry ?? ''}
              </span>
            ) : null}
            {user.occupation ? (
              <span className="inline-flex items-center gap-0.5">
                <Briefcase className="h-3 w-3" />
                {user.occupation}
              </span>
            ) : null}
          </div>
          {user.bio ? (
            <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-foreground/70">
              {user.bio}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

// ============================================================================
// コミュニティ投稿カード
// ============================================================================

function CommunityHitList({ hits }: { hits: SearchCommunityHit[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {hits.map((p) => (
        <li
          key={p.id}
          className="rounded-xl bg-card p-4 ring-1 ring-border transition hover:ring-primary-300"
        >
          <Link
            href={`${KIND_BASE_PATH[p.kind]}/${p.id}`}
            className="block"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-bold text-primary-300">
                {KIND_LABEL[p.kind]}
              </span>
              {p.locationText ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-foreground/55">
                  <MapPin className="h-3 w-3" />
                  {p.locationText}
                </span>
              ) : null}
            </div>
            <h3 className="line-clamp-1 text-[14px] font-semibold text-foreground hover:text-primary-300">
              {p.title}
            </h3>
            {p.bodyExcerpt ? (
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-foreground/65">
                {p.bodyExcerpt}
              </p>
            ) : null}
            {p.authorName ? (
              <p className="mt-2 text-[11px] text-foreground/50">
                投稿者: {p.authorName}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// サービスカード (旅行者モード専用)。PR1 で作成した ServiceCard を再利用。
// SearchServiceHit を FeaturedService 形状に matching し直す。
// ============================================================================

function hitToFeatured(s: SearchServiceHit): FeaturedService {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    category: s.category,
    priceJpy: s.priceJpy,
    priceUnit: s.priceUnit,
    contactMethod: 'chat',
    externalUrl: null,
    cityNameJa: s.cityNameJa,
    citySlug: null,
    audience: null,
    coverImageUrl: s.coverImageUrl,
    ownerId: s.ownerId,
    ownerDisplayName: s.ownerDisplayName,
    ownerAvatarUrl: s.ownerAvatarUrl,
  };
}

function ServiceHitGrid({ hits }: { hits: SearchServiceHit[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {hits.map((s) => (
        <li key={s.id} className="h-full">
          <ServiceCard service={hitToFeatured(s)} />
        </li>
      ))}
    </ul>
  );
}
