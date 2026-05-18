import Link from 'next/link';
import { and, desc, isNull, ilike, or, sql, eq, ne } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { Search, MapPin, Briefcase, Calendar, Coffee } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import {
  FAMILY_STAGE_LABEL,
  COMMON_LANGUAGES,
  type FamilyStage,
  type LanguageLevel,
} from '@/lib/resident/constants';

/**
 * /residents — 駐在員（および駐在員と繋がりたい人）の住人ディレクトリ。
 *
 * URL クエリ:
 *   - q       … 表示名 / 自己紹介 / 業種 / 興味タグの部分一致
 *   - country … 在住国コード（ISO 2 文字）
 *   - city    … 在住都市の部分一致
 *   - meetups … '1' なら open_to_meetups=true のみ
 *   - tag     … 興味 or 探していること タグの完全一致
 */

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '住人を探す — Locore',
  description:
    '駐在員のプロフィール一覧。出身地・在住地・興味・探していることから、近所の住人と繋がれます。',
};

type Search = {
  q?: string;
  country?: string;
  city?: string;
  meetups?: string;
  tag?: string;
};

type ResidentRow = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
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

export default async function ResidentsPage({
  searchParams,
}: {
  searchParams?: Search;
}) {
  const db = getDb();
  const q = (searchParams?.q ?? '').trim();
  const country = (searchParams?.country ?? '').trim().toUpperCase();
  const city = (searchParams?.city ?? '').trim();
  const meetupsOnly = searchParams?.meetups === '1';
  const tag = (searchParams?.tag ?? '').trim();

  // 注: is_sample=true のサンプルユーザーもこのリストには表示する。
  // 本番ユーザーと混ざるが、UAT 中は意図的にこの挙動。サンプル一括削除は
  //   DELETE FROM users WHERE is_sample = true;
  // で行う想定 (0044 のヘッダー参照)。
  const filters = [
    isNull(schema.users.deletedAt),
    ne(schema.users.displayName, ''),
  ];
  if (q) {
    filters.push(
      or(
        ilike(schema.users.displayName, `%${q}%`),
        ilike(schema.users.bio, `%${q}%`),
        ilike(schema.users.occupation, `%${q}%`),
        ilike(schema.users.residencyCity, `%${q}%`),
        ilike(schema.users.homeRegion, `%${q}%`),
      )!,
    );
  }
  if (country) {
    filters.push(eq(schema.users.residencyCountry, country));
  }
  if (city) {
    filters.push(ilike(schema.users.residencyCity, `%${city}%`));
  }
  if (meetupsOnly) {
    filters.push(eq(schema.users.openToMeetups, true));
  }
  if (tag) {
    // jsonb 配列に値が含まれているか
    filters.push(
      or(
        sql`${schema.users.interests} @> ${JSON.stringify([tag])}::jsonb`,
        sql`${schema.users.lookingFor} @> ${JSON.stringify([tag])}::jsonb`,
      )!,
    );
  }

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
    })
    .from(schema.users)
    .where(and(...filters))
    .orderBy(desc(schema.users.openToMeetups), desc(schema.users.updatedAt))
    .limit(60);

  const residents = rows as ResidentRow[];

  // 国コード候補（実データから集める）
  const countriesRaw = await db
    .selectDistinctOn([schema.users.residencyCountry], {
      country: schema.users.residencyCountry,
    })
    .from(schema.users)
    .where(
      and(
        isNull(schema.users.deletedAt),
        sql`${schema.users.residencyCountry} IS NOT NULL`,
      ),
    );
  const countries = countriesRaw
    .map((r) => r.country)
    .filter((x): x is string => !!x)
    .sort();

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
              Residents
            </p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-tight sm:text-[26px]">
              住人を探す
            </h1>
            <p className="mt-1 text-[12px] text-foreground/60">
              出身地・興味・探していることでフィルタできます。プロフィールを埋めるほど、声をかけてもらいやすくなります。
            </p>
          </div>
          <Link
            href="/settings/profile"
            className="rounded-full bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
          >
            自分のプロフィールを編集
          </Link>
        </header>

        {/* 検索フォーム */}
        <form
          action="/residents"
          method="GET"
          className="mb-5 grid gap-2 rounded-xl bg-card p-3 ring-1 ring-border sm:grid-cols-[2fr_1fr_1fr_auto] sm:p-4"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="名前・自己紹介・興味から検索"
              className="h-10 w-full rounded-md border border-border bg-background pl-8 pr-2 text-[13px] focus:border-2 focus:border-primary-500 focus:pl-[31px] focus:outline-none"
            />
          </div>
          <select
            name="country"
            defaultValue={country}
            className="h-10 rounded-md border border-border bg-background px-2 text-[13px]"
          >
            <option value="">すべての国</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="city"
            defaultValue={city}
            placeholder="都市（部分一致）"
            className="h-10 rounded-md border border-border bg-background px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none"
          />
          <button
            type="submit"
            className="h-10 rounded-md bg-primary-500 px-4 text-[12px] font-bold text-neutral-950 hover:bg-primary-300"
          >
            検索
          </button>

          <div className="flex flex-wrap items-center gap-2 sm:col-span-4">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px]">
              <input
                type="checkbox"
                name="meetups"
                value="1"
                defaultChecked={meetupsOnly}
                className="h-3.5 w-3.5"
              />
              <Coffee className="h-3 w-3 text-primary-300" />
              気軽に会える人だけ
            </label>
            {tag ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2 py-0.5 text-[11px] font-medium text-primary-300">
                タグ: {tag}
                <Link
                  href={{
                    pathname: '/residents',
                    query: { q, country, city, meetups: meetupsOnly ? '1' : undefined },
                  }}
                  className="ml-1 text-primary-300/70 hover:text-primary-300"
                >
                  ✕
                </Link>
              </span>
            ) : null}
            {(q || country || city || meetupsOnly || tag) ? (
              <Link
                href="/residents"
                className="ml-auto text-[11px] text-foreground/55 hover:underline"
              >
                条件をリセット
              </Link>
            ) : null}
          </div>
        </form>

        {/* 結果 */}
        {residents.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-[13px] text-foreground/55">
            条件に合う住人が見つかりませんでした。
            <br />
            フィルタを緩めて再度お試しください。
          </div>
        ) : (
          <>
            <p className="mb-3 text-[11px] text-foreground/55 tabular">
              {residents.length} 人 {residents.length >= 60 ? '(上位 60 人を表示)' : ''}
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {residents.map((r) => (
                <ResidentCard
                  key={r.id}
                  resident={r}
                  baseQuery={{ q, country, city, meetups: meetupsOnly ? '1' : undefined }}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}

function ResidentCard({
  resident,
  baseQuery,
}: {
  resident: ResidentRow;
  baseQuery: { q?: string; country?: string; city?: string; meetups?: string };
}) {
  const yearsHere =
    resident.arrivalYear !== null
      ? Math.max(0, new Date().getFullYear() - resident.arrivalYear)
      : null;

  return (
    <li className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-border transition hover:ring-primary-300">
      {/* 上段: アバター + 名前 */}
      <div className="flex items-start gap-3">
        <Avatar size="lg" className="ring-1 ring-border">
          {resident.avatarUrl ? (
            <AvatarImage src={resident.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback>
            {resident.displayName[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            href={`/residents/${resident.id}`}
            className="line-clamp-1 text-[14px] font-semibold text-foreground hover:text-primary-300"
          >
            {resident.displayName}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/55">
            {resident.residencyCity || resident.residencyCountry ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {resident.residencyCity ?? ''}
                {resident.residencyCity && resident.residencyCountry ? ', ' : ''}
                {resident.residencyCountry ?? ''}
              </span>
            ) : null}
            {yearsHere !== null ? (
              <span className="inline-flex items-center gap-0.5 tabular">
                <Calendar className="h-3 w-3" />
                在住 {yearsHere}年
              </span>
            ) : null}
          </div>
          {resident.homeRegion ? (
            <p className="mt-0.5 text-[11px] text-foreground/55">
              出身: {resident.homeRegion}
            </p>
          ) : null}
        </div>
        {resident.openToMeetups ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-bold text-primary-300">
            <Coffee className="h-3 w-3" />
            会える
          </span>
        ) : null}
      </div>

      {/* 業種・家族 */}
      {(resident.occupation || resident.familyStage) ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-foreground/65">
          {resident.occupation ? (
            <span className="inline-flex items-center gap-0.5">
              <Briefcase className="h-3 w-3" />
              {resident.occupation}
            </span>
          ) : null}
          {resident.familyStage ? (
            <span>{FAMILY_STAGE_LABEL[resident.familyStage as FamilyStage] ?? ''}</span>
          ) : null}
        </div>
      ) : null}

      {/* Bio 抜粋 */}
      {resident.bio ? (
        <p className="line-clamp-2 text-[12px] leading-relaxed text-foreground/70">
          {resident.bio}
        </p>
      ) : null}

      {/* 言語 */}
      {resident.languages.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {resident.languages.map((l) => {
            const label =
              COMMON_LANGUAGES.find((x) => x.code === l.code)?.label ?? l.code;
            return (
              <span
                key={l.code}
                className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] tabular text-foreground/65"
              >
                {label}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* 探していること（強調） */}
      {resident.lookingFor.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {resident.lookingFor.slice(0, 4).map((t) => (
            <TagLink key={t} tag={t} baseQuery={baseQuery} variant="primary" />
          ))}
        </div>
      ) : null}

      {/* 興味 */}
      {resident.interests.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {resident.interests.slice(0, 5).map((t) => (
            <TagLink key={t} tag={t} baseQuery={baseQuery} variant="muted" />
          ))}
        </div>
      ) : null}
    </li>
  );
}

function TagLink({
  tag,
  baseQuery,
  variant,
}: {
  tag: string;
  baseQuery: { q?: string; country?: string; city?: string; meetups?: string };
  variant: 'primary' | 'muted';
}) {
  const cls =
    variant === 'primary'
      ? 'bg-primary-500/15 text-primary-300 hover:bg-primary-500/25'
      : 'bg-muted text-foreground/65 hover:bg-primary-500/10 hover:text-primary-300';
  return (
    <Link
      href={{ pathname: '/residents', query: { ...baseQuery, tag } }}
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${cls}`}
    >
      {tag}
    </Link>
  );
}
