'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MessageCircle, Mail, X } from 'lucide-react';
import { applyToCommunityPost } from '@/lib/community/actions';

/**
 * 投稿への応募ボタン + メッセージ送信ダイアログ。
 *
 * 仲介プラットフォーム性質を保つため:
 *   - 連絡は Locore メッセージ機能経由のみ
 *   - 個人連絡先の本文埋め込みはサーバ側でガード
 *   - 初回メッセージは投稿のコンテキスト付きで送信
 */
export function ApplyButton({
  postId,
  postTitle,
  applyLabel = '応募する',
  viewerLoggedIn,
  isOwnPost,
  closed,
  contactEmail,
}: {
  postId: string;
  /** mailto: の件名に使う投稿タイトル */
  postTitle?: string;
  applyLabel?: string;
  viewerLoggedIn: boolean;
  isOwnPost: boolean;
  closed: boolean;
  /** 投稿者が公開しているメールアドレス。あれば「メールで問い合わせる」ボタンを出す */
  contactEmail?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [isPending, startTransition] = useTransition();

  if (isOwnPost) {
    return (
      <div className="rounded-md bg-primary-500/10 px-3 py-2 text-[12px] text-foreground/70">
        これはあなたの投稿です。応募はできません。
      </div>
    );
  }
  if (closed) {
    return (
      <div className="rounded-md bg-foreground/10 px-3 py-2 text-[12px] text-foreground/65">
        この投稿は締切られています。
      </div>
    );
  }

  const onTrigger = () => {
    if (!viewerLoggedIn) {
      router.push('/auth/login?redirect_to=' + encodeURIComponent(location.pathname));
      return;
    }
    setOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 10) {
      toast.error('メッセージは 10 文字以上にしてください');
      return;
    }
    startTransition(async () => {
      const res = await applyToCommunityPost({ postId, message: body.trim() });
      if (res.ok && res.data) {
        toast.success('メッセージを送りました', {
          description: '相手からの返信は通知されます',
          action: {
            label: '会話を見る',
            onClick: () => router.push(`/chat/${res.data!.threadId}`),
          },
        });
        setBody('');
        setOpen(false);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  // mailto: の本文と件名を組み立てる。改行はエンコード必須
  const mailtoHref = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(
        `[Locore] ${postTitle ?? 'お問い合わせ'}`,
      )}&body=${encodeURIComponent(
        `はじめまして。\nLocore で投稿を拝見してご連絡しています。\n\n（用件をご記入ください）`,
      )}`
    : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onTrigger}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-5 py-2.5 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300"
        >
          <MessageCircle className="h-4 w-4" />
          {applyLabel}
        </button>
        {mailtoHref ? (
          <a
            href={mailtoHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2.5 text-[13px] font-semibold text-foreground ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
          >
            <Mail className="h-4 w-4" />
            メールで問い合わせる
          </a>
        ) : null}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-neutral-900/40 px-4 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form
            onSubmit={onSubmit}
            className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl"
          >
            <header className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
                  メッセージを送る
                </p>
                <h3
                  className="mt-0.5 text-[17px] font-bold tracking-tight"
                  style={{
                    fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
                  }}
                >
                  最初のひとこと
                </h3>
              </div>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setOpen(false)}
                className="rounded-sm p-1 text-foreground/45 hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <p className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-900">
              個人連絡先（電話・メール・LINE 等）は最初のメッセージに書かないで
              ください。やり取りを通じて信頼関係を築いた後に共有することを推奨します。
            </p>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={6}
              autoFocus
              placeholder={
                'はじめまして。\n投稿を拝見しました。\n\n（応募の動機や、確認したい点などをご記入ください）'
              }
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px] leading-relaxed focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
            />
            <p className="mt-1 text-right text-[10px] text-foreground/45">
              {body.length} / 2000
            </p>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-[13px] font-medium text-foreground/65 hover:bg-muted"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isPending || body.trim().length < 10}
                className="rounded-md bg-primary-500 px-5 py-2 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300 disabled:opacity-50"
              >
                {isPending ? '送信中…' : '送信する'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
