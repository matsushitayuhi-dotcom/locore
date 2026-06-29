import Link from 'next/link';
import { ArrowLeft, SearchX, MapPin, Briefcase, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { ServiceCard } from '@/components/services/ServiceCard';
import { SearchForm } from '@/components/search/SearchForm';
import { SUPPORTED_COUNTRIES } from '@/lib/geo/countrySlug';
import {
  COMMUNITY_KINDS,
  KIND_LABEL,
  KIND_BASE_PATH,
  STATUS_LABEL,
  type CommunityKind,
} from '@/lib/community/constants';
import {
  searchArticles,
  searchServices,
  searchUsers,
  searchCommunityPosts,
  type SearchArticleHit,
  type SearchServiceHit,
  type SearchUserHit,
  type SearchCommunityHit,
} from '@/lib/search/queries';
import type { FeaturedService } from '@/lib/services/featured';

/**
 * /search — 横断検索ページ。
 *
 * 2026-06 改修: 記事検索 (ArticleJournal) の UI に統一。
 *   - 常時表示: 国セレクト + キーワード
 *   - 「詳細設定」ドリルダウン: 検索対象チェック
 *       種類      … 記事 / サービス / ユーザー
 *       コミュニティ … 求人 / 住居 / 売買 / 集まり / 習う / 助け（community_posts の 6 kind）
 *   - 地域 (region) フィルタは廃止（国のみ）
 *
 * クエリパラメータ:
 *   ?q=<text>
 *   ?country=fr
 *   ?areas=articles,services,users,job,apartment,marketplace,group,lesson,mutual_aid
 *          （カンマ区切り。省略時 = 全対象 ON）
 *   ?tags=consulting,study_abroad  （/services のタグ絞り込みからの引き継ぎ専用）
 *
 * Server Component。フォームは <SearchForm> (client) が GET submit する。
 */

export const dynamic = 'force-dynamic';

export const metadata = { title: '検索 — Locore' };

type Search = {
  q?: string;
  areas?: string;
  country?: string;
  tags?: string;
};

const CONTENT_SCOPES = ['articles', 'services', 'users'] as const;
const VALID_SCOPES = [...CONTENT_SCOPES, ...COMMUNITY_KINDS] as const;
type Scope = (typeof VALID_SCOPES)[number];

const CONTENT_SCOPE_LABEL: Record<(typeof CONTENT_SCOPES)[number], string> = {
  articles: '記事',
  services: 'サービス',
  users: 'ユーザー',
};

function parseScopes(raw: string | undefined): Set<Scope> {
  if (!raw) return new Set(VALID_SCOPES);
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is Scope => (VALID_SCOPES as readonly string[]).includes(s));
  if (parts.length === 0) return new Set(VALID_SCOPES);
  return new Set(parts);
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Search;
}) {
  const rawQ = (searchParams?.q ?? '').trim();
  const scopes = parseScopes(searchParams?.areas);
  const country =
    (searchParams?.country ?? '').trim().toLowerCase() || undefined;
  const tags = parseTags(searchParams?.tags);
  const scope = { countryCode: country };

  const wantArticles = scopes.has('articles');
  const wantServices = scopes.has('services');
  const wantUsers = scopes.has('users');
  const wantKinds = COMMUNITY_KINDS.filter((k) => scopes.has(k));

  const [articleHits, serviceHits, userHits, communityHits] = await Promise.all(
    [
      rawQ && wantArticles
        ? searchArticles(rawQ, 30, scope)
        : Promise.resolve([] as SearchArticleHit[]),
      rawQ && wantServices
        ? searchServices(rawQ, 30, scope)
        : Promise.resolve([] as SearchServiceHit[]),
      rawQ && wantUsers
        ? searchUsers(rawQ, 30, scope)
        : Promise.resolve([] as SearchUserHit[]),
      rawQ && wantKinds.length > 0
        ? searchCommunityPosts(rawQ, 40, {
            kinds: wantKinds,
            countryCode: country,
          })
        : Promise.resolve([] as SearchCommunityHit[]),
    ],
  );

  // サービス結果は tags フィルタがあれば追加で絞る
  const filteredServiceHits =
    tags.length > 0
      ? serviceHits.filter((s) => (s.tags ?? []).some((t) => tags.includes(t)))
      : serviceHits;

  // コミュニティ結果を kind 別にまとめる
  const communityByKind = new Map<CommunityKind, SearchCommunityHit[]>();
  for (const hit of communityHits) {
    const arr = communityByKind.get(hit.kind) ?? [];
    arr.push(hit);
    communityByKind.set(hit.kind, arr);
  }

  // 詳細フィルター（検索対象カテゴリ）のピル定義と現在の選択状態。
  // areas 未指定なら parseScopes が全 scope を返すので、初期は全カテゴリ ON。
  const scopeGroups = [
    {
      title: '種類',
      options: CONTENT_SCOPES.map((s) => ({
        value: s,
        label: CONTENT_SCOPE_LABEL[s],
      })),
    },
    {
      title: 'コミュニティ',
      options: COMMUNITY_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] })),
    },
  ];
  const selectedScopes = new Set<string>(scopes);
  // areas を明示指定して一部だけに絞っている状態か（トグルのバッジ表示用）。
  const filterActive = scopes.size < VALID_SCOPES.length;

  // 検索前は /community トップと同じミニマルなフルスクリーン入口を出す。
  if (!rawQ) {
    return (
      <SearchForm
        countries={SUPPORTED_COUNTRIES}
        initialQ=""
        initialCountry={country ?? ''}
        tags={tags}
        scopeGroups={scopeGroups}
        selectedScopes={selectedScopes}
        filterActive={filterActive}
        mode="hero"
      />
    );
  }

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ホームに戻る
      </Link>

      <div className="mt-4">
        <SearchForm
          countries={SUPPORTED_COUNTRIES}
          initialQ={rawQ}
          initialCountry={country ?? ''}
          tags={tags}
          scopeGroups={scopeGroups}
          selectedScopes={selectedScopes}
          filterActive={filterActive}
          mode="compact"
        />
      </div>

      {/* ============ 結果 ============ */}
      <div className="mt-8 space-y-10">
          {wantArticles ? (
            <ResultSection
              title="記事"
              count={articleHits.length}
              query={rawQ}
              empty="該当する記事はありません"
            >
              {articleHits.length > 0 ? (
                <ArticleHitGrid hits={articleHits} />
              ) : null}
            </ResultSection>
          ) : null}
          {wantServices ? (
            <ResultSection
              title="サービス"
              count={filteredServiceHits.length}
              query={rawQ}
              empty="該当するサービスはありません"
            >
              {filteredServiceHits.length > 0 ? (
                <ServiceHitGrid hits={filteredServiceHits} />
              ) : null}
            </ResultSection>
          ) : null}
          {wantUsers ? (
            <ResultSection
              title="ユーザー"
              count={userHits.length}
              query={rawQ}
              empty="該当するユーザーはいません"
            >
              {userHits.length > 0 ? <UserHitGrid hits={userHits} /> : null}
            </ResultSection>
          ) : null}
          {wantKinds.map((k) => {
            const hits = communityByKind.get(k) ?? [];
            return (
              <ResultSection
                key={k}
                title={KIND_LABEL[k]}
                count={hits.length}
                query={rawQ}
                empty={`該当する${KIND_LABEL[k]}の投稿はありません`}
              >
                {hits.length > 0 ? (
                  <CommunityHitGrid kind={k} hits={hits} />
                ) : null}
              </ResultSection>
            );
          })}
      </div>
    </main>
  );
}

