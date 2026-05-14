import { desc } from 'drizzle-orm';
import Link from 'next/link';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/require-user';
import { Sparkles, MapPin, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { BoardPostForm } from './BoardPostForm';
import { AiTestPanel } from './AiTestPanel';

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
  const editor = await requireEditor();
  if (!editor) {
    return (
      <main className="mx-auto max-w-screen-md px-4 py-12">
        <p className="text-[14px] text-foreground/70">
          このページは編集チームメンバー限定です。
        </p>
      </main>
    );
  }

  const db = getDb();
  const posts = await db
    .select({
      id: schema.boardPosts.id,
      title: schema.boardPosts.title,
      source: schema.boardPosts.source,
      status: schema.boardPosts.status,
      eventDate: schema.boardPosts.eventDate,
      eventLocation: schema.boardPosts.eventLocation,
      autoCollected: schema.boardPosts.autoCollected,
      publishedAt: schema.boardPosts.publishedAt,
      createdAt: schema.boardPosts.createdAt,
    })
    .from(schema.boardPosts)
    .orderBy(desc(schema.boardPosts.publishedAt))
    .limit(50);

  return (
    <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        運営ダッシュボードに戻る
      </Link>

      <header className="mt-4">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          掲示板管理
        </p>
        <h1
          className="mt-2 text-[28px] font-bold tracking-tight"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          掲示板への投稿
        </h1>
        <p className="mt-1 text-[13px] text-foreground/65">
          ここから新規投稿を作成すると、ホームと /board に即時反映されます。
          AI が自動で取り込んだ投稿（紫の Sparkles）も同じ一覧に並びます。
        </p>
      </header>

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
              <li key={p.id}>
                <Link
                  href={`/board/${p.id}`}
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
                    <p className="line-clamp-1 text-[14px] font-semibold text-foreground">
                      {p.title}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-foreground/55">
                      <StatusBadge status={p.status} />
                      <SourceBadge source={p.source} />
                      {p.eventDate ? (
                        <span className="tabular text-primary-300">
                          開催 {String(p.eventDate)}
                        </span>
                      ) : null}
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
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-foreground/30" />
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
            投稿の編集 / 削除は Supabase Studio から直接行うのが速いです
            （RLS は author 自身のみ更新可なので、AI 投稿の編集は service role 経由になります）
          </li>
          <li>
            severity の高い「ストライキ / デモ / 災害」も今後はこの掲示板に統合する想定
          </li>
        </ul>
      </footer>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'published'
      ? 'bg-success-500/10 text-success-500'
      : status === 'archived'
        ? 'bg-foreground/10 text-foreground/55'
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
