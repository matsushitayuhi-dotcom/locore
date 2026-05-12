import Link from 'next/link';
import { Sparkles, MapPin, ArrowLeft } from 'lucide-react';
import { listBoardPosts } from '@/lib/board/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'パリ掲示板',
  description:
    'パリで今日明日に起きていること — マルシェ、デモ、展覧会、地元イベント。AI と編集部が日々まとめます。',
};

export default async function BoardIndexPage() {
  // 一覧ページは多めに取る（最新 50）
  const posts = await listBoardPosts(50);

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ホームに戻る
      </Link>

      <header className="mt-4 mb-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          掲示板
        </p>
        <h1
          className="mt-2 text-[30px] font-bold leading-tight tracking-tight"
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          パリ、今日明日に起きていること
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-foreground/70">
          マルシェ、デモ、ストライキ、展覧会、地元イベント。
          AI と編集部が毎日まとめて掲載します。
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-[13px] text-foreground/50">
          まだ投稿がありません。
          <br />
          AI が毎朝自動収集を行うので、明日以降に再度ご確認ください。
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/board/${p.id}`}
                className="block rounded-lg bg-card p-4 ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 shrink-0">
                    {p.autoCollected ? (
                      <Sparkles className="h-4 w-4 text-accent-500" />
                    ) : (
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary-500" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[15px] font-bold leading-snug text-foreground">
                      {p.title}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-foreground/60">
                      {p.eventDate ? (
                        <span className="rounded-full bg-primary-500/10 px-2 py-0.5 tabular font-semibold text-primary-300">
                          開催 {formatEventDate(p.eventDate)}
                        </span>
                      ) : null}
                      {p.eventLocation ? (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {p.eventLocation}
                        </span>
                      ) : null}
                      <span className="text-foreground/40">
                        {formatPublishedAt(p.publishedAt)}
                      </span>
                      {p.autoCollected ? (
                        <span className="ml-auto rounded-sm bg-accent-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-500">
                          AI 自動
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function formatEventDate(d: string) {
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
