import Link from 'next/link';
import { Users, MapPin } from '@locore/ui/icons';
import { listSampleTrips, getSpotsByIds } from '@/lib/trips/db';

export const metadata = {
  title: '旅程 — Locore',
};

export const dynamic = 'force-dynamic';

export default async function TripsPage() {
  const trips = await listSampleTrips();
  const allSpotIds = trips.flatMap((t) =>
    (t.days[0]?.items ?? []).map((i) => i.spotId).filter(Boolean) as string[],
  );
  const spotsById = await getSpotsByIds(Array.from(new Set(allSpotIds)));

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
          旅程
        </p>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight">
          サンプル旅程
        </h1>
        <p className="mt-1 text-[13px] text-foreground/60">
          記事のスポットを束ねて Day 別に整理した、クリエイター提案のサンプル旅程です。
        </p>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-md bg-card p-8 text-center text-[13px] text-foreground/60 ring-1 ring-primary-100">
          まだサンプル旅程はありません。
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => {
            const spotCount = t.days.reduce((acc, d) => acc + d.items.length, 0);
            const totalBudget = t.days.reduce(
              (acc, d) => acc + d.items.reduce((a, i) => a + (i.budgetJpy ?? 0), 0),
              0,
            );
            const previewSpots = (t.days[0]?.items ?? [])
              .map((i) => (i.spotId ? spotsById.get(i.spotId) : null))
              .filter(Boolean)
              .slice(0, 3);

            return (
              <Link
                key={t.id}
                href={`/trips/${t.id}`}
                className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-primary-100 transition-all duration-base ease-out hover:-translate-y-1 hover:shadow-md hover:ring-primary-300"
              >
                <div className="flex h-40 items-end bg-gradient-to-br from-primary-50 via-white to-primary-50/40 p-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
                      {t.startDate} – {t.endDate}
                    </p>
                    <h3 className="mt-1 text-[18px] font-bold leading-snug">
                      {t.name}
                    </h3>
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap gap-3 text-[12px] text-foreground/60">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {t.travelers} 名
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {spotCount} スポット
                    </span>
                    <span className="tabular text-foreground/80">
                      予算 ¥{totalBudget.toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <ul className="space-y-1 text-[12px] text-foreground/70">
                    {previewSpots.map((s) => (
                      <li key={s!.id} className="line-clamp-1">
                        ・{s!.name}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] font-medium text-primary-700">
                    詳細を見る →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
