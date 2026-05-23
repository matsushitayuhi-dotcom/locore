import Link from 'next/link';
import {
  ArrowLeft,
  SearchX,
  MapPin,
  Briefcase,
  ImageIcon,
  Search as SearchIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { ServiceCard } from '@/components/services/ServiceCard';
import {
  listCountriesForPicker,
  listRegionsForPicker,
} from '@/lib/geo/countries';
import {
  searchArticles,
  searchServices,
  searchUsers,
  type SearchArticleHit,
  type SearchServiceHit,
  type SearchUserHit,
} from '@/lib/search/queries';
import type { FeaturedService } from '@/lib/services/featured';

/**
 * /search — 2026-05 改修で「検索 Sheet の中身」をそのまま本格ページ化したもの。
 *
 * 旧 /search は領域別 3 タブの切替式だったが、Sheet に揃えるため:
 *   - キーワード input
 *   - 領域チェック (記事 / サービス / 駐在員向け)
 *   - 国 + 地域 ドロップダウン
 *   - 検索する ボタン (GET form, submit で URL クエリに反映)
 * というシンプルな構成に置き換えた。結果はチェックされた領域だけを縦に積む。
 *
 * クエリパラメータ:
 *   ?q=<text>
 *   ?areas=articles,services,residents   (カンマ区切り、省略時 = 全領域 ON)
 *   ?country=fr&region=paris
 *   ?tags=consulting,study_abroad        (サービス絞り込み専用、複数 OK)
 *
 * Server Component。Form は <form method="GET" action="/search">。
 */

export const dynamic = 'force-dynamic';

export const metadata = { title: '検索 — Locore' };

type Search = {
  q?: string;
  areas?: string;
  country?: string;
  region?: string;
  tags?: string;
};

const VALID_AREAS = ['articles', 'services', 'residents'] as const;
type Area = (typeof VALID_AREAS)[number];

const AREA_LABEL: Record<Area, string> = {
  articles: '記事',
  services: 'サービス',
  residents: '駐在員',
};

function parseAreas(raw: string | undefined): Set<Area> {
  if (!raw) return new Set(VALID_AREAS);
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is Area => (VALID_AREAS as readonly string[]).includes(s));
  if (parts.length === 0) return new Set(VALID_AREAS);
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
  const areas = parseAreas(searchParams?.areas);
  const country = (searchParams?.country ?? '').trim().toLowerCase() || undefined;
  const region = (searchParams?.region ?? '').trim() || undefined;
  const tags = parseTags(searchParams?.tags);
  const scope = { countryCode: country, regionSlug: region };

  // 国 / 地域リスト (form の select 用) と検索結果を並列で fetch
  const wantArticles = areas.has('articles');
  const wantServices = areas.has('services');
  const wantResidents = areas.has('residents');

  const [countries, regions, articleHits, serviceHits, userHits] =
    await Promise.all([
      listCountriesForPicker(),
      listRegionsForPicker(),
      rawQ && wantArticles
        ? searchArticles(rawQ, 30, scope)
        : Promise.resolve([] as SearchArticleHit[]),
      rawQ && wantServices
        ? searchServices(rawQ, 30, scope)
        : Promise.resolve([] as SearchServiceHit[]),
      rawQ && wantResidents
        ? searchUsers(rawQ, 30, scope)
        : Promise.resolve([] as SearchUserHit[]),
    ]);

  // サービス結果は tags フィルタがあれば追加で絞る (検索は ILIKE ベースのため
  // tags overlap は SQL で書かず、in-memory で絞り込み。件数が小さいので OK)
  const filteredServiceHits =
    tags.length > 0
      ? serviceHits.filter((s) => (s.tags ?? []).some((t) => tags.includes(t)))
      : serviceHits;

  const filteredRegions = country
    ? regions.filter((r) => r.countryCode === country)
    : [];

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
          検索
        </h1>
        <p className="mt-1 text-[13px] text-foreground/65">
          記事・サービス・駐在員プロフィールから、国 / 地域を絞って検索できます。
        </p>
      </header>

      {/* ============ 検索フォーム ============ */}
      <form
        method="get"
        action="/search"
        className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5"
      >
        {/* 1 行目: キーワード */}
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
            キーワード
          </span>
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={rawQ}
              placeholder="例: マレ ビストロ / 翻訳 / 求人"
              aria-label="キーワード"
              className="h-11 w-full rounded-xl bg-background pl-9 pr-3 text-[14px] ring-1 ring-border placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </label>

        {/* 2 行目: 領域チェック */}
        <fieldset>
          <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
            検索する領域
          </legend>
          <div className="flex flex-wrap gap-2">
            {VALID_AREAS.map((a) => {
              const checked = areas.has(a);
              return (
                <label
                  key={a}
                  className={
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition ' +
                    (checked
                      ? 'bg-primary-500/15 text-primary-300 ring-1 ring-primary-300/40'
                      : 'bg-background text-foreground/65 ring-1 ring-border hover:bg-primary-500/10')
                  }
                >
                  <input
                    type="checkbox"
                    name="areas"
                    value={a}
                    defaultChecked={checked}
                    className="h-3.5 w-3.5 accent-primary-500"
                  />
                  {a === 'residents' ? '駐在員向け' : AREA_LABEL[a]}
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* 3 行目: 国 / 地域 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              国
            </span>
            <select
              name="country"
              defaultValue={country ?? ''}
              aria-label="国"
              className="h-11 w-full rounded-xl bg-background px-3 text-[14px] ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">すべての国</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nameJa}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              地域
            </span>
            <select
              name="region"
              defaultValue={region ?? ''}
              aria-label="地域"
              disabled={!country}
              className="h-11 w-full rounded-xl bg-background px-3 text-[14px] ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {country ? 'すべての地域' : '国を先に選んでください'}
              </option>
              {filteredRegions.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.nameJa}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* tags は hidden で持ち越し (フォームには UI を出さないが、/services の
            タグ絞り込みからリンクされた場合などに引き継ぐ) */}
        {tags.length > 0 ? (
          <input type="hidden" name="tags" value={tags.join(',')} />
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {rawQ || tags.length > 0 || country || region ? (
            <Link
              href="/search"
              className="rounded-full px-3 py-2 text-[12px] font-semibold text-foreground/65 hover:text-foreground"
            >
              リセット
            </Link>
          ) : null}
          <button
            type="submit"
            className="h-11 rounded-full bg-primary-500 px-6 text-[14px] font-bold text-neutral-950 transition active:scale-[0.98] hover:bg-primary-300"
          >
            検索する
          </button>
        </div>
      </form>

      {/* ============ 結果 ============ */}
      {!rawQ ? (
        <p className="mt-8 rounded-lg bg-primary-500/10 px-4 py-3 text-[13px] text-foreground/70">
          検索したい言葉を入力して「検索する」を押してください。
        </p>
      ) : (
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
          {wantResidents ? (
            <ResultSection
              title="駐在員"
              count={userHits.length}
              query={rawQ}
              empty="該当する駐在員はいません"
            >
              {userHits.length > 0 ? <UserHitGrid hits={userHits} /> : null}
            </ResultSection>
          ) : null}
          {!wantArticles && !wantServices && !wantResidents ? (
            <p className="rounded-lg bg-muted px-4 py-3 text-[13px] text-foreground/65">
              検索する領域が 1 つも選ばれていません。上のチェックボックスで領域を選んでください。
            </p>
          ) : null}
        </div>
      )}
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
// 駐在員カード
// ============================================================================

function UserHitGrid({ hits }: { hits: SearchUserHit[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {hits.map((u) => (
        <li
          key={u.id}
          className="rounded-xl bg-card p-4 ring-1 ring-border transition hover:ring-primary-300"
        >
          <Link href={`/residents/${u.id}`} className="flex items-start gap-3">
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
