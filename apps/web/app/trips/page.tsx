import Link from 'next/link';
import { Button } from '@locore/ui';
import { CalendarPlus, Users, MapPin } from '@locore/ui/icons';
import { trips, getSpot } from '../../lib/mock';

export const metadata = {
  title: '旅程 — Locore',
};

export default function TripsPage() {
  return (
    <main className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
            旅程
          </p>
          <h1
            className="mt-1 text-[28px] font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
          >
            あなたの旅程
          </h1>
          <p className="mt-1 text-[13px] text-foreground/60">
            記事のスポットを束ねて、Day 別に整える。Google Maps で開ける。
          </p>
        </div>
        <Link href="/trips/trip_paris_2026_may">
          <Button variant="primary">
            <CalendarPlus className="mr-1 h-4 w-4" />
            新しい旅程を作成
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {trips.map((t) => {
          const spotCount = t.days.reduce((acc, d) => acc + d.items.length, 0);
          const totalBudget = t.days.reduce(
            (acc, d) => acc + d.items.reduce((a, i) => a + (i.budgetJpy ?? 0), 0),
            0,
          );
          const previewSpots = t.days[0]?.items
            .map((i) => (i.spotId ? getSpot(i.spotId) : null))
            .filter(Boolean)
            .slice(0, 3);

          return (
            <Link
              key={t.id}
              href={`/trips/${t.id}`}
              className="group block overflow-hidden rounded-md border border-border bg-card transition hover:shadow-sm"
            >
              <div className="flex h-40 items-end bg-gradient-to-br from-primary-50 via-card to-secondary-50 p-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
                    {t.startDate} – {t.endDate}
                  </p>
                  <h3
                    className="mt-1 text-[18px] font-semibold leading-snug"
                    style={{
                      fontFamily:
                        'var(--font-serif-jp), var(--font-serif), serif',
                    }}
                  >
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
                  {previewSpots?.map((s) => (
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
    </main>
  );
}
