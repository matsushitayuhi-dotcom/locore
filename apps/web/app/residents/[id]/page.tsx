import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  MapPin,
  Briefcase,
  Calendar,
  Coffee,
  MessageCircle,
  ArrowLeft,
  Home as HomeIcon,
  PenSquare,
  Heart,
  Search,
  Globe,
  Instagram,
  Youtube,
  Pencil,
  Plus,
  BadgeCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';
import {
  FAMILY_STAGE_LABEL,
  COMMON_LANGUAGES,
  LANGUAGE_LEVEL_LABEL,
  type FamilyStage,
  type LanguageLevel,
} from '@/lib/resident/constants';
import {
  RESIDENCE_COUNTRY_BY_CODE,
  residenceYearsLabel,
} from '@/lib/resident/masters';
import { getFollowCounts, isFollowing } from '@/lib/follow/actions';
import { FollowButton } from '@/components/profile/FollowButton';
import { UserServicesList } from '@/components/profile/UserServicesList';
import { CommunityCard } from '@/components/community/CommunityCard';
import {
  type CommunityKind,
  type CommunityStatus,
} from '@/lib/community/constants';

/**
 * /residents/[id] — 住人の公開プロフィール（マッチングアプリ + ライタープロフィール）。
 *
 * セクション構成:
 *   1. ヒーロー（カバー + アバター + 名前 + バッジ + メタ + bio + CTA）
 *   2. スタッツ（参加日 / 記事数 / 投稿数 / フォロワー / フォロー中）
 *   3. クイックファクト（出身 / 在住 / 業種 / 家族構成）
 *   4. 探していること（強調）
 *   5. 興味タグ
 *   6. 話せる言語
 *   7. SNS リンク
 *   8. この方の記事（writer のみ）
 *   9. この方のコミュニティ投稿（直近）
 *  10. 空セクションの編集 CTA（isMe のみ）
 *
 * クエリは "defensive" 設計:
 *   - manual/0038 未適用環境では拡張カラムが無く SELECT が失敗するので
 *     try/catch で basic カラムだけにフォールバック
 */

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

// ============================================================================
// データ取得（defensive）
// ============================================================================

type ResidentRow = {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  createdAt: Date;
  homeRegion: string | null;
  residencyCountry: string | null;
  residencyCity: string | null;
  arrivalYear: number | null;
  familyStage: string | null;
  occupation: string | null;
  languages: Array<{ code: string; level: LanguageLevel }>;
  interests: string[];
  lookingFor: string[];
  openToMeetups: boolean;
};

async function loadResident(id: string): Promise<ResidentRow | null> {
  const db = getDb();
  try {
    const rows = await db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        email: schema.users.email,
        avatarUrl: schema.users.avatarUrl,
        bio: schema.users.bio,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
        homeRegion: schema.users.homeRegion,
        residencyCountry: schema.users.residencyCountry,
        residencyCity: schema.users.residencyCity,
        arrivalYear: schema.users.arrivalYear,
        familyStage: schema.users.familyStage,
        occupation: schema.users.occupation,
        languages: schema.users.languages,
        interests: schema.users.interests,
        lookingFor: schema.users.lookingFor,
        openToMeetups: schema.users.openToMeetups,
      })
      .from(schema.users)
      .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      ...r,
      languages: (r.languages ?? []) as Array<{
        code: string;
        level: LanguageLevel;
      }>,
      interests: (r.interests ?? []) as string[],
      lookingFor: (r.lookingFor ?? []) as string[],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      // manual/0038 が未適用な環境 — basic カラムだけで再 SELECT
      console.warn(
        '[residents/[id]] resident profile columns missing — falling back. ' +
          'Apply manual/0038_resident_profile_fields.sql.',
      );
      try {
        const rows = await db
          .select({
            id: schema.users.id,
            displayName: schema.users.displayName,
            email: schema.users.email,
            avatarUrl: schema.users.avatarUrl,
            bio: schema.users.bio,
            role: schema.users.role,
            createdAt: schema.users.createdAt,
          })
          .from(schema.users)
          .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
          .limit(1);
        const r = rows[0];
        if (!r) return null;
        return {
          ...r,
          homeRegion: null,
          residencyCountry: null,
          residencyCity: null,
          arrivalYear: null,
          familyStage: null,
          occupation: null,
          languages: [],
          interests: [],
          lookingFor: [],
          openToMeetups: false,
        };
      } catch {
        return null;
      }
    }
    console.error('[residents/[id]] load failed:', msg);
    return null;
  }
}

