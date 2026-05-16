'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { approveVerification, rejectVerification } from '../actions';

/**
 * 承認 / 却下のレビューフォーム。
 *
 * - 承認: 1 クリック (内部メモは任意)
 * - 却下: 理由必須 (10〜500 字)、ユーザーにメール通知される
 */

export function ReviewForm({ id }: { id: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle');
  const [reason, setReason] = useState('');
  const [reviewerNote, setReviewerNote] = useState('');
  const [isPending, startTransition] = useTransition();

  const onApprove = () => {
    if (!confirm('この申請を承認しますか？\n承認するとユーザーにメールが届き、プロフィールにバッジが付きます。')) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await approveVerification({
          id,
          reviewerNote: reviewerNote.trim() || undefined,
        });
        if (res.ok) {
          toast.success('承認しました');
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '処理失敗');
      }
    });
  };

  const onReject = () => {
    if (reason.trim().length < 10) {
      toast.error('却下理由は 10 文字以上で書いてください (ユーザーに通知されます)');
      return;
    }
    if (!confirm('この申請を却下しますか？\nユーザーには却下理由を含むメールが届きます。')) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await rejectVerification({
          id,
          reason: reason.trim(),
          reviewerNote: reviewerNote.trim() || undefined,
        });
        if (res.ok) {
          toast.success('却下しました');
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '処理失敗');
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* 内部メモ (承認/却下どちらでも) */}
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          内部メモ (任意・ユーザーには見えません)
        </label>
        <textarea
          value={reviewerNote}
          onChange={(e) => setReviewerNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="例: 賃貸契約書で住所確認、署名は最新"
          className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-[12px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        />
      </div>

      {/* モード切替 */}
      {mode === 'idle' ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={onApprove}
            disabled={isPending}
            className="inline-flex items-center gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            承認する
          </Button>
          <button
            type="button"
            onClick={() => setMode('reject')}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-card px-4 py-2 text-[13px] font-semibold text-danger-500 ring-1 ring-danger-500/40 hover:bg-danger-500/10"
          >
            <XCircle className="h-4 w-4" />
            却下する
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-md bg-danger-500/5 p-3 ring-1 ring-danger-500/20">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-danger-500">
              却下理由 (必須・ユーザーにメールで通知されます)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="例: ご提出いただいた書類では氏名と住所が一致しないため、別の書類 (賃貸契約書 or 直近 3 ヶ月以内の光熱費請求書) をお願いいたします。"
              className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-[13px] focus:border-2 focus:border-danger-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-foreground/55">
              {reason.length} / 500 (最低 10 文字)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onReject}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-danger-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-danger-500/90 disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              却下を確定する
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('idle');
                setReason('');
              }}
              disabled={isPending}
              className="rounded-md bg-card px-4 py-2 text-[13px] font-semibold text-foreground/65 ring-1 ring-border hover:bg-muted"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
