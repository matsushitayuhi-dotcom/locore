import Link from 'next/link';
import { ArrowLeft, SearchX, MapPin, Briefcase, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { SearchBox } from '@/components/SearchBox';
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
import { KIND_LABEL, KIND_BASE_PATH } from '@/lib/community/constants';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams?: { q?: string; in?: string };
};

export const metadata = { title: '検索 — Locore' };

const SERVICE_CATEGORY_LABEL: Record<string, string> = {
  tourism: '観光・現地アテンド',
  consulting: 'コンサル・相談',
  study_abroad: '留学サポート',
  translation: '翻訳・通訳',
  attend: '同行・代行',
  other: 'その他',
};

/**
 * /search — モード別検索。
 *
 * - 旅行者モード (mode === 'traveler' or null):
 *     「記事」「住人」「サービス」の 3 セクション。
 *     記事は title / body の両方を OR で部分一致検索 (トグル廃止)。
 *     `?in=` パラメータは互換目的で受け取るが結果には影響しない。
 * - 駐在員モード (mode === 'resident'):
 *     「コミュニティ」+「住人」の 2 セクション (従来通り)。
 *
 * DB スキーマ変更なし。すべて既存テーブルへの ILIKE 部分一致で実装。
 */
export default async function SearchPage({ searchParams }: Props) {
  const rawQ = (searchParams?.q ?? '').trim();
  const mode = getViewerMode();
  const isResident = mode === 'resident';

  // モード別に並列でクエリ。q が空のときは何も走らせない。
  let articleHits: SearchArticleHit[] = [];
  let communityHits: SearchCommunityHit[] = [];
  let userHits: SearchUserHit[] = [];
  let serviceHits: SearchServiceHit[] = [];

  if (rawQ) {
    if (isResident) {
      [communityHits, userHits] = await Promise.all([
        searchCommunityPosts(rawQ, 30),
        searchUsers(rawQ, 30),
      ]);
    } else {
      // 旅行者モード: 記事 / 住人 / サービスの 3 軸。
      // 記事は title/body OR の searchArticles に統一 (旧 in=title|body トグル廃止)。
      [articleHits, userHits, serviceHits] = await Promise.all([
        searchArticles(rawQ, 60),
        searchUsers(rawQ, 30),
        searchServices(rawQ, 30),
      ]);
    }
  }

  // 記事カードはサムネ付きシンプル表示にする (旧 ArticleGrid は Article 型を期待し、
  // SearchArticleHit には載っていないフィールドを多く要求するため再利用しない)
  await getArticleSocialCounts(articleHits.map((a) => a.id));

  // 結果が全部 0 件か (CTA 表示用)
  const bothEmpty = isResident
    ? rawQ.length > 0 && communityHits.length === 0 && userHits.length === 0
    : rawQ.length > 0 &&
      articleHits.length === 0 &&
      userHits.length === 0 &&
      serviceHits.length === 0;

  const placeholder = isResident
    ? 'コミュニティ投稿・住人を検索'
    : '記事・住人・サービスを検索';

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
            : '記事 (タイトル・本文)、住人プロフィール、そして住人が提供しているサービスを横断検索します。'}
        </p>
      </header>

      <SearchBox
        defaultQuery={rawQ}
        placeholder={placeholder}
        showInToggle={false}
        showLabel
      />

      {/* クエリ未入力 */}
      {!rawQ ? (
        <p className="mt-8 rounded-lg bg-primary-500/10 px-4 py-3 text-[13px] text-foreground/70">
          検索したい言葉を入力してみてください。
        </p>
      ) : null}

      {/* 全部 0 件 */}
      {bothEmpty ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center text-[13px] text-foreground/65">
          <SearchX className="h-8 w-8 text-foreground/35" />
          <p className="text-[14px] font-medium text-foreground/75">
            「{rawQ}」に合う結果は見つかりませんでした
          </p>
          <p className="text-[12px] text-foreground/55">
            キーワードを少し変えてみてください。
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/search"
              className="rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
            >
              条件を変えてもう一度
            </Link>
          </div>
        </div>
      ) : null}

      {/* セクション 1: 旅行者 → 記事 / 駐在員 → コミュニティ */}
      {rawQ && !bothEmpty ? (
        <section className="mt-8">
          <SectionHeader
            label={isResident ? 'コミュニティ' : '記事'}
            count={isResident ? communityHits.length : articleHits.length}
          />
          {isResident ? (
            communityHits.length > 0 ? (
              <CommunityHitList hits={communityHits} />
            ) : (
              <EmptyInline label="コミュニティ投稿" />
            )
          ) : articleHits.length > 0 ? (
            <ArticleHitGrid hits={articleHits} />
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

      {/* セクション 3: サービス (旅行者モードのみ) */}
      {rawQ && !bothEmpty && !isResident ? (
        <section className="mt-10">
          <SectionHeader label="サービス" count={serviceHits.length} />
          {serviceHits.length > 0 ? (
            <ServiceHitGrid hits={serviceHits} />
          ) : (
            <EmptyInline label="サービス" />
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

// ============================================================================
// サービスカード (旅行者モード専用、/residents/[ownerId] へ飛ばす)
// ============================================================================

function ServiceHitGrid({ hits }: { hits: SearchServiceHit[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {hits.map((s) => (
        <li
          key={s.id}
          className="overflow-hidden rounded-xl bg-card ring-1 ring-border transition hover:ring-primary-300"
        >
          {/*
            ServiceCarousel と同じ動作。サービス詳細ページが無いため
            提供者の公開プロフィールへ誘導する。
          */}
          <Link href={`/residents/${s.ownerId}`} className="block">
            <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted">
              {s.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.coverImageUrl}
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
              <div className="flex flex-wrap items-start gap-2">
                {s.category ? (
                  <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-semibold text-primary-300">
                    {SERVICE_CATEGORY_LABEL[s.category] ?? s.category}
                  </span>
                ) : null}
                {s.priceJpy != null ? (
                  <span className="ml-auto text-[13px] font-bold tabular text-primary-300">
                    ¥{s.priceJpy.toLocaleString('ja-JP')}
                    {s.priceUnit ? (
                      <span className="ml-0.5 text-[10px] font-medium text-foreground/60">
                        / {s.priceUnit}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="ml-auto text-[11px] font-medium text-foreground/50">
                    応相談
                  </span>
                )}
              </div>
              <h3 className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug text-foreground hover:text-primary-300">
                {s.title}
              </h3>
              {s.description ? (
                <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-[12px] leading-relaxed text-foreground/65">
                  {s.description}
                </p>
              ) : null}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar size="sm" className="h-6 w-6 shrink-0">
                    {s.ownerAvatarUrl ? (
                      <AvatarImage src={s.ownerAvatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback>
                      {s.ownerDisplayName[0]?.toUpperCase() ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-[11px] font-medium text-foreground/75">
                    {s.ownerDisplayName}
                  </span>
                </div>
                {s.cityNameJa ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground/60">
                    <MapPin className="h-2.5 w-2.5" />
                    {s.cityNameJa}
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