async function loadUserArticles(userId: string) {
  const db = getDb();
  try {
    return await db
      .select({
        id: schema.articles.id,
        title: schema.articles.title,
        coverImageUrl: schema.articles.coverImageUrl,
        articleType: schema.articles.articleType,
        priceJpy: schema.articles.priceJpy,
        publishedAt: schema.articles.publishedAt,
      })
      .from(schema.articles)
      .where(
        and(
          eq(schema.articles.writerId, userId),
          eq(schema.articles.status, 'published'),
        ),
      )
      .orderBy(desc(schema.articles.publishedAt))
      .limit(6);
  } catch {
    return [];
  }
}

async function countUserArticles(userId: string): Promise<number> {
  const db = getDb();
  try {
    const rows = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(schema.articles)
      .where(
        and(
          eq(schema.articles.writerId, userId),
          eq(schema.articles.status, 'published'),
        ),
      );
    return rows[0]?.cnt ?? 0;
  } catch {
    return 0;
  }
}

async function loadUserCommunityPosts(userId: string) {
  const db = getDb();
  try {
    const rows = await db
      .select({
        id: schema.communityPosts.id,
        kind: schema.communityPosts.kind,
        title: schema.communityPosts.title,
        body: schema.communityPosts.body,
        authorId: schema.communityPosts.authorId,
        authorName: schema.users.displayName,
        authorAvatarUrl: schema.users.avatarUrl,
        locationText: schema.communityPosts.locationText,
        priceAmount: schema.communityPosts.priceAmount,
        priceCurrency: schema.communityPosts.priceCurrency,
        priceUnit: schema.communityPosts.priceUnit,
        photos: schema.communityPosts.photos,
        metadata: schema.communityPosts.metadata,
        status: schema.communityPosts.status,
        expiresAt: schema.communityPosts.expiresAt,
        closedAt: schema.communityPosts.closedAt,
        viewCount: schema.communityPosts.viewCount,
        createdAt: schema.communityPosts.createdAt,
        updatedAt: schema.communityPosts.updatedAt,
      })
      .from(schema.communityPosts)
      .leftJoin(
        schema.users,
        eq(schema.users.id, schema.communityPosts.authorId),
      )
      .where(
        and(
          eq(schema.communityPosts.authorId, userId),
          eq(schema.communityPosts.status, 'active'),
        ),
      )
      .orderBy(desc(schema.communityPosts.createdAt))
      .limit(6);
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind as CommunityKind,
      title: r.title,
      body: r.body,
      authorId: r.authorId,
      authorName: r.authorName,
      authorAvatarUrl: r.authorAvatarUrl,
      locationText: r.locationText,
      priceAmount: r.priceAmount,
      priceCurrency: r.priceCurrency ?? 'EUR',
      priceUnit: r.priceUnit,
      photos: (r.photos as string[]) ?? [],
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      status: r.status as CommunityStatus,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      closedAt: r.closedAt ? r.closedAt.toISOString() : null,
      viewCount: r.viewCount,
      contactEmail: null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

async function loadSnsLinks(userId: string) {
  const db = getDb();
  try {
    return await db
      .select({
        id: schema.snsLinks.id,
        platform: schema.snsLinks.platform,
        url: schema.snsLinks.url,
      })
      .from(schema.snsLinks)
      .where(eq(schema.snsLinks.userId, userId));
  } catch {
    return [];
  }
}

/**
 * ユーザーの本人確認状態を取得。
 *
 * 真実のソースは residency_verifications テーブル (歴史的経緯でこの名前)。
 * 最新の申請の status='approved' なら本人確認済みとして扱う。
 *
 * writer_profiles.residency_verified_at は resident_writer 向けキャッシュで、
 * reader / light_diarist などには存在しないため、こちらは使わない。
 */
async function loadVerifiedStatus(userId: string): Promise<boolean> {
  const db = getDb();
  try {
    const rows = await db
      .select({ status: schema.residencyVerifications.status })
      .from(schema.residencyVerifications)
      .where(eq(schema.residencyVerifications.userId, userId))
      .orderBy(desc(schema.residencyVerifications.submittedAt))
      .limit(1);
    return rows[0]?.status === 'approved';
  } catch {
    // テーブル / カラム未マイグレーション環境では false を返す (落とさない)
    return false;
  }
}

/**
 * ユーザーが出品している有償サービス (相談・ガイド・翻訳など) を取得。
 * isActive=true のものだけ、position 昇順で返す。
 */
async function loadUserServices(userId: string) {
  const db = getDb();
  // 0046 マイグレーション前後の両方で動くように、まず city/audience 付きで試し
  // 失敗したら最小カラムでフォールバック。
  try {
    const rows = await db
      .select({
        id: schema.userServices.id,
        title: schema.userServices.title,
        description: schema.userServices.description,
        category: schema.userServices.category,
        priceJpy: schema.userServices.priceJpy,
        priceUnit: schema.userServices.priceUnit,
        contactMethod: schema.userServices.contactMethod,
        externalUrl: schema.userServices.externalUrl,
        audience: schema.userServices.audience,
        cityNameJa: schema.cities.nameJa,
      })
      .from(schema.userServices)
      .leftJoin(
        schema.cities,
        eq(schema.cities.id, schema.userServices.cityId),
      )
      .where(
        and(
          eq(schema.userServices.userId, userId),
          eq(schema.userServices.isActive, true),
        ),
      )
      .orderBy(asc(schema.userServices.position));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      priceJpy: r.priceJpy,
      priceUnit: r.priceUnit,
      contactMethod: (r.contactMethod ?? 'chat') as 'chat' | 'external_url',
      externalUrl: r.externalUrl,
      cityNameJa: r.cityNameJa ?? null,
      audience:
        (r.audience as 'traveler' | 'resident' | 'both' | null) ?? null,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/does not exist/i.test(msg)) {
      console.warn('[residents/[id]] loadUserServices failed:', msg);
      return [];
    }
    try {
      const rows = await db
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
            eq(schema.userServices.userId, userId),
            eq(schema.userServices.isActive, true),
          ),
        )
        .orderBy(asc(schema.userServices.position));
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        priceJpy: r.priceJpy,
        priceUnit: r.priceUnit,
        contactMethod: (r.contactMethod ?? 'chat') as 'chat' | 'external_url',
        externalUrl: r.externalUrl,
        cityNameJa: null as string | null,
        audience: null as 'traveler' | 'resident' | 'both' | null,
      }));
    } catch {
      return [];
    }
  }
}

