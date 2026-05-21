import { Skeleton } from '@/components/Skeleton';

/**
 * /apartments の Suspense fallback。
 *
 * - 検索フィルタ風プレースホルダ + 物件リストカードのプレースホルダ
 * - リストは 1 列 (モバイル) / 2 列 (sm+) で並べる、ArticleGrid とは別形状
 */
export default function ApartmentsLoading() {
  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-10">
        <Skeleton className="mb-2 h-4 w-20 rounded-md" />
        <Skeleton className="mb-6 h-7 w-1/3 rounded-md" />

        <div className="mb-6 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3"
            >
              <Skeleton className="aspect-[16/10] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
              <Skeleton className="h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
