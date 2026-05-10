import { notFound } from 'next/navigation';
import { eq, and, isNull, desc, asc } from 'drizzle-orm';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  CreatorBadge,
  ResidencyBadge,
} from '@locore/ui';
import { ExternalLink } from '@locore/ui/icons';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { ArticleGrid } from '../../../components/ArticleGrid';
import {
  UserServicesList,
  type PublicService,
} from '../../../components/profile/UserServicesList';
import { ContactButton } from '../../../components/profile/ContactButton';
import { FollowButton } from '../../../components/profile/FollowButton';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getFollowCounts, isFollowing } from '@/lib/follow/actions';
import type { Article } from '../../../lib/mock';

export const dynamic = 'force-dynamic';

/**
 * ユーザープロフィールページ。
 *
 * - 書き手 / 読者 を区別せず、誰でも持つ「公開プロフィール」として扱う。
 * - mock の wr_xxx ID は従来通り mock から、UUID は DB から解決する。
 * - DB 上のユーザーは sns_links / writer_profiles を JOIN して取得。
 * - 「この人のおすすめ記事」をタイルグリッドで並べる。
 */

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  x: 'X',
  threads: 'Threads',
  blog: 'Blog',
};

type DurationMap = Record<string, '1h' | '半日' | '1日' | '数時間'>;
const durationMap: DurationMap = {
  half_day: '半日',
  full_day: '1日',
  few_hours: '数時間',
  other: '半日',
};

type ResolvedWriter = {
  id: string;
  name: string;
  avatarUrl: string;
  bio: string;
  city: string;
  residencyYears: number;
  tier: 'S' | 'A' | 'B';
  isFounding: boolean;
  isVerifiedCreator: boolean;
  followerCount: number;
  snsLinks: { id: string; platform: string; url: string }[];
  /** DB ユーザーかどうか（mock writer は services / chat 機能なし） */
  isDbUser: boolean;
  services: PublicService[];
};

