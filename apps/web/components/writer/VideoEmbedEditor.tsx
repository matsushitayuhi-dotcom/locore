'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { Plus, X } from '@locore/ui/icons';
import { addVideo, removeVideo } from '@/app/writer/articles/[id]/edit/actions';

export type VideoRow = {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'x' | 'other';
  embedUrl: string;
  position: number;
};

const PLATFORM_LABEL: Record<VideoRow['platform'], string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  x: 'X (旧 Twitter)',
  other: 'その他',
};

type Props = {
  articleId: string;
  initial: VideoRow[];
};

export function VideoEmbedEditor({ articleId, initial }: Props) {
  const [rows, setRows] = useState<VideoRow[]>(
    [...initial].sort((a, b) => a.position - b.position),
  );
  const [platform, setPlatform] = useState<VideoRow['platform']>('youtube');
  const [embedUrl, setEmbedUrl] = useState('');
  const [isPending, startTransition] = useTransition();

  const onAdd = () => {
    if (!embedUrl.trim()) {
      toast.error('動画 URL を入力してください');
      return;
    }
    startTransition(async () => {
      const res = await addVideo({ articleId, platform, embedUrl: embedUrl.trim() });
      if (res.ok) {
        toast.success('動画を追加しました');
        setRows((prev) => [
          ...prev,
          {
            id: res.data!.id,
            platform,
            embedUrl: embedUrl.trim(),
            position: prev.length,
          },
        ]);
        setEmbedUrl('');
      } else {
        toast.error(res.error);
      }
    });
  };

  const onRemove = (videoId: string) => {
    if (!window.confirm('この動画埋め込みを削除します。よろしいですか？')) return;
    startTransition(async () => {
      const res = await removeVideo({ articleId, videoId });
      if (res.ok) {
        toast.success('削除しました');
        setRows((prev) => prev.filter((r) => r.id !== videoId));
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {rows.length === 0 ? (
          <li className="rounded-md border border-dashed border-border bg-card p-4 text-[12px] text-foreground/50">
            まだ動画は追加されていません。
          </li>
        ) : (
          rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
            >
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                {PLATFORM_LABEL[r.platform]}
              </span>
              <a
                href={r.embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-[12px] text-primary-300 underline-offset-4 hover:underline"
              >
                {r.embedUrl}
              </a>
              <button
                type="button"
                aria-label="動画を削除"
                onClick={() => onRemove(r.id)}
                className="rounded-sm p-1 text-foreground/50 hover:bg-muted hover:text-danger-500"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="rounded-md border border-border bg-card p-4">
        <p className="mb-3 text-[12px] font-medium text-foreground/70">動画を追加</p>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as VideoRow['platform'])}
            className="flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-md text-foreground focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          >
            {Object.entries(PLATFORM_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <Input
            type="url"
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@user/video/123… など"
          />
          <Button type="button" variant="primary" onClick={onAdd} disabled={isPending}>
            <Plus className="h-4 w-4" />
            追加
          </Button>
        </div>
      </div>
    </div>
  );
}
