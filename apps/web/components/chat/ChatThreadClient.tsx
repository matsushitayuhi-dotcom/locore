'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import {
  fetchThreadMessages,
  sendChatMessage,
  type ChatMessageView,
} from '@/lib/chat/actions';

/**
 * クライアント側のチャット会話ビュー。
 *
 * - 5 秒間隔で `fetchThreadMessages(since)` をポーリングして新着を取得
 *   （後で Supabase Realtime に置き換え可能）
 * - 送信は `sendChatMessage` server action
 * - スクロールは新着到着で自動的に下へ
 */

type Props = {
  threadId: string;
  myUserId: string;
  initialMessages: ChatMessageView[];
};

export function ChatThreadClient({ threadId, myUserId, initialMessages }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [isSending, startSend] = useTransition();
  const scrollerRef = useRef<HTMLDivElement>(null);

  // ポーリング
  useEffect(() => {
    const id = setInterval(async () => {
      const last = messages[messages.length - 1];
      const since = last?.createdAt ?? new Date(0).toISOString();
      const res = await fetchThreadMessages({ threadId, since });
      if (res.ok && res.data && res.data.messages.length > 0) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const next = res.data!.messages.filter((m) => !seen.has(m.id));
          if (next.length === 0) return prev;
          return [...prev, ...next];
        });
      }
    }, 5000);
    return () => clearInterval(id);
  }, [threadId, messages]);

  // 自動スクロール
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    startSend(async () => {
      const res = await sendChatMessage({ threadId, body });
      if (res.ok) {
        // 楽観更新（id はサーバ ID で上書きされない簡易実装）
        setMessages((prev) => [
          ...prev,
          {
            id: res.data?.messageId ?? `tmp-${Date.now()}`,
            threadId,
            senderId: myUserId,
            body,
            createdAt: new Date().toISOString(),
          },
        ]);
        setDraft('');
        // /chat 一覧側のキャッシュを確実に飛ばす（revalidatePath だけだと
        // Next 14 のクライアント Router キャッシュが残ることがあるため）
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <div
        ref={scrollerRef}
        className="flex-1 space-y-2 overflow-y-auto bg-primary-500/10 px-4 py-4 sm:px-6"
      >
        {messages.length === 0 ? (
          <p className="py-12 text-center text-[12px] text-foreground/50">
            まだメッセージはありません。最初の一通を送ってみましょう。
          </p>
        ) : null}
        {messages.map((m) => {
          const mine = m.senderId === myUserId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={
                  'max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-xs ' +
                  (mine
                    ? 'bg-primary-700 text-white'
                    : 'bg-card text-foreground ring-1 ring-border')
                }
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p
                  className={
                    'mt-1 text-right text-[10px] ' +
                    (mine ? 'text-white/60' : 'text-foreground/40')
                  }
                >
                  {new Date(m.createdAt).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={onSend}
        className="flex items-end gap-2 border-t border-border bg-card px-4 py-3 sm:px-6"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="メッセージを入力（Shift+Enter で改行）"
          maxLength={4000}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend(e);
            }
          }}
          className="flex-1 resize-none rounded-md border border-border bg-card px-3 py-2 text-[13px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isSending || draft.trim().length === 0}
        >
          {isSending ? '送信中…' : '送信'}
        </Button>
      </form>
    </>
  );
}