async function loadWriter(id: string): Promise<{
  writer: ResolvedWriter;
  articles: Article[];
} | null> {
  // DB ファースト（mock fallback は廃止）
  const uuidPat =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPat.test(id)) return null;

  try {
    const db = getDb();

    const userRows = await db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        bio: schema.users.bio,
        role: schema.users.role,
        deletedAt: schema.users.deletedAt,
        wpTier: schema.writerProfiles.tier,
        wpYears: schema.writerProfiles.residencyYears,
        wpCountry: schema.writerProfiles.residencyCountry,
        wpFounding: schema.writerProfiles.foundingMember,
      })
      .from(schema.users)
      .leftJoin(
        schema.writerProfiles,
        eq(schema.writerProfiles.userId, schema.users.id),
      )
      .where(eq(schema.users.id, id))
      .limit(1);

    if (userRows.length === 0) return null;
    const u = userRows[0]!;
    if (u.deletedAt) return null;

    const [snsRows, dbArticles, serviceRows] = await Promise.all([
      db
        .select({
          id: schema.snsLinks.id,
          platform: schema.snsLinks.platform,
          url: schema.snsLinks.url,
        })
        .from(schema.snsLinks)
        .where(eq(schema.snsLinks.userId, u.id)),
      db
        .select({
          id: schema.articles.id,
          title: schema.articles.title,
          body: schema.articles.body,
          coverImageUrl: schema.articles.coverImageUrl,
          writerId: schema.articles.writerId,
          cityId: schema.articles.cityId,
          priceJpy: schema.articles.priceJpy,
          tags: schema.articles.tags,
          durationType: schema.articles.durationType,
          articleType: schema.articles.articleType,
          createdAt: schema.articles.createdAt,
          publishedAt: schema.articles.publishedAt,
          cityNameJa: schema.cities.nameJa,
        })
        .from(schema.articles)
        .leftJoin(schema.cities, eq(schema.articles.cityId, schema.cities.id))
        .where(
          and(
            eq(schema.articles.writerId, u.id),
            eq(schema.articles.status, 'published'),
            isNull(schema.articles.deletedAt),
          ),
        )
        .orderBy(desc(schema.articles.publishedAt))
        .limit(30),
      db
        .select({
          id: schema.userServices.id,
          title: schema.userServices.title,
          description: schema.userServices.description,
          category: schema.userServices.category,
          priceJpy: schema.userServices.priceJpy,
          priceUnit: schema.userServices.priceUnit,
          contactMethod: schema.userServices.contactMethod,
          externalUrl: schema.userServices.externalUrl,
        })
        .from(schema.userServices)
        .where(
          and(
            eq(schema.userServices.userId, u.id),
            eq(schema.userServices.isActive, true),
          ),
        )
        .orderBy(asc(schema.userServices.position)),
    ]);

    const articles: Article[] = dbArticles.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body ?? '',
      coverImageUrl:
        a.coverImageUrl ?? `https://picsum.photos/seed/${a.id}/960/640`,
      writerId: a.writerId,
      cityId: a.cityId,
      area: a.cityNameJa ?? 'パリ',
      priceJpy: a.priceJpy,
      tags: a.tags ?? [],
      durationType: durationMap[a.durationType ?? 'other'] ?? '半日',
      articleType: a.articleType,
      createdAt: a.createdAt.toISOString(),
      publishedAt: (a.publishedAt ?? a.createdAt).toISOString(),
      localScoreAverage: 70,
      satisfactionAverage: 4.5,
      reviewCount: 0,
      purchaseCount: 0,
      spotIds: [],
    }));

    const fallbackAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      u.displayName ?? 'L',
    )}`;

    return {
      writer: {
        id: u.id,
        name: u.displayName ?? '匿名ユーザー',
        avatarUrl: u.avatarUrl ?? fallbackAvatar,
        bio: u.bio ?? '',
        city: u.wpCountry ?? '—',
        residencyYears: u.wpYears ?? 0,
        tier: (u.wpTier ?? 'B') as 'S' | 'A' | 'B',
        isFounding: u.wpFounding ?? false,
        isVerifiedCreator: false,
        followerCount: 0,
        snsLinks: snsRows.map((r) => ({
          id: r.id,
          platform: r.platform,
          url: r.url,
        })),
        isDbUser: true,
        services: serviceRows.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          category: s.category,
          priceJpy: s.priceJpy,
          priceUnit: s.priceUnit,
          contactMethod:
            (s.contactMethod as 'chat' | 'external_url') ?? 'chat',
          externalUrl: s.externalUrl,
        })),
      },
      articles,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[writers/[id]] DB lookup failed:', err);
    return null;
  }
}

export default async function WriterPage({ params }: { params: { id: string } }) {
  const [resolved, viewer] = await Promise.all([
    loadWriter(params.id),
    getCurrentUser(),
  ]);
  if (!resolved) return notFound();
  const { writer, articles } = resolved;

  const isWriter =
    writer.tier === 'S' ||
    writer.tier === 'A' ||
    writer.tier === 'B' ||
    articles.length > 0;

  // フォロー数 + 自分のフォロー状態（DB ユーザーのみ）
  const followCounts = writer.isDbUser
    ? await getFollowCounts(writer.id)
    : { followers: 0, following: 0 };
  const viewerIsFollowing =
    writer.isDbUser && viewer && viewer.id !== writer.id
      ? await isFollowing(writer.id)
      : false;
  const isOwn = !!viewer && viewer.id === writer.id;

  return (
    <main className="bg-background">
      <div className="border-b border-primary-100 bg-gradient-to-br from-primary-50/50 via-white to-primary-50/30">
        <div className="mx-auto flex max-w-screen-lg flex-col items-start gap-6 px-4 py-12 sm:flex-row sm:px-6">
          <Avatar size="xl" className="shadow-sm ring-2 ring-primary-100">
            <AvatarImage src={writer.avatarUrl} alt={writer.name} />
            <AvatarFallback>{writer.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] font-bold tracking-tight">
                {writer.name}
              </h1>
              {isWriter ? (
                <ResidencyBadge
                  tier={writer.tier}
                  years={writer.residencyYears}
                />
              ) : null}
              {writer.isVerifiedCreator ? (
                <CreatorBadge type="verified" />
              ) : null}
              {writer.isFounding ? <CreatorBadge type="founding" /> : null}
            </div>
            {/* フォロー数 / フォロー中数（誰でも見られるが、リスト自体は非公開） */}
            {writer.isDbUser ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[13px] text-foreground/60">
                {isWriter && writer.residencyYears > 0 ? (
                  <>
                    <span>パリ在住 {writer.residencyYears} 年</span>
                    <span className="text-foreground/30">·</span>
                  </>
                ) : null}
                <span>
                  <strong className="tabular text-foreground/80">
                    {followCounts.followers.toLocaleString('ja-JP')}
                  </strong>{' '}
                  フォロワー
                </span>
                <span className="text-foreground/30">·</span>
                <span>
                  <strong className="tabular text-foreground/80">
                    {followCounts.following.toLocaleString('ja-JP')}
                  </strong>{' '}
                  フォロー中
                </span>
              </p>
            ) : isWriter && writer.residencyYears > 0 ? (
              <p className="mt-2 text-[13px] text-foreground/60">
                パリ在住 {writer.residencyYears} 年
              </p>
            ) : null}
            {writer.bio ? (
              <p className="mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-[1.85] text-neutral-700">
                {writer.bio}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {writer.snsLinks.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-primary-700 ring-1 ring-primary-100 transition hover:bg-primary-50 hover:ring-primary-300"
                >
                  <ExternalLink className="h-3 w-3" />
                  {PLATFORM_LABEL[s.platform] ?? s.platform.toUpperCase()}
                </a>
              ))}
              {writer.isDbUser && !isOwn ? (
                <FollowButton
                  targetUserId={writer.id}
                  initialFollowing={viewerIsFollowing}
                  initialFollowerCount={followCounts.followers}
                  viewerLoggedIn={!!viewer}
                />
              ) : null}
              {writer.isDbUser ? (
                <ContactButton
                  ownerUserId={writer.id}
                  viewerUserId={viewer?.id ?? null}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {writer.services.length > 0 ? (
        <section className="mx-auto max-w-screen-xl px-4 pt-10 sm:px-6">
          <UserServicesList
            ownerUserId={writer.id}
            ownerName={writer.name}
            services={writer.services}
            viewerUserId={viewer?.id ?? null}
          />
        </section>
      ) : null}

      <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-700">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              この人のおすすめ
            </p>
            <h2 className="mt-2 text-[22px] font-bold tracking-tight">
              {writer.name} の記事
              <span className="ml-2 text-[14px] font-medium text-foreground/50">
                {articles.length} 本
              </span>
            </h2>
          </div>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-md bg-card p-8 text-center text-[13px] text-foreground/60 ring-1 ring-primary-100">
            {writer.name} はまだ記事を公開していません。
          </div>
        ) : (
          <ArticleGrid articles={articles} hideAuthor />
        )}
      </section>
    </main>
  );
}

// 静的生成は使わず force-dynamic で DB から動的に解決
