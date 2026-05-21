import { ArticleGridSkeleton, Skeleton } from '@/components/Skeleton';

/**
 * /library (お気に入り) の Suspense fallback。
 *
 * - 上部にタブのプレースホルダ
 * - 下に保存記事グリッドのプレースホルダ
 */
export default function LibraryLoading() {
  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-10">
        <Skeleton className="mb-2 h-4 w-20 rounded-md" />
        <Skeleton className="mb-6 h-7 w-1/3 rounded-md" />

        {/* タブ風プレースホルダ */}
        <div className="mb-6 flex gap-2 border-b border-border pb-3">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>

        <ArticleGridSkeleton count={8} />
      </div>
    </main>
  );
}
