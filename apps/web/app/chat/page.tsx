import Link from 'next/link';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@locore/ui';
import { requireUser } from '@/lib/auth/require-user';
import { listMyThreads } from '@/lib/chat/actions';

export const metadata = { title: 'メッセージ' };
export const dynamic = 'force-dynamic';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min} 分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 時間前`;
  return d.toLocaleDateString('ja-JP');
}

export default async function ChatListPage() {
  await requireUser('/chat');
  const res = await listMyThreads();
  const threads = res.ok ? res.data?.threads ?? [] : [];
  const diagnostic = res.ok ? res.data?.diagnostic ?? null : null;

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight">メッセージ</h1>
        <p className="mt-1 text-[13px] text-foreground/60">
          駐在員とのやり取りや、サービスへの問い合わせがここに集まります。
        </p>
      </header>

      {diagnostic ? (
        <div className="mb-4 rounded-md bg-warning-50 p-4 text-[12px] text-warning-700 ring-1 ring-warning-500">
          <p className="font-bold">⚠ チャットの読み込みで問題が発生しています</p>
          <p className="mt-1 font-mono text-[11px] leading-relaxed break-all">
            {diagnostic}
          </p>
          <p className="mt-2 text-[11px]">
            未適用の migration があれば Supabase SQL Editor で{' '}
            <code className="rounded bg-card px-1 py-0.5">
              packages/db/migrations/manual/0017_chat.sql
            </code>{' '}
            を実行してください。
          </p>
        </div>
      ) : null}

      {threads.length === 0 ? (
        <div className="rounded-md bg-card p-8 text-center text-[13px] text-foreground/60 ring-1 ring-border">
          まだメッセージはありません。プロフィールページの「メッセージを送る」から会話を始められます。
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-md bg-card ring-1 ring-border">
          {threads.map((t) => (
            <li key={t.threadId}>
              <Link
                href={`/chat/${t.threadId}`}
                className="flex items-start gap-3 px-4 py-3 transition hover:bg-primary-500/10"
              >
                <Avatar size="md">
                  {t.partner?.avatarUrl ? (
                    <AvatarImage src={t.partner.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback>
                    {(t.partner?.displayName ?? '?')[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[14px] font-semibold">
                      {t.partner?.displayName ?? '退会済みユーザー'}
                    </p>
                    <span className="shrink-0 text-[11px] text-foreground/50">
                      {formatTime(t.lastMessageAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-foreground/60">
                    {t.preview || '（メッセージなし）'}
                  </p>
                </div>
                {t.unread > 0 ? (
                  <span className="shrink-0 self-center rounded-full bg-primary-700 px-2 py-0.5 text-[10px] font-bold text-white">
                    {t.unread}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
