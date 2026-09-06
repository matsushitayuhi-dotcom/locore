import Link from 'next/link';
import { Heart, Search } from 'lucide-react';
import { requireUser } from '@/lib/auth/require-user';
import { listFollowing } from '@/lib/follow/actions';
import { listExperts, listExpertCountries, type ExpertCard as ExpertCardData } from '@/lib/experts/list';
import { getSpecialtiesByUser } from '@/lib/experts/specialtiesByUser';
import { ExpertCard } from '@/components/experts/ExpertCard';

/**
 * /favorites — お気に入りのエキスパート（2026-09）。
 * データはフォロー関係（user_follows）。エキスパートでない相手をフォローしていても
 * ここには出さない（/experts の一覧条件と同じ listExperts でフィルタ）。
 * 旧「保存ライブラリ」（/library・記事とスポット）はナビから外し、ページは残す。
 */

export const metadata = {
  title: 'お気に入りのエキスパート',
};

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const me = await requireUser('/favorites');
  const [following, all, countries] = await Promise.all([
    listFollowing(me.id),
    listExperts(),
    listExpertCountries(),
  ]);
  const favoritedAt = new Map(following.map((f) => [f.id, f.followedAt]));
  const experts = all
    .filter((e) => favoritedAt.has(e.userId))
    .sort((a, b) => (favoritedAt.get(b.userId) ?? '').localeCompare(favoritedAt.get(a.userId) ?? ''));
  const specialtiesByUser = await getSpecialtiesByUser(experts.map((e) => e.userId));
  const countryNameByCode = new Map(countries.map((c) => [c.code, c.nameJa]));

  const card = (e: ExpertCardData) => (
    <ExpertCard
      key={e.userId}
      expert={e}
      specialties={specialtiesByUser.get(e.userId) ?? []}
      enrollment={e.enrollment ?? null}
      countryNameJa={e.countryCode ? (countryNameByCode.get(e.countryCode.toLowerCase()) ?? null) : null}
    />
  );

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-10">
        <section className="pb-6 pt-9 sm:pt-11">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700">
            <Heart className="h-3 w-3 fill-current" aria-hidden />
            Favorites
          </p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.01em] sm:text-[28px]">お気に入りのエキスパート</h1>
          <p className="mt-2 text-[13.5px] text-neutral-500">
            気になる先輩をここに集めておくと、比べてから相談相手を決められます。エキスパートのページの「お気に入り」で追加できます。
          </p>
        </section>

        {experts.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <p className="text-[15px] font-semibold">まだお気に入りはありません</p>
            <p className="mt-1.5 text-[13px] text-neutral-500">
              エキスパートのページで <Heart className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden /> お気に入り を押すと、ここに並びます。
            </p>
            <Link
              href="/experts"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-neutral-700"
            >
              <Search className="h-4 w-4" aria-hidden />
              エキスパートを探す
            </Link>
          </section>
        ) : (
          <>
            <p className="mb-4 text-[12.5px] text-neutral-500">
              <b className="text-[15px] tabular-nums text-foreground">{experts.length}</b> 名
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {experts.map((e) => card(e))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
