import { desc } from 'drizzle-orm';
import Link from 'next/link';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { Sparkles, MapPin, ArrowRight, Plus } from 'lucide-react';
import { BoardPostForm } from './BoardPostForm';
import { AiTestPanel } from './AiTestPanel';
import { BoardAdminActions } from './BoardAdminActions';
import { AdminPageHeader } from '../_components/AdminPageHeader';

export const metadata = { title: '掲示板管理' };
export const dynamic = 'force-dynamic';

/**
 * 掲示板（board_posts）の運営管理ページ。
 *
 * - 編集チーム（resident_writer / editor）のみアクセス可
 * - 上部: 新規投稿フォーム（manual ソース）
 * - 下部: 直近 50 件のリスト（status を問わず）
 *
 * Supabase Studio でも CRUD は可能だが、ここから日本語 UI で投稿できると
 * 速い。AI 自動収集（auto_collected=true）の投稿も同じテーブルに並ぶので
 * 全体把握用にも使う。
 */
export default async function AdminBoardPage() {
  // 認証は /admin/layout.tsx で済んでいる
  const db = getDb();
  const posts = await db
    .select({
      id: schema.boardPosts.id,
      title: schema.boardPosts.title,
      source: schema.boardPosts.source,
      status: schema.boardPosts.status,
      eventDate: schema.boardPosts.eventDate,
      eventStartDate: schema.boardPosts.eventStartDate,
      eventEndDate: schema.boardPosts.eventEndDate,
      eventLocation: schema.boardPosts.eventLocation,
      autoCollected: schema.boardPosts.autoCollected,
      publishedAt: schema.boardPosts.publishedAt,
      createdAt: schema.boardPosts.createdAt,
    })
    .from(schema.boardPosts)
    .orderBy(desc(schema.boardPosts.publishedAt))
    .limit(50);

  return (
    <div>
      <AdminPageHeader
        title="掲示板への投稿"
        description="ここから新規投稿を作成すると、ホームと /board に即時反映されます。AI が自動で取り込んだ投稿（紫の Sparkles）も同じ一覧に並びます。"
      />

      <section className="mt-8 rounded-xl bg-card p-5 ring-1 ring-border sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-primary-300">
          <Plus className="h-4 w-4" />
          新規投稿
        </div>
        <BoardPostForm />
      </section>

      <div className="mt-8">
        <AiTestPanel />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-[15px] font-bold tracking-tight">
          直近の投稿{' '}
          <span className="ml-1 text-[12px] font-medium text-foreground/50">
            {posts.length} 件
          </span>
        </h2>

        {posts.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card px-6 py-10 text-center text-[13px] text-foreground/50">
            まだ投稿がありません。
          </p>
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li
                key={p.id}
                className="flex items-start gap-3 rounded-lg bg-card p-3 ring-1 ring-border transition hover:bg-primary-500/10"
              >
                <span className="mt-1 shrink-0">
                  {p.autoCollected ? (
                    <Sparkles className="h-4 w-4 text-accent-500" />
                  ) : (
                    <span className="inline-block h-2 w-2 rounded-full bg-primary-500" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/board/${p.id}`}
                    className="line-clamp-1 text-[14px] font-semibold text-foreground hover:text-primary-300 hover:underline"
                  >
                    {p.title}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-foreground/55">
                    <StatusBadge status={p.status} />
                    <SourceBadge source={p.source} />
                    {(() => {
                      const start = p.eventStartDate ?? p.eventDate ?? null;
                      const end = p.eventEndDate ?? p.eventDate ?? null;
                      if (!start) return null;
                      const label =
                        end && end !== start ? `${start} 〜 ${end}` : String(start);
                      return (
                        <span className="tabular text-primary-300">
                          開催 {label}
                        </span>
                      );
                    })()}
                    {p.eventLocation ? (
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {p.eventLocation}
                      </span>
                    ) : null}
                    <span className="ml-auto text-foreground/40">
                      {(p.publishedAt ?? p.createdAt).toISOString().slice(0, 16).replace('T', ' ')}
                    </span>
                  </p>
                </div>
                <BoardAdminActions
                  postId={p.id}
                  postTitle={p.title}
                  status={p.status}
                />
                <Link
                  href={`/board/${p.id}`}
                  className="mt-1 shrink-0 rounded-md p-1 text-foreground/30 hover:bg-muted hover:text-foreground"
                  aria-label="詳細を見る"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-12 rounded-lg bg-primary-500/10 p-4 text-[12px] leading-relaxed text-foreground/70 ring-1 ring-border">
        <p className="font-bold text-primary-300">運営メモ</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          <li>
            AI 自動投稿は <code>/api/cron/ai-paris-events</code> から毎日 05:00 UTC に挿入されます
          </li>
          <li>
            各行の操作: 公開 (status=published) / 非公開 (status=archived) / 削除 (status=deleted)。
            削除済みの復活は Supabase Studio で status を published に戻してください
          </li>
          <li>
            severity の高い「ストライキ / デモ / 災害」も今後はこの掲示板に統合する想定
          </li>
        </ul>
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'published'
      ? 'bg-success-500/10 text-success-500'
      : status === 'archived'
        ? 'bg-foreground/10 text-foreground/55'
        : status === 'deleted'
          ? 'bg-danger-500/10 text-danger-500'
          : 'bg-primary-500/10 text-primary-300';
  return (
    <span className={`rounded-sm px-1.5 py-0.5 font-bold uppercase tracking-wider ${color}`}>
      {status}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="rounded-sm bg-card px-1.5 py-0.5 font-bold uppercase tracking-wider text-foreground/55 ring-1 ring-border">
      {source}
    </span>
  );
}
