import Link from 'next/link';
import { Button, Badge } from '@locore/ui';
import { Plus } from '@locore/ui/icons';
import { listMyArticles } from './actions';

export const metadata = {
  title: '記事管理',
};

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  published: '公開中',
  draft: '下書き',
  archived: 'アーカイブ',
};

// 公開中をデフォルト → 下書き → アーカイブ。審査中タブは廃止
// （pending_review の記事があっても下書き枠にまとめて表示）。
const STATUS_TABS = ['published', 'draft', 'archived'] as const;

export default async function WriterArticlesPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const articles = await listMyArticles();
  // 旧実装は ternary が undefined を返す経路があり、結果として「全件」になっていた。
  // searchParams.status が STATUS_TABS のどれかに一致するならそれを、そうでなければ
  // 必ず 'published' をデフォルトにする。
  const requested = searchParams?.status as (typeof STATUS_TABS)[number] | undefined;
  const activeTab: (typeof STATUS_TABS)[number] =
    requested && STATUS_TABS.includes(requested) ? requested : 'published';

  const counts: Record<string, number> = {
    published: 0,
    draft: 0,
    archived: 0,
  };
  for (const a of articles) {
    // pending_review は実質「公開申請中の下書き」なので下書きにまとめる
    const bucket =
      a.status === 'pending_review' ? 'draft' : (a.status as keyof typeof counts);
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }
  const filtered = articles.filter((a) =>
    activeTab === 'draft'
      ? a.status === 'draft' || a.status === 'pending_review'
      : a.status === activeTab,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-foreground/60">
          {articles.length} 件の記事
        </p>
        <Button asChild variant="primary">
          <Link href="/writer/articles/new">
            <Plus className="h-4 w-4" />
            新規作成
          </Link>
        </Button>
      </div>

      {/* タブ */}
      <div className="flex gap-1 border-b border-border" role="tablist" aria-label="記事ステータス">
        {STATUS_TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <Link
              key={tab}
              role="tab"
              aria-selected={isActive}
              href={`/writer/articles?status=${tab}`}
              className={
                'rounded-t-sm px-4 py-2 text-[13px] transition-colors ' +
                (isActive
                  ? 'border-b-2 border-primary-700 font-medium text-foreground'
                  : 'text-foreground/60 hover:text-foreground')
              }
            >
              {STATUS_LABEL[tab]}{' '}
              <span className="text-[11px] text-foreground/50">({counts[tab] ?? 0})</span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-[13px] text-foreground/60">
            {STATUS_LABEL[activeTab]}の記事はまだありません。
          </p>
          {activeTab === 'draft' ? (
            <Button asChild variant="primary" className="mt-4">
              <Link href="/writer/articles/new">最初の記事を書く</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-4 rounded-md border border-border bg-card p-4"
            >
              <div className="hidden h-16 w-24 flex-shrink-0 overflow-hidden rounded-sm bg-muted sm:block">
                {a.coverImageUrl ? (
                  // 外部 URL 想定。next/image だと domain 設定必要なため img 採用。
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.coverImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-[14px] font-medium text-foreground">
                    {a.title}
                  </h3>
                  {a.warned ? (
                    <Badge variant="outline" className="border-warning-500 text-warning-700">
                      警告あり
                    </Badge>
                  ) : null}
                  {a.moderationScore != null ? (
                    <Badge variant="outline">スコア {a.moderationScore}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-foreground/50">
                  ¥{a.priceJpy.toLocaleString('ja-JP')} ・ 更新{' '}
                  {a.updatedAt.toLocaleDateString('ja-JP')}
                  {a.publishedAt
                    ? ` ・ 公開 ${a.publishedAt.toLocaleDateString('ja-JP')}`
                    : ''}
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/writer/articles/${a.id}/preview`}>プレビュー</Link>
                </Button>
                <Button asChild variant="primary" size="sm">
                  <Link href={`/writer/articles/${a.id}/edit`}>編集</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
