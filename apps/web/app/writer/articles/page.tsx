import Link from 'next/link';
import { Button, Badge } from '@locore/ui';
import { Plus, Clock } from '@locore/ui/icons';
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

// 状態バッジ（カード左上に重ねる）
const STATUS_BADGE: Record<
  string,
  { label: string; cls: string }
> = {
  draft: {
    label: '下書き',
    cls: 'bg-neutral-900/80 text-white',
  },
  pending_review: {
    label: '審査中',
    cls: 'bg-warning-500/90 text-neutral-950',
  },
  published: {
    label: '公開中',
    cls: 'bg-emerald-600/90 text-white',
  },
  archived: {
    label: 'アーカイブ',
    cls: 'bg-neutral-500/80 text-white',
  },
  scheduled: {
    label: '予約公開',
    cls: 'bg-primary-500/95 text-neutral-950',
  },
};

const STATUS_TABS = ['published', 'draft', 'archived'] as const;

export default async function WriterArticlesPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const articles = await listMyArticles();
  const requested = searchParams?.status as (typeof STATUS_TABS)[number] | undefined;
  const activeTab: (typeof STATUS_TABS)[number] =
    requested && STATUS_TABS.includes(requested) ? requested : 'published';

  const counts: Record<string, number> = {
    published: 0,
    draft: 0,
    archived: 0,
  };
  for (const a of articles) {
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
      <div
        className="flex gap-1 border-b border-border"
        role="tablist"
        aria-label="記事ステータス"
      >
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
              <span className="text-[11px] text-foreground/50">
                ({counts[tab] ?? 0})
              </span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState activeTab={activeTab} />
      ) : (
        <ul
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="記事一覧"
        >
          {filtered.map((a) => {
            // 予約公開判定: draft かつ publishedAt が未来日時
            const isScheduled =
              a.status === 'draft' &&
              a.publishedAt != null &&
              a.publishedAt.getTime() > Date.now();
            const badgeKey = isScheduled ? 'scheduled' : a.status;
            const badge = STATUS_BADGE[badgeKey] ?? STATUS_BADGE.draft!;
            return (
              <li
                key={a.id}
                className="group relative overflow-hidden rounded-md border border-border bg-card transition-shadow hover:shadow-md"
              >
                {/* カード全体クリックの「下敷き」リンク（編集ボタンより z-index 下） */}
                <Link
                  href={`/writer/articles/${a.id}/edit`}
                  aria-label={`${a.title || '（無題）'} を編集`}
                  className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                />

                {/* カバー画像エリア */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {a.coverImageUrl ? (
                    // 外部 URL 想定。next/image だと domain 設定必要なため img 採用。
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-foreground/40">
                      カバー未設定
                    </div>
                  )}
                  {/* 状態バッジ（左上） */}
                  <span
                    className={
                      'absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ' +
                      badge.cls
                    }
                  >
                    {isScheduled ? <Clock className="h-3 w-3" /> : null}
                    {badge.label}
                  </span>
                  {a.warned ? (
                    <span className="absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-full bg-warning-500/95 px-2 py-0.5 text-[10px] font-semibold text-neutral-950 shadow-sm">
                      警告あり
                    </span>
                  ) : null}
                </div>

                {/* メタ情報 */}
                <div className="relative space-y-1.5 p-3">
                  <h3 className="line-clamp-2 min-h-[2.6em] text-[14px] font-medium leading-snug text-foreground">
                    {a.title || '（無題）'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/55">
                    <span className="tabular font-medium text-foreground/75">
                      ¥{a.priceJpy.toLocaleString('ja-JP')}
                    </span>
                    {isScheduled && a.publishedAt ? (
                      <span className="inline-flex items-center gap-0.5 text-primary-300">
                        <Clock className="h-3 w-3" />
                        予約公開{' '}
                        {a.publishedAt.toLocaleString('ja-JP', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    ) : a.publishedAt && a.status === 'published' ? (
                      <span>
                        公開 {a.publishedAt.toLocaleDateString('ja-JP')}
                      </span>
                    ) : (
                      <span>
                        更新 {a.updatedAt.toLocaleDateString('ja-JP')}
                      </span>
                    )}
                    {a.moderationScore != null ? (
                      <Badge variant="outline" className="h-4 px-1.5">
                        score {a.moderationScore}
                      </Badge>
                    ) : null}
                  </div>

                  {/* 編集ボタン（右下、常時表示） */}
                  <div className="flex items-center justify-end pt-1">
                    <Button
                      asChild
                      variant="primary"
                      size="sm"
                      className="relative z-20 h-8 px-3 text-[12px]"
                    >
                      <Link href={`/writer/articles/${a.id}/edit`}>編集</Link>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyState({
  activeTab,
}: {
  activeTab: (typeof STATUS_TABS)[number];
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-card px-6 py-16 text-center">
      {/* 大きめのイラスト枠（簡易 SVG プレースホルダ） */}
      <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-primary-500/10">
        <svg
          aria-hidden="true"
          viewBox="0 0 64 64"
          className="h-16 w-16 text-primary-300"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="10" y="8" width="40" height="48" rx="4" />
          <path d="M18 20h24M18 28h24M18 36h16" />
          <path d="M44 44l4 4 8-8" />
        </svg>
      </div>
      <p className="text-[14px] font-semibold text-foreground">
        {STATUS_LABEL[activeTab]}の記事はまだありません
      </p>
      <p className="mt-1 text-[12px] text-foreground/60">
        あなたの街での体験を、記事として残しましょう。
      </p>
      <Button asChild variant="primary" className="mt-6">
        <Link href="/writer/articles/new">
          <Plus className="h-4 w-4" />
          最初の記事を書く
        </Link>
      </Button>
    </div>
  );
}
