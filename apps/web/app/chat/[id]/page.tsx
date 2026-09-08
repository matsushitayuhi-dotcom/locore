import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { eq, and, asc, ne } from 'drizzle-orm';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@locore/ui';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { ChatThreadClient } from '@/components/chat/ChatThreadClient';

export const metadata = { title: 'チャット' };
export const dynamic = 'force-dynamic';

type PageProps = { params: { id: string } };

export default async function ChatThreadPage({ params }: PageProps) {
  const me = await requireUser(`/chat/${params.id}`);
  const db = getDb();

  // メンバーチェック
  const member = await db
    .select({ threadId: schema.chatThreadMembers.threadId })
    .from(schema.chatThreadMembers)
    .where(
      and(
        eq(schema.chatThreadMembers.threadId, params.id),
        eq(schema.chatThreadMembers.userId, me.id),
      ),
    )
    .limit(1);
  if (member.length === 0) return notFound();

  // 相手プロフィール
  const others = await db
    .select({
      userId: schema.chatThreadMembers.userId,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
    })
    .from(schema.chatThreadMembers)
    .leftJoin(
      schema.users,
      eq(schema.users.id, schema.chatThreadMembers.userId),
    )
    .where(
      and(
        eq(schema.chatThreadMembers.threadId, params.id),
        ne(schema.chatThreadMembers.userId, me.id),
      ),
    )
    .limit(5);

  const partner = others[0]
    ? {
        id: others[0].userId,
        displayName: others[0].displayName ?? '匿名',
        avatarUrl: others[0].avatarUrl,
      }
    : null;

  // 直近 200 件
  const messages = await db
    .select({
      id: schema.chatMessages.id,
      senderId: schema.chatMessages.senderId,
      body: schema.chatMessages.body,
      createdAt: schema.chatMessages.createdAt,
    })
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.threadId, params.id))
    .orderBy(asc(schema.chatMessages.createdAt))
    .limit(200);

  // 既読更新（fire-and-forget）
  await db
    .update(schema.chatThreadMembers)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(schema.chatThreadMembers.threadId, params.id),
        eq(schema.chatThreadMembers.userId, me.id),
      ),
    );

  return (
    /*
      スマホ (md 未満) では layout の .app-main-pad が BottomNav 用に 5rem の
      下余白を足すが、このページは BottomNav を出さない。そのままだと入力欄の下に
      80px の空白が残り、入力欄が画面下端に届かないので max-md で相殺する。
      高さも 100vh ではなく動的ビューポート (dvh) − safe-area で取り直し、
      iOS のツールバー分ずれないようにする。差し引く 57px は SiteHeader の
      h-14 (56px) + border-b (1px)。HeaderShell が safe-area-inset-top 分の
      padding を足すので、それも引かないと standalone / 横持ちで入力欄が
      画面外に押し出される。md 以上は従来どおり 100vh−56px。
    */
    <main className="flex h-[calc(100dvh_-_57px_-_env(safe-area-inset-top,0px)_-_env(safe-area-inset-bottom,0px))] flex-col max-md:-mb-20 md:h-[calc(100vh-56px)]">
      {/*
        モバイルではタップ領域が極小だった「←」アイコンを、
        フル幅 sticky のテキスト付きボタン「メッセージ一覧へ」に拡張。
        - min-height 44px（iOS ヒットターゲット最小推奨）
        - スマホは sticky top-0 で常に押しやすく
        - sm 以上は inline で従来通り
      */}
      <Link
        href="/chat"
        className="sticky top-0 z-10 inline-flex min-h-[44px] w-full items-center gap-1.5 border-b border-border bg-card px-4 py-2 text-[13px] font-medium text-primary-300 transition-colors hover:bg-muted sm:static sm:w-auto sm:border-b-0 sm:px-3"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        <span>メッセージ一覧へ</span>
      </Link>
      <header className="flex min-w-0 items-center gap-3 border-b border-border bg-card px-4 py-3">
        {partner ? (
          // 表示名が長いと 402px で 1 文字ずつ縦積みになる。アバターは縮まない側
          // (Avatar 自体が shrink-0)、名前は縮む側なので min-w-0 + truncate。
          <Link
            href={`/users/${partner.id}`}
            className="flex min-w-0 items-center gap-2"
          >
            <Avatar size="sm">
              {partner.avatarUrl ? (
                <AvatarImage src={partner.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback>
                {(partner.displayName ?? '?')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 truncate text-[14px] font-semibold">
              {partner.displayName}
            </span>
          </Link>
        ) : (
          <span className="text-[14px] font-semibold text-foreground/60">
            退会済みユーザー
          </span>
        )}
      </header>

      <ChatThreadClient
        threadId={params.id}
        myUserId={me.id}
        initialMessages={messages.map((m) => ({
          id: m.id,
          threadId: params.id,
          senderId: m.senderId,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