// ============================================================================
// メタデータ
// ============================================================================

export async function generateMetadata({ params }: Params) {
  const db = getDb();
  const rows = await db
    .select({ name: schema.users.displayName })
    .from(schema.users)
    .where(and(eq(schema.users.id, params.id), isNull(schema.users.deletedAt)))
    .limit(1);
  const name = rows[0]?.name ?? '住人';
  return { title: `${name} のプロフィール — Locore` };
}

// ============================================================================
// ページ本体
// ============================================================================

export default async function ResidentDetailPage({ params }: Params) {
  const r = await loadResident(params.id);
  if (!r) notFound();

  const me = await getCurrentUser();
  const isMe = me?.id === r.id;

  const [
    followCounts,
    viewerFollows,
    articles,
    articleCount,
    communityPosts,
    snsLinks,
    userServices,
    isVerified,
  ] = await Promise.all([
    getFollowCounts(r.id),
    me && !isMe ? isFollowing(r.id) : Promise.resolve(false),
    loadUserArticles(r.id),
    countUserArticles(r.id),
    loadUserCommunityPosts(r.id),
    loadSnsLinks(r.id),
    loadUserServices(r.id),
    loadVerifiedStatus(r.id),
  ]);

  const countryLabel = r.residencyCountry
    ? RESIDENCE_COUNTRY_BY_CODE[r.residencyCountry] ?? r.residencyCountry
    : null;
  const yearsLabel = residenceYearsLabel(r.arrivalYear);
  const isWriter = r.role === 'resident_writer' || r.role === 'editor';
  const memberSince = formatMonthYear(r.createdAt);

  // プロフィールが「実質空」か判定（編集を促す表示用）
  const profileIsEmpty =
    !r.bio &&
    !r.homeRegion &&
    !r.residencyCity &&
    !r.occupation &&
    r.interests.length === 0 &&
    r.lookingFor.length === 0 &&
    r.languages.length === 0;

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-md px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/residents"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          住人ディレクトリに戻る
        </Link>

        {/* ============================================================== */}
        {/* 1. Hero                                                          */}
        {/* ============================================================== */}
        <section className="mt-4 overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          <div className="relative h-28 bg-gradient-to-br from-primary-500/40 via-primary-300/20 to-card sm:h-36">
            <div className="absolute inset-x-6 -bottom-12 flex items-end justify-between gap-3 sm:inset-x-8">
              <Avatar
                size="xl"
                className="ring-4 ring-card"
                style={{ height: 112, width: 112 }}
              >
                {r.avatarUrl ? <AvatarImage src={r.avatarUrl} alt="" /> : null}
                <AvatarFallback>
                  {r.displayName[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                {r.openToMeetups ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-500 px-3 py-1 text-[11px] font-bold text-neutral-950 shadow-sm">
                    <Coffee className="h-3 w-3" />
                    気軽に会える
                  </span>
                ) : null}
                {isMe ? (
                  <Link
                    href="/settings/profile"
                    className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-[11px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
                  >
                    <Pencil className="h-3 w-3" />
                    編集
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 pt-16 sm:px-8 sm:pb-8">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1
                className="text-[24px] font-semibold tracking-tight sm:text-[28px]"
                style={{
                  fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
                }}
              >
                {r.displayName}
              </h1>
              {isVerified ? (
                <span
                  title="本人確認済み"
                  aria-label="本人確認済み"
                  className="inline-flex items-center gap-1 rounded-full bg-success-500/10 px-2 py-0.5 text-[10px] font-bold text-success-500 ring-1 ring-success-500/30"
                >
                  <BadgeCheck className="h-3.5 w-3.5" fill="currentColor" stroke="white" strokeWidth={2} />
                  <span className="sm:inline">本人確認済み</span>
                </span>
              ) : null}
              {isWriter ? (
                <span
                  className="rounded-full bg-accent-300/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/75"
                >
                  Writer
                </span>
              ) : null}
            </div>

            {/* メタ行 */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-foreground/65">
              {countryLabel || r.residencyCity ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {r.residencyCity ?? ''}
                  {r.residencyCity && countryLabel ? '、' : ''}
                  {countryLabel ?? ''}
                </span>
              ) : null}
              {yearsLabel ? (
                <span className="inline-flex items-center gap-1 tabular">
                  <Calendar className="h-3.5 w-3.5" />
                  {yearsLabel}
                </span>
              ) : null}
              {r.homeRegion ? (
                <span className="inline-flex items-center gap-1">
                  <HomeIcon className="h-3.5 w-3.5" />
                  出身: {r.homeRegion}
                </span>
              ) : null}
              {r.occupation ? (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {r.occupation}
                </span>
              ) : null}
              {r.familyStage ? (
                <span>
                  {FAMILY_STAGE_LABEL[r.familyStage as FamilyStage] ?? ''}
                </span>
              ) : null}
            </div>

            {/* Bio */}
            {r.bio ? (
              <p className="mt-5 whitespace-pre-line text-[14px] leading-[1.85] text-foreground/80">
                {r.bio}
              </p>
            ) : isMe ? (
              <Link
                href="/settings/profile"
                className="mt-5 inline-block rounded-md border border-dashed border-border bg-muted px-3 py-2 text-[12px] text-foreground/60 hover:bg-primary-500/5 hover:text-primary-300"
              >
                <Pencil className="mr-1.5 inline h-3 w-3" />
                自己紹介を追加する
              </Link>
            ) : null}

            {/* CTA */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {!isMe ? (
                <>
                  <FollowButton
                    targetUserId={r.id}
                    initialFollowing={viewerFollows}
                    initialFollowerCount={followCounts.followers}
                    viewerLoggedIn={!!me}
                  />
                  <Link
                    href={`/chat?to=${r.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
                  >
                    <MessageCircle className="h-4 w-4" />
                    メッセージを送る
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 1.5 フォロー サブナビ                                            */}
        {/* ============================================================== */}
        <nav
          aria-label="フォロー関連のページへ"
          className="mt-3 flex flex-wrap items-center gap-1.5 rounded-full bg-card p-1 ring-1 ring-border"
        >
          <Link
            href={`/residents/${r.id}/followers`}
            className="inline-flex items-baseline gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-foreground/80 transition hover:bg-primary-500/10 hover:text-primary-300"
          >
            フォロワー
            <span className="text-[13px] tabular text-foreground">
              {followCounts.followers.toLocaleString('ja-JP')}
            </span>
          </Link>
          <span aria-hidden className="h-3 w-px bg-border" />
          <Link
            href={`/residents/${r.id}/following`}
            className="inline-flex items-baseline gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-foreground/80 transition hover:bg-primary-500/10 hover:text-primary-300"
          >
            フォロー中
            <span className="text-[13px] tabular text-foreground">
              {followCounts.following.toLocaleString('ja-JP')}
            </span>
          </Link>
        </nav>

        {/* ============================================================== */}
        {/* 2. Stats bar                                                    */}
        {/* ============================================================== */}
        <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            label="参加"
            value={memberSince}
            hint="Locore 登録月"
          />
          <StatTile
            label="記事"
            value={`${articleCount}`}
            hint="公開中"
          />
          <StatTile
            label="フォロワー"
            value={followCounts.followers.toLocaleString('ja-JP')}
            href={`/residents/${r.id}/followers`}
          />
          <StatTile
            label="フォロー中"
            value={followCounts.following.toLocaleString('ja-JP')}
            href={`/residents/${r.id}/following`}
          />
        </section>

        {/* ============================================================== */}
        {/* 3. クイックファクトカード                                          */}
        {/* ============================================================== */}
        <section className="mt-4 grid gap-2 sm:grid-cols-2">
          <FactCard
            icon={HomeIcon}
            label="出身"
            value={r.homeRegion}
            placeholder="未登録"
            isMe={isMe}
          />
          <FactCard
            icon={MapPin}
            label="在住"
            value={
              r.residencyCity || countryLabel
                ? `${r.residencyCity ?? ''}${
                    r.residencyCity && countryLabel ? '、' : ''
                  }${countryLabel ?? ''}`
                : null
            }
            placeholder="未登録"
            isMe={isMe}
          />
          <FactCard
            icon={Briefcase}
            label="業種・職業"
            value={r.occupation}
            placeholder="未登録"
            isMe={isMe}
          />
          <FactCard
            icon={Calendar}
            label="在住年数"
            value={yearsLabel}
            placeholder="未登録"
            isMe={isMe}
          />
        </section>

        {/* ============================================================== */}
        {/* 4. 探していること                                                 */}
        {/* ============================================================== */}
        <Section title="探していること" icon={Search} accent>
          {r.lookingFor.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {r.lookingFor.map((t) => (
                <li key={t}>
                  <Link
                    href={`/residents?tag=${encodeURIComponent(t)}`}
                    className="inline-flex items-center rounded-full bg-primary-500/15 px-3 py-1 text-[12px] font-semibold text-primary-300 transition hover:bg-primary-500/25"
                  >
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptySectionHint isMe={isMe}>
              「ママ友募集」「ワイン仲間募集」など、具体的に書くと声をかけてもらいやすくなります。
            </EmptySectionHint>
          )}
        </Section>

        {/* ============================================================== */}
        {/* 5. 興味タグ                                                       */}
        {/* ============================================================== */}
        <Section title="興味・趣味" icon={Heart}>
          {r.interests.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {r.interests.map((t) => (
                <li key={t}>
                  <Link
                    href={`/residents?tag=${encodeURIComponent(t)}`}
                    className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-[12px] text-foreground/75 transition hover:bg-primary-500/10 hover:text-primary-300"
                  >
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptySectionHint isMe={isMe}>
              共通の趣味がある住人同士は一番声をかけやすいです。タグを 3〜5 個入れるのがおすすめ。
            </EmptySectionHint>
          )}
        </Section>

        {/* ============================================================== */}
        {/* 6. 話せる言語                                                     */}
        {/* ============================================================== */}
        {r.languages.length > 0 ? (
          <Section title="話せる言語" icon={Globe}>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {r.languages.map((l) => {
                const label =
                  COMMON_LANGUAGES.find((x) => x.code === l.code)?.label ??
                  l.code;
                return (
                  <li
                    key={l.code}
                    className="flex items-center justify-between rounded-md bg-background/40 px-3 py-1.5 ring-1 ring-border"
                  >
                    <span className="text-[13px] font-medium">{label}</span>
                    <span className="text-[11px] tabular text-foreground/55">
                      {LANGUAGE_LEVEL_LABEL[l.level] ?? l.level}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>
        ) : null}

        {/* ============================================================== */}
        {/* 6.5 提供サービス (相談・ガイド・撮影 等)                          */}
        {/* ============================================================== */}
        {userServices.length > 0 || isMe ? (
          <section className="mt-5 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-primary-300">
                <Briefcase className="h-3.5 w-3.5" />
                提供サービス
              </h2>
              {isMe ? (
                <Link
                  href="/settings/services"
                  className="text-[11px] font-semibold text-primary-300 hover:underline"
                >
                  {userServices.length === 0 ? '+ サービスを追加' : '編集'}
                </Link>
              ) : null}
            </div>
            {userServices.length === 0 ? (
              isMe ? (
                <p className="rounded-md border border-dashed border-border bg-muted px-3 py-3 text-[12px] text-foreground/65">
                  相談・ガイド・撮影など、有償サービスを 1 つ追加すると、
                  読み手が「メッセージ」ではなく
                  「<strong>このサービスをお願いしたい</strong>」と直接動けます。
                  Locore はこの提供サービスから手数料を取りません。
                </p>
              ) : null
            ) : (
              <UserServicesList
                ownerUserId={r.id}
                ownerName={r.displayName}
                services={userServices}
                viewerUserId={me?.id ?? null}
              />
            )}
          </section>
        ) : null}

        {/* ============================================================== */}
        {/* 7. SNS リンク                                                     */}
        {/* ============================================================== */}
        {snsLinks.length > 0 ? (
          <Section title="SNS" icon={Globe}>
            <ul className="flex flex-wrap gap-2">
              {snsLinks.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[12px] font-medium text-foreground ring-1 ring-border hover:bg-primary-500/10 hover:text-primary-300"
                  >
                    {snsIcon(s.platform)}
                    {snsLabel(s.platform)}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {/* ============================================================== */}
        {/* 8. 記事（writer のみ）                                            */}
        {/* ============================================================== */}
        {isWriter && articles.length > 0 ? (
          <Section title={`${r.displayName} さんの記事`} icon={PenSquare}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {articles.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/articles/${a.id}`}
                    className="flex gap-3 rounded-xl bg-background/40 p-3 ring-1 ring-border transition hover:ring-primary-300"
                  >
                    {a.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.coverImageUrl}
                        alt=""
                        className="h-16 w-20 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-16 w-20 shrink-0 rounded-md bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] font-semibold text-foreground hover:text-primary-300">
                        {a.title}
                      </p>
                      <p className="mt-1 text-[11px] tabular text-foreground/55">
                        ¥{a.priceJpy.toLocaleString('ja-JP')} ·{' '}
                        {a.articleType === 'itinerary'
                          ? '旅程'
                          : a.articleType === 'expat_info'
                            ? '駐在者情報'
                            : 'スポット'}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {articleCount > articles.length ? (
              <p className="mt-3 text-[12px] text-foreground/55">
                ほかに {articleCount - articles.length} 本の公開記事があります。
              </p>
            ) : null}
          </Section>
        ) : null}

        {/* ============================================================== */}
        {/* 9. コミュニティ投稿                                              */}
        {/* ============================================================== */}
        {communityPosts.length > 0 ? (
          <Section
            title={`${r.displayName} さんのコミュニティ投稿`}
            icon={MessageCircle}
          >
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {communityPosts.map((p) => (
                <li key={p.id}>
                  <CommunityCard post={p} showKindBadge />
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {/* ============================================================== */}
        {/* 10. 全体的に空 のときの CTA (isMe のみ)                         */}
        {/* ============================================================== */}
        {profileIsEmpty && isMe ? (
          <section className="mt-6 rounded-2xl border-2 border-dashed border-primary-500/40 bg-primary-500/5 p-6 text-center sm:p-8">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-primary-300">
              プロフィールを充実させましょう
            </p>
            <h3
              className="mt-2 text-[18px] font-semibold tracking-tight"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              埋めるほど、声をかけてもらいやすくなります
            </h3>
            <p className="mx-auto mt-2 max-w-md text-[12px] text-foreground/65">
              出身地・在住地・興味・探していることを入力すると、
              /residents の検索ヒット率が上がります。
            </p>
            <Link
              href="/settings/profile"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-5 py-2.5 text-[13px] font-bold text-neutral-950 hover:bg-primary-300"
            >
              <Plus className="h-3.5 w-3.5" />
              プロフィールを編集する
            </Link>
          </section>
        ) : null}

        {profileIsEmpty && !isMe ? (
          <section className="mt-6 rounded-2xl border border-dashed border-border bg-card p-6 text-center text-[12px] text-foreground/55">
            この方はまだプロフィール詳細を入力していません。
          </section>
        ) : null}
      </div>
    </main>
  );
}

// ============================================================================
// 小さなプレゼンテーション部品
// ============================================================================

function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
        {label}
      </p>
      <p className="mt-0.5 text-[16px] font-semibold tabular tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-foreground/45">{hint}</p>
      ) : null}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-xl bg-card p-3 ring-1 ring-border transition hover:ring-primary-300 sm:p-4"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-border sm:p-4">
      {inner}
    </div>
  );
}

function FactCard({
  icon: Icon,
  label,
  value,
  placeholder,
  isMe,
}: {
  icon: typeof HomeIcon;
  label: string;
  value: string | null;
  placeholder: string;
  isMe: boolean;
}) {
  const filled = !!value;
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-border sm:p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-foreground/55">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      {filled ? (
        <p className="mt-1 text-[13px] font-medium">{value}</p>
      ) : isMe ? (
        <Link
          href="/settings/profile"
          className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
        >
          <Pencil className="h-3 w-3" />
          追加する
        </Link>
      ) : (
        <p className="mt-1 text-[12px] italic text-foreground/40">
          {placeholder}
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: typeof Search;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
      <h2
        className={
          'flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] ' +
          (accent ? 'text-primary-300' : 'text-foreground/55')
        }
      >
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptySectionHint({
  isMe,
  children,
}: {
  isMe: boolean;
  children: React.ReactNode;
}) {
  if (isMe) {
    return (
      <Link
        href="/settings/profile"
        className="block rounded-md border border-dashed border-border bg-muted px-3 py-3 text-[12px] text-foreground/65 hover:bg-primary-500/5 hover:text-primary-300"
      >
        <Pencil className="mr-1.5 inline h-3 w-3" />
        追加する — {children}
      </Link>
    );
  }
  return (
    <p className="rounded-md bg-muted px-3 py-2 text-[12px] italic text-foreground/55">
      未登録です
    </p>
  );
}

function formatMonthYear(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}.${m}`;
}

function snsIcon(platform: string) {
  switch (platform) {
    case 'instagram':
      return <Instagram className="h-3.5 w-3.5" />;
    case 'youtube':
      return <Youtube className="h-3.5 w-3.5" />;
    default:
      return <Globe className="h-3.5 w-3.5" />;
  }
}

function snsLabel(platform: string): string {
  const map: Record<string, string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    x: 'X',
    youtube: 'YouTube',
    threads: 'Threads',
    blog: 'Blog',
  };
  return map[platform] ?? platform;
}
