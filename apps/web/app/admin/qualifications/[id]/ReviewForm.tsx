'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { approveQualification, rejectQualification } from '../actions';

/** 資格の承認 / 却下フォーム（admin/verifications の ReviewForm と同型） */
export function ReviewForm({ id }: { id: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'reject'>('idle');
  const [reason, setReason] = useState('');
  const [reviewerNote, setReviewerNote] = useState('');
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) =>
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.ok) {
          toast.success(okMsg);
          router.refresh();
        } else toast.error(res.error ?? '処理失敗');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '処理失敗');
      }
    });

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          内部メモ（任意・ユーザーには見えません）
        </label>
        <textarea
          value={reviewerNote}
          onChange={(e) => setReviewerNote(e.target.value)}
          maxLength={500}
          rows={2}
          className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-[12px] focus:border-2 focus:border-primary-500 focus:outline-none"
        />
      </div>
      {mode === 'idle' ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={() => {
              if (!confirm('この資格を承認しますか？ 公開プロフィールに「確認済み」で表示されます。')) return;
              run(() => approveQualification({ id, reviewerNote: reviewerNote.trim() || undefined }), '承認しました');
            }}
            className="inline-flex items-center gap-1.5"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
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
          <label className="block text-[12px] font-medium text-danger-500">
            却下理由（必須・ユーザーにメールで通知）
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="例: スコアレポートの氏名が読み取れないため、氏名とスコアが同一面に写った画像を再提出してください。"
            className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-[13px] focus:border-2 focus:border-danger-500 focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (reason.trim().length < 10) {
                  toast.error('却下理由は 10 文字以上で書いてください');
                  return;
                }
                if (!confirm('この申請を却下しますか？')) return;
                run(
                  () => rejectQualification({ id, reason: reason.trim(), reviewerNote: reviewerNote.trim() || undefined }),
                  '却下しました',
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-danger-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-danger-500/90 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              却下を確定する
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('idle');
                setReason('');
              }}
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
