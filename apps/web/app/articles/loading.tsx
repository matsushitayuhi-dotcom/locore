import { ArticleGridSkeleton, Skeleton } from '@/components/Skeleton';

/**
 * /articles の Suspense fallback。
 *
 * - 上部に見出し / フィルタバーのプレースホルダ
 * - 下にカードグリッドスケルトン (ArticleGridSkeleton)
 *
 * 既存の page.tsx と column 数 / spacing を揃えてある。
 */
export default function ArticlesLoading() {
  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-10">
        <Skeleton className="mb-2 h-4 w-24 rounded-md" />
        <Skeleton className="mb-3 h-7 w-2/3 rounded-md sm:w-1/2" />
        <Skeleton className="mb-6 h-4 w-full max-w-xl rounded-md" />

        {/* フィルタバー風プレースホルダ */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        <ArticleGridSkeleton count={10} />
      </div>
    </main>
  );
}