// ============================================================================
// セクションラッパー (件数バッジ + 空状態)
// ============================================================================

function ResultSection({
  title,
  count,
  query,
  empty,
  children,
}: {
  title: string;
  count: number;
  query: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-2 text-[18px] font-semibold tracking-tight sm:text-[20px]">
        {title}
        <span className="rounded-full bg-primary-500/15 px-2 py-0.5 text-[11px] font-bold tabular text-primary-300">
          {count}
        </span>
      </h2>
      {count === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-10 text-center text-[13px] text-foreground/65">
          <SearchX className="h-7 w-7 text-foreground/35" />
          <p className="text-[13px]">
            「{query}」: {empty}
          </p>
        </div>
      ) : (
        children
      )}
    </section>
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
// ユーザーカード
// ============================================================================

function UserHitGrid({ hits }: { hits: SearchUserHit[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {hits.map((u) => (
        <li
          key={u.id}
          className="rounded-xl bg-card p-4 ring-1 ring-border transition hover:ring-primary-300"
        >
          <Link href={`/users/${u.id}`} className="flex items-start gap-3">
            <Avatar size="lg" className="ring-1 ring-border">
              {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
              <AvatarFallback>
                {u.displayName[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[14px] font-semibold text-foreground hover:text-primary-300">
                {u.displayName}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/55">
                {u.residencyCity || u.residencyCountry ? (
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    {u.residencyCity ?? ''}
                    {u.residencyCity && u.residencyCountry ? ', ' : ''}
                    {u.residencyCountry ?? ''}
                  </span>
                ) : null}
                {u.occupation ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Briefcase className="h-3 w-3" />
                    {u.occupation}
                  </span>
                ) : null}
              </div>
              {u.bio ? (
                <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-foreground/70">
                  {u.bio}
                </p>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// コミュニティ投稿カード
// ============================================================================

function CommunityHitGrid({
  kind,
  hits,
}: {
  kind: CommunityKind;
  hits: SearchCommunityHit[];
}) {
  const base = KIND_BASE_PATH[kind];
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {hits.map((c) => (
        <li
          key={c.id}
          className="rounded-xl bg-card p-4 ring-1 ring-border transition hover:ring-primary-300"
        >
          <Link href={`${base}/${c.id}`} className="block">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-bold text-primary-300">
                {KIND_LABEL[kind]}
              </span>
              <span className="text-[10px] font-semibold text-foreground/50">
                {STATUS_LABEL[c.status]}
              </span>
            </div>
            <h3 className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug text-foreground hover:text-primary-300">
              {c.title}
            </h3>
            {c.bodyExcerpt ? (
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-foreground/65">
                {c.bodyExcerpt}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/55">
              {c.authorName ? <span>{c.authorName}</span> : null}
              {c.locationText ? (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {c.locationText}
                </span>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// サービスカード (検索結果)。FeaturedService 形状に matching し直して ServiceCard 再利用。
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
    tags: s.tags ?? [],
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
