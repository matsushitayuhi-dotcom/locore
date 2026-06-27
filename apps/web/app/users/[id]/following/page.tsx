import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, isNull } from 'drizzle-orm';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { listFollowing } from '@/lib/follow/actions';
import { RESIDENCE_COUNTRY_BY_CODE } from '@/lib/resident/masters';

/**
 * /residents/[id]/following — フォロー中の一覧。RLS で当事者のみ閲覧可。
 */

export const dynamic = 'force-dynamic';
export const metadata = { title: 'フォロー中 — Locore' };

export default async function FollowingPage({
  params,
}: {
  params: { id: string };
}) {
  const db = getDb();
  const rows = await db
    .select({ displayName: schema.users.displayName })
    .from(schema.users)
    .where(and(eq(schema.users.id, params.id), isNull(schema.users.deletedAt)))
    .limit(1);

  const user = rows[0];
  if (!user) notFound();

  const following = await listFollowing(params.id);

  return (
    <main className="mx-auto max-w-screen-md px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href={`/users/${params.id}`}
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        プロフィールに戻る
      </Link>

      <header className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
          Following
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight">
          {user.displayName} さんがフォロー中
          <span className="ml-2 text-[13px] font-normal tabular text-foreground/55">
            {following.length} 人
          </span>
        </h1>
        <p className="mt-1 text-[11px] text-foreground/55">
          ※ フォロー関係は当事者のみ閲覧できます。他のユーザーのページでは空に見えることがあります。
        </p>
      </header>

      {following.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-foreground/55">
          まだ誰もフォローしていません。
          <br />
          <Link
            href="/users"
            className="mt-2 inline-block text-primary-300 hover:underline"
          >
            住人ディレクトリで気になる人を探す →
          </Link>
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {following.map((u) => (
            <FollowEntryCard key={u.id} user={u} />
          ))}
        </ul>
      )}
    </main>
  );
}

function FollowEntryCard({
  user,
}: {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    residencyCity: string | null;
    residencyCountry: string | null;
  };
}) {
  const countryLabel = user.residencyCountry
    ? RESIDENCE_COUNTRY_BY_CODE[user.residencyCountry] ?? user.residencyCountry
    : null;
  return (
    <li>
      <Link
        href={`/users/${user.id}`}
        className="flex gap-3 rounded-xl bg-card p-3 ring-1 ring-border transition hover:ring-primary-300 sm:p-4"
      >
        <Avatar size="md" className="ring-1 ring-border">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback>
            {user.displayName[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[13px] font-semibold text-foreground hover:text-primary-300">
            {user.displayName}
          </p>
          {user.residencyCity || countryLabel ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-foreground/55">
              <MapPin className="h-3 w-3" />
              {user.residencyCity ?? ''}
              {user.residencyCity && countryLabel ? '、' : ''}
              {countryLabel ?? ''}
            </p>
          ) : null}
          {user.bio ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-foreground/65">
              {user.bio}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
