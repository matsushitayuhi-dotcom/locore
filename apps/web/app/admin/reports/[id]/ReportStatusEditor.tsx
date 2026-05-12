'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { updateReportStatus } from '../actions';

const STATUSES: { value: ReportStatus; label: string }[] = [
  { value: 'open', label: '未対応 (open)' },
  { value: 'investigating', label: '調査中 (investigating)' },
  { value: 'resolved', label: '対応済 (resolved)' },
  { value: 'dismissed', label: '却下 (dismissed)' },
];

type ReportStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export function ReportStatusEditor({
  reportId,
  currentStatus,
}: {
  reportId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ReportStatus>(currentStatus as ReportStatus);
  const [notes, setNotes] = useState('');
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateReportStatus({
        reportId,
        status,
        notes: notes.trim() || undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('更新しました');
      setNotes('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          状態
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ReportStatus)}
          className="flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-sm focus:border-2 focus:border-primary-500 focus:outline-none focus:px-[11px]"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          メモ（任意・監査ログに保存されます）
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="対応内容・判断理由など"
          className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-body-sm focus:border-2 focus:border-primary-500 focus:outline-none focus:px-[11px] focus:py-[7px]"
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={pending}
      >
        {pending ? '更新中…' : 'ステータスを更新'}
      </Button>
    </form>
  );
}
