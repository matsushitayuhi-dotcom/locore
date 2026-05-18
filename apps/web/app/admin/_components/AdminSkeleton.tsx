/**
 * /admin ダッシュボードの Suspense fallback で使うスケルトン群。
 * 各セクションが独立して読み込めるようになる。
 */

export function KpiCardsSkeleton() {
  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[110px] animate-pulse rounded-xl border border-border bg-card"
        />
      ))}
    </section>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <section className="mb-8 grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-[200px] animate-pulse rounded-xl border border-border bg-card"
        />
      ))}
    </section>
  );
}

export function TopAndRecentSkeleton() {
  return (
    <section className="mb-8 grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="h-[400px] animate-pulse rounded-xl border border-border bg-card"
        />
      ))}
    </section>
  );
}

export function WarningsSkeleton() {
  return null; // 警告は無くてもページが成立するのでスケルトン不要
}
