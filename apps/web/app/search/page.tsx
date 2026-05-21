import Link from 'next/link';
import { ArrowLeft, SearchX, MapPin, Briefcase } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { SearchBox } from '@/components/SearchBox';
import { ArticleGrid } from '@/components/ArticleGrid';
import { searchPublishedArticles } from '@/lib/articles/search';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';
import { getViewerMode } from '@/lib/mode/cookie';
import {
  searchArticles,
  searchCommunityPosts,
  searchUsers,
  type SearchCommunityHit,
  type SearchUserHit,
} from '@/lib/search/queries';
import { KIND_LABEL, KIND_BASE_PATH } from '@/lib/community/constants';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams?: { q?: string; in?: string };
};

export const metadata = { title: '検索 — Locore' };

/**
 * /search — モード別検索。
 *
 * - 旅行者モード (mode === 'traveler' or null):
 *     「記事」+「住人」の 2 セクション。
 *     既存の `?in=title|body` トグルは記事セクション内で引き続き有効。
 * - 駐在員モード (mode === 'resident'):
 *     「コミュニティ」+「住人」の 2 セクション。
 *
 * DB スキーマ変更なし。すべて既存テーブルへの ILIKE 部分一致で実装。
 */
export default async function SearchPage({ searchParams }: Props) {
  const rawQ = (searchParams?.q ?? '').trim();
  const rawIn = searchParams?.in === 'body' ? 'body' : 'title';
  const mode = getViewerMode();
  const isResident = mode === 'resident';

  // モード別に並列でクエリ。q が空のときは何も走らせない。
  let articleHits: Awaited<ReturnType<typeof searchPublishedArticles>> = [];
  let communityHits: SearchCommunityHit[] = [];
  let userHits: SearchUserHit[] = [];

  if (rawQ) {
    if (isResident) {
      [communityHits, userHits] = await Promise.all([
        searchCommunityPosts(rawQ, 30),
        searchUsers(rawQ, 30),
      ]);
    } else {
      // 旅行者モード: 既存の searchPublishedArticles を再利用して
      // `?in=title|body` トグルとの互換を維持する。
      [articleHits, userHits] = await Promise.all([
        searchPublishedArticles(rawQ, rawIn, 60),
        searchUsers(rawQ, 30),
      ]);
    }
  }

  const socialCounts = await getArticleSocialCounts(
    articleHits.map((a) => a.id),
  );

  // 結果が両方 0 件か（CTA 表示用）
  const primaryHits = isResident ? communityHits : articleHits;
  const bothEmpty =
    rawQ.length > 0 && primaryHits.length === 0 && userHits.length === 0;

  const placeholder = isResident
    ? 'コミュニティ投稿・住人を検索'
    : '記事タイトル・本文・住人を検索';

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
          {isResident ? '住人と暮らしの情報を、辿る' : '書いてある言葉から、辿る'}
        </h1>
        <p className="mt-1 text-[13px] text-foreground/65">
          {isResident
            ? 'コミュニティ投稿（求人・物件・売買・募集・教えあい・助け合い）と、住人プロフィールを横断検索します。'
            : '店名・地区名・気分を表す言葉、なんでもどうぞ。タイトルだけか本文も含めるか、切り替えられます。'}
        </p>
      </header>

      <SearchBox
        defaultQuery={rawQ}
        defaultIn={rawIn}
        placeholder={placeholder}
        showInToggle={!isResident}
        showLabel
      />

      {/* クエリ未入力 */}
      {!rawQ ? (
        <p className="mt-8 rounded-lg bg-primary-500/10 px-4 py-3 text-[13px] text-foreground/70">
          検索したい言葉を入力してみてください。
        </p>
      ) : null}

      {/* 両方 0 件 */}
      {bothEmpty ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center text-[13px] text-foreground/65">
          <SearchX className="h-8 w-8 text-foreground/35" />
          <p className="text-[14px] font-medium text-foreground/75">
            「{rawQ}」に合う結果は見つかりませんでした
          </p>
          <p className="text-[12px] text-foreground/55">
            キーワードを少し変えてみてください。
            {!isResident
              ? ' タイトルだけでなく本文も含めて検索できます。'
              : ''}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/search"
              className="rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
            >
              条件を変えてもう一度
            </Link>
            {!isResident ? (
              <Link
                href={`/search?q=${encodeURIComponent(rawQ)}&in=${rawIn === 'body' ? 'title' : 'body'}`}
                className="rounded-full bg-primary-500 px-3 py-1.5 text-[12px] font-bold text-neutral-950 hover:bg-primary-300"
              >
                {rawIn === 'body' ? 'タイトルで検索' : '本文も含めて検索'}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* セクション 1: 旅行者 → 記事 / 駐在員 → コミュニティ */}
      {rawQ && !bothEmpty ? (
        <section className="mt-8">
          <SectionHeader
            label={isResident ? 'コミュニティ' : '記事'}
            count={isResident ? communityHits.length : articleHits.length}
            note={
              !isResident
                ? `${rawIn === 'body' ? '本文' : 'タイトル'}から検索`
                : null
            }
          />
          {isResident ? (
            communityHits.length > 0 ? (
              <CommunityHitList hits={communityHits} />
            ) : (
              <EmptyInline label="コミュニティ投稿" />
            )
          ) : articleHits.length > 0 ? (
            <ArticleGrid articles={articleHits} socialCounts={socialCounts} />
          ) : (
            <EmptyInline label="記事" />
          )}
        </section>
      ) : null}

      {/* セクション 2: 住人（両モード共通） */}
      {rawQ && !bothEmpty ? (
        <section className="mt-10">
          <SectionHeader label="住人" count={userHits.length} />
          {userHits.length > 0 ? (
            <UserHitGrid hits={userHits} />
          ) : (
            <EmptyInline label="住人" />
          )}
        </section>
      ) : null}
    </main>
  );
}

// ============================================================================
// セクション共通パーツ
// ============================================================================

function SectionHeader({
  label,
  count,
  note,
}: {
  label: string;
  count: number;
  note?: string | null;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
        {label}
        <span className="ml-2 text-[12px] font-normal text-foreground/55 tabular">
          {count} 件
        </span>
      </h2>
      {note ? (
        <span className="text-[11px] text-foreground/50">{note}</span>
      ) : null}
    </div>
  );
}

function EmptyInline({ label }: { label: string }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-card px-4 py-6 text-center text-[12px] text-foreground/55">
      {label}にぴったりの結果はまだありません
    </p>
  );
}

// ============================================================================
// 住人カード
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
