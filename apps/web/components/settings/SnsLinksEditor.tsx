'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { Trash2 } from 'lucide-react';
import { addSnsLink, deleteSnsLink } from '@/app/settings/profile/actions';

type Platform =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'x'
  | 'threads'
  | 'blog'
  | 'facebook'
  | 'note'
  | 'website'
  | 'email';

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'x', label: 'X' },
  { value: 'threads', label: 'Threads' },
  { value: 'note', label: 'note' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'blog', label: 'Blog' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'メール' },
];

type SnsRow = { id: string; platform: Platform; url: string };

type Props = {
  initial: SnsRow[];
};

export function SnsLinksEditor({ initial }: Props) {
  const [rows, setRows] = useState<SnsRow[]>(initial);
  const [draftPlatform, setDraftPlatform] = useState<Platform>('tiktok');
  const [draftUrl, setDraftUrl] = useState('');
  const [isPending, startTransition] = useTransition();

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftUrl.trim()) {
      toast.error('URL を入力してください');
      return;
    }
    startTransition(async () => {
      const res = await addSnsLink({ platform: draftPlatform, url: draftUrl });
      if (res.ok && res.data) {
        toast.success('SNS リンクを追加しました');
        setRows((prev) => [
          ...prev,
          { id: res.data!.id, platform: draftPlatform, url: draftUrl },
        ]);
        setDraftUrl('');
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  const onDelete = (id: string) => {
    if (!confirm('この SNS リンクを削除しますか？')) return;
    startTransition(async () => {
      const res = await deleteSnsLink({ id });
      if (res.ok) {
        toast.success('削除しました');
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <section className="space-y-4 rounded-md bg-card p-5 ring-1 ring-border sm:p-6">
      <header>
        <h3 className="text-[16px] font-semibold tracking-tight">SNS リンク</h3>
        <p className="mt-1 text-[12px] text-foreground/60">
          公開プロフィールに表示されます。同じプラットフォームを複数登録できます（個人用 / 仕事用など）。
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-[12px] text-foreground/50">まだ登録されていません。</p>
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 px-3 py-2.5 text-[13px]"
            >
              <span className="w-20 shrink-0 font-medium text-primary-300">
                {PLATFORMS.find((p) => p.value === r.platform)?.label ?? r.platform}
              </span>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-foreground/80 underline-offset-4 hover:text-primary-300 hover:underline"
              >
                {r.url}
              </a>
              <button
                type="button"
                onClick={() => onDelete(r.id)}
                disabled={isPending}
                className="rounded-sm p-1.5 text-foreground/50 transition-colors hover:bg-muted hover:text-danger-500"
                aria-label="削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onAdd} className="grid gap-3 sm:grid-cols-[150px_1fr_auto]">
        <select
          value={draftPlatform}
          onChange={(e) => setDraftPlatform(e.target.value as Platform)}
          className="h-11 rounded-sm border border-border bg-card px-3 text-body-md focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <Input
          type="url"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          placeholder="https://…"
        />
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? '保存中…' : '追加'}
        </Button>
      </form>
    </section>
  );
}
