/**
 * 共通スケルトン。
 *
 * - グレーの長方形 (`bg-muted`) + `animate-pulse` で固定。
 * - 既存の AdminSkeleton と見た目を揃える。
 * - 角丸は className で上書きできる (`rounded-xl` 既定)。
 *
 * 用法:
 *   <Skeleton className="h-32 w-full" />
 *   <Skeleton className="h-4 w-2/3 rounded-md" />
 *
 * `@locore/ui` の cn ヘルパは経由しない (CJS↔ESM 解決で `apartments/new` 等の
 *  ページが prod build で `s.cn is not a function` になる事故を避ける)。
 *  どのみち渡された className が優先される単純結合で足りる。
 */
export function Skeleton({ className }: { className?: string }) {
  const base = 'animate-pulse rounded-xl bg-muted/80';
  return <div aria-hidden className={className ? `${base} ${className}` : base} />;
}

/**
 * 記事カード形状のスケルトン (ArticleCard と同形)。
 *
 * - aspect-square のカバー + 下に 3 行のテキストプレースホルダ
 * - グリッド / 横スクロールどちらでも単体使用可
 */
export function ArticleCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="h-3 w-1/3 rounded" />
      <Skeleton className="h-4 w-5/6 rounded" />
      <Skeleton className="h-3 w-1/2 rounded" />
    </div>
  );
}

/**
 * 記事グリッド全体のスケルトン。
 *
 * - モバイル: 2 列、md+: 4 列でカードプレースホルダを並べる
 * - ページの最初の Suspense fallback として使う
 */
export function ArticleGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}
