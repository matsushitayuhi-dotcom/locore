'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { submitReport } from '@/app/report/[targetType]/[targetId]/actions';

const REASONS: { value: string; label: string; hint: string }[] = [
  { value: 'spam', label: 'スパム / 宣伝', hint: '無関係な広告・宣伝・繰り返し投稿' },
  { value: 'inappropriate', label: '不適切な内容', hint: '差別・嫌がらせ・暴力的表現' },
  { value: 'misinformation', label: '誤情報', hint: '事実と明らかに異なる情報' },
  { value: 'copyright', label: '著作権・権利侵害', hint: '無断転載・他者の権利侵害' },
  { value: 'other', label: 'その他', hint: '上記に当てはまらないもの' },
];

type Props = {
  targetType: 'article' | 'user' | 'review' | 'light_diary';
  targetId: string;
  /** 通報対象のラベル（記事タイトル等）、画面上部に表示。 */
  targetLabel: string;
  /** ログインしているか。匿名通報の注釈表示に使う。 */
  isAuthenticated: boolean;
};

export function ReportForm({
  targetType,
  targetId,
  targetLabel,
  isAuthenticated,
}: Props) {
  const router = useRouter();
  const [reason, setReason] = useState<string>('spam');
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitReport({
        targetType,
        targetId,
        reason,
        body: body.trim() || undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.duplicateWarning) {
        toast.warning('同じ対象への直近の通報があります。重ねて受け付けました。');
      } else {
        toast.success('通報を受け付けました');
      }
      router.push(`/report/thanks?code=${encodeURIComponent(res.receiptCode)}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-md border border-border bg-card p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">
          通報対象（{labelOfType(targetType)}）
        </p>
        <p className="mt-1 line-clamp-2 text-[14px] font-medium text-foreground">
          {targetLabel}
        </p>
        <p className="mt-1 text-[11px] text-foreground/40">ID: {targetId}</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 block text-[12px] font-medium text-foreground/70">
          理由 <span className="text-danger-500">*</span>
        </legend>
        {REASONS.map((r) => (
          <label
            key={r.value}
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
              reason === r.value
                ? 'border-primary-700 bg-primary-50/40'
                : 'border-border bg-card hover:bg-neutral-50'
            }`}
          >
            <input
              type="radio"
              name="reason"
              value={r.value}
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
              className="mt-1"
            />
            <span>
              <span className="block text-[14px] font-medium">{r.label}</span>
              <span className="block text-[12px] text-foreground/60">{r.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          補足（任意）
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="通報の詳細・該当箇所など（任意・最大 2000 文字）"
          className="flex w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 py-2 text-body-md text-neutral-900 focus:border-2 focus:border-primary-700 focus:outline-none focus:px-[11px] focus:py-[7px]"
        />
        <p className="mt-1 text-right text-[11px] text-foreground/50">
          {body.length} / 2000
        </p>
      </div>

      <div className="rounded-md border border-border bg-card p-4 text-[12px] leading-relaxed text-foreground/70">
        通報内容は運営のみ閲覧します。
        <strong className="text-foreground">72 時間以内</strong> に確認のうえ、必要に応じて措置（警告・非表示・削除）を行います。
        {!isAuthenticated && (
          <>
            <br />
            <span className="text-foreground/60">
              現在ログインしていないため、匿名通報として記録されます。
            </span>
          </>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? '送信中…' : '通報する'}
      </Button>
    </form>
  );
}

function labelOfType(t: Props['targetType']): string {
  switch (t) {
    case 'article':
      return '記事';
    case 'user':
      return 'ユーザー';
    case 'review':
      return 'レビュー';
    case 'light_diary':
      return 'ライト旅行記';
  }
}
