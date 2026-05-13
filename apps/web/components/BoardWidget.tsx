import Link from 'next/link';
import { Sparkles, MapPin, ArrowRight } from 'lucide-react';
import type { BoardPostListItem } from '@/lib/board/db';

/**
 * 掲示板ウィジェット（タイトル 10 件 / ホームとヘッダー領域で使用）。
 *
 * - AI 自動投稿は紫の Sparkles アイコンで区別
 * - 各タイトルをクリックすると /board/[id] に遷移
 */
export function BoardWidget({ posts }: { posts: BoardPostListItem[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 text-center text-[12px] text-foreground/55">
        今朝はまだ更新がありません
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg bg-card ring-1 ring-border">
      <header className="flex items-center justify-between border-b border-border bg-primary-500/10 px-4 py-2.5">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          パリ掲示板
        </p>
        <Link
          href="/board"
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary-300 hover:underline"
        >
          すべて見る
          <ArrowRight className="h-3 w-3" />
        </Link>
      </header>
      <ul className="divide-y divide-border">
        {posts.map((p) => (
          <li key={p.id}>
            <Link
              href={`/board/${p.id}`}
              className="flex items-start gap-2.5 px-4 py-2.5 transition hover:bg-primary-500/10"
            >
              {/* AI 投稿は紫の sparkle、manual は terra ドット */}
              <span className="mt-1 shrink-0">
                {p.autoCollected ? (
                  <Sparkles className="h-3.5 w-3.5 text-accent-500" />
                ) : (
                  <span className="inline-block h-2 w-2 rounded-full bg-primary-500" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-[13px] font-semibold leading-snug text-foreground">
                  {p.title}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-[10px] text-foreground/55">
                  {p.eventDate ? (
                    <span className="tabular font-semibold text-primary-300">
                      {formatEventDate(p.eventDate)}
                    </span>
                  ) : (
                    <span className="text-foreground/40">
                      {formatPublishedAt(p.publishedAt)}
                    </span>
                  )}
                  {p.eventLocation ? (
                    <span className="inline-flex items-center gap-0.5 truncate">
                      <MapPin className="h-2.5 w-2.5" />
                      {p.eventLocation}
                    </span>
                  ) : null}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatEventDate(d: string) {
  // YYYY-MM-DD or ISO
  const date = new Date(d.length === 10 ? d + 'T00:00:00Z' : d);
  if (isNaN(date.getTime())) return d;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatPublishedAt(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const h = Math.floor(diffMs / (1000 * 60 * 60));
  if (h < 1) return 'たった今';
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  return `${day}日前`;
}
