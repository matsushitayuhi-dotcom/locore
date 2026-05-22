'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { startDirectThread } from '@/lib/chat/actions';

/**
 * /services/[id] 詳細ページ用の問い合わせ CTA。
 *
 * 挙動:
 *   - contactMethod === 'external_url' なら外部 URL に飛ばす
 *     (CTA テキストは「外部サイトで確認」)
 *   - 未ログインなら /auth/login?redirectTo=... に遷移
 *   - 出品者本人の場合は toast.info で警告のみ
 *   - 通常は内蔵モーダルで初期メッセージを書いてもらい、startDirectThread を呼ぶ
 *   - 成功時は /chat/[threadId] に遷移
 */

type Props = {
  serviceId: string;
  serviceTitle: string;
  ownerId: string;
  ownerName: string;
  viewerUserId: string | null;
  contactMethod: 'chat' | 'external_url';
  externalUrl: string | null;
  /** primary | full-width | secondary 等の見せ方を切替 */
  variant?: 'hero' | 'footer';
};

export function ServiceInquiryButton({
  serviceId,
  serviceTitle,
  ownerId,
  ownerName,
  viewerUserId,
  contactMethod,
  externalUrl,
  variant = 'hero',
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(
    `「${serviceTitle}」について相談させてください。`,
  );
  const [isPending, startTransition] = useTransition();

  const isExternal = contactMethod === 'external_url' && !!externalUrl;
  const isSelf = viewerUserId === ownerId;

  const handleClick = () => {
    if (isExternal && externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!viewerUserId) {
      router.push(
        `/auth/login?redirectTo=${encodeURIComponent(`/services/${serviceId}`)}`,
      );
      return;
    }
    if (isSelf) {
      toast.info('これは自分のサービスです');
      return;
    }
    setOpen(true);
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error('メッセージを入力してください');
      return;
    }
    startTransition(async () => {
      const res = await startDirectThread({
        withUserId: ownerId,
        relatedServiceId: serviceId,
        initialMessage: trimmed,
      });
      if (res.ok && res.data) {
        setOpen(false);
        router.push(`/chat/${res.data.threadId}`);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  const ctaLabel = isExternal ? '外部サイトで確認' : '問い合わせる';
  const ctaAria = isExternal
    ? `${serviceTitle} の外部詳細ページを開く`
    : `${serviceTitle} について ${ownerName} さんに問い合わせる`;

  // 「ヒーロー」用は強いプライマリ。「フッター」用は同じだが幅 100%
  const className =
    variant === 'footer'
      ? 'inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary-500 px-5 py-3 text-[14px] font-bold text-neutral-950 transition hover:bg-primary-300'
      : 'inline-flex items-center justify-center gap-1.5 rounded-full bg-primary-500 px-5 py-2.5 text-[14px] font-bold text-neutral-950 transition hover:bg-primary-300';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={ctaAria}
        className={className}
      >
        {isExternal ? (
          <ExternalLink className="h-4 w-4" aria-hidden />
        ) : (
          <MessageCircle className="h-4 w-4" aria-hidden />
        )}
        {ctaLabel}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="サービスへの問い合わせ"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-card shadow-xl ring-1 ring-border sm:rounded-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <h2 className="text-[15px] font-semibold">
                {ownerName} さんに問い合わせる
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="rounded-full p-1.5 text-foreground/60 hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div className="rounded-md bg-muted px-3 py-2 text-[12px] text-foreground/65">
                <span className="font-semibold text-foreground/80">
                  {serviceTitle}
                </span>
                <span className="mx-1.5">·</span>
                <span>このサービスについての初回メッセージを送ります</span>
              </div>
              <label className="block">
                <span className="text-[12px] font-semibold text-foreground/70">
                  メッセージ
                </span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="ご希望の日時 / 人数 / 相談したい内容など"
                  className="mt-1 w-full rounded-md bg-background px-3 py-2 text-[13px] ring-1 ring-border placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="mt-1 block text-right text-[10px] text-foreground/45">
                  {message.length} / 2000
                </span>
              </label>
              <p className="text-[11px] text-foreground/55">
                送信すると Locore のチャットに新しいスレッドが作られます。
                予約 / 決済はチャット内で双方の合意のもとに進めてください。
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSend}
                disabled={isPending || !message.trim()}
              >
                {isPending ? '送信中…' : '送信する'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
