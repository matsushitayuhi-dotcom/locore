import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, isNull } from 'drizzle-orm';
import {
  MapPin,
  Briefcase,
  Calendar,
  Coffee,
  MessageCircle,
  ArrowLeft,
  Home as HomeIcon,
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

/**
 * /residents/[id] — 住人の公開プロフィール（マッチングアプリ風）。
 *
 * 表示方針:
 *  - 大きなアバター + 表示名 + "気軽に会える" バッジ
 *  - 居住地、出身、在住年数、業種、家族構成 を見出しエリアに
 *  - 自己紹介（bio）
 *  - 「探していること」を強調表示
 *  - 興味タグ
 *  - 話せる言語（レベル付き）
 *  - 「メッセージを送る」CTA
 *
 * /writers/[id] と違ってこちらは記事のリストは出さない。
 * 交流目的のプロフィール閲覧に絞る。
 */

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export async function generateMetadata({ params }: Params) {
  const db = getDb();
  const rows = await db
    .select({ name: schema.users.displayName })
    .from(schema.users)
    .where(and(eq(schema.users.id, params.id), isNull(schema.users.deletedAt)))
    .limit(1);
  const name = rows[0]?.name ?? '住人';
  return {
    title: `${name} のプロフィール — Locore`,
  };
}

export default async function ResidentDetailPage({ params }: Params) {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
      bio: schema.users.bio,
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
      role: schema.users.role,
    })
    .from(schema.users)
    .where(and(eq(schema.users.id, params.id), isNull(schema.users.deletedAt)))
    .limit(1);

  const r = rows[0];
  if (!r) notFound();

  const me = await getCurrentUser();
  const isMe = me?.id === r.id;

  const countryLabel = r.residencyCountry
    ? RESIDENCE_COUNTRY_BY_CODE[r.residencyCountry] ?? r.residencyCountry
    : null;
  const yearsLabel = residenceYearsLabel(r.arrivalYear);
  const langs = (r.languages as Array<{ code: string; level: LanguageLevel }>) ?? [];
  const interests = (r.interests as string[]) ?? [];
  const lookingFor = (r.lookingFor as string[]) ?? [];

  const isWriter = r.role === 'resident_writer' || r.role === 'editor';

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

        {/* Hero */}
        <section className="mt-4 overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {/* Cover gradient */}
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
              {r.openToMeetups ? (
                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary-500 px-3 py-1 text-[11px] font-bold text-neutral-950 shadow-sm">
                  <Coffee className="h-3 w-3" />
                  気軽に会える
                </span>
              ) : null}
            </div>
          </div>

          <div className="px-6 pb-6 pt-16 sm:px-8 sm:pb-8">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1
                className="text-[24px] font-semibold tracking-tight sm:text-[28px]"
                style={{
                  fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
                }}
              >
                {r.displayName}
              </h1>
              {isWriter ? (
                <span className="rounded-full bg-accent-300/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/75">
                  Writer
                </span>
              ) : null}
            </div>

            {/* メタ行 */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-foreground/65">
              {countryLabel || r.residencyCity ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {r.residencyCity ? `${r.residencyCity}` : ''}
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
            ) : null}

            {/* CTA */}
            {!isMe ? (
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href={`/chat?to=${r.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
                >
                  <MessageCircle className="h-4 w-4" />
                  メッセージを送る
                </Link>
                {isWriter ? (
                  <Link
                    href={`/writers/${r.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[13px] font-medium text-foreground ring-1 ring-border transition hover:bg-muted"
                  >
                    執筆ページを見る
                  </Link>
                ) : null}
              </div>
            ) : (
              <Link
                href="/settings/profile"
                className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[12px] font-medium text-foreground ring-1 ring-border hover:bg-muted"
              >
                プロフィールを編集
              </Link>
            )}
          </div>
        </section>

        {/* 探していること */}
        {lookingFor.length > 0 ? (
          <section className="mt-5 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.18em] text-primary-300">
              探していること
            </h2>
            <p className="mt-1 text-[11px] text-foreground/55">
              「こんな繋がりが欲しい」を本人が公開しているシグナル
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {lookingFor.map((t) => (
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
          </section>
        ) : null}

        {/* 興味 */}
        {interests.length > 0 ? (
          <section className="mt-5 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              興味・趣味
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {interests.map((t) => (
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
          </section>
        ) : null}

        {/* 言語 */}
        {langs.length > 0 ? (
          <section className="mt-5 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              話せる言語
            </h2>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {langs.map((l) => {
                const label =
                  COMMON_LANGUAGES.find((x) => x.code === l.code)?.label ?? l.code;
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
          </section>
        ) : null}

        {/* 空プロフィールの案内 */}
        {!r.bio &&
        interests.length === 0 &&
        lookingFor.length === 0 &&
        langs.length === 0 ? (
          <section className="mt-5 rounded-2xl border border-dashed border-border bg-card p-6 text-center text-[12px] text-foreground/55">
            この方はまだプロフィール詳細を入力していません。
          </section>
        ) : null}
      </div>
    </main>
  );
}
