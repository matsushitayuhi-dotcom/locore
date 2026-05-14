'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { MapPin, Upload, X, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { uploadImage } from '@/lib/storage/uploadImage';
import type { PhotoEntry } from '@/lib/mock/types';

/**
 * フォト日記エディタ。最大 10 枚の写真 + キャプション + 場所名を編集する。
 *
 * - 写真アップロードは既存の uploadImage（'article-images' バケット）を使用
 * - キャプション 500 字、場所名 200 字
 * - 並び順は ↑↓ ボタンで変更（drag は MVP 後で）
 * - articleType='photo_journal' のときだけ親 (EditorShell) から表示される
 */

export type PhotoJournalSectionProps = {
  value: PhotoEntry[];
  onChange: (next: PhotoEntry[]) => void;
};

const MAX_ENTRIES = 10;

export function PhotoJournalSection({ value, onChange }: PhotoJournalSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  const updateAt = (idx: number, patch: Partial<PhotoEntry>) => {
    const next = value.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    onChange(reindex(next));
  };

  const removeAt = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(reindex(next));
  };

  const moveAt = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    onChange(reindex(next));
  };

  const onPickFiles = () => fileInputRef.current?.click();

  const onFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const remaining = MAX_ENTRIES - value.length;
    if (remaining <= 0) {
      toast.error(`写真は最大 ${MAX_ENTRIES} 枚までです`);
      return;
    }
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.warning(
        `${MAX_ENTRIES} 枚を超えるため最初の ${remaining} 枚だけアップロードします`,
      );
    }

    startTransition(async () => {
      setProgress({ done: 0, total: toUpload.length });
      const newEntries: PhotoEntry[] = [];
      let failures = 0;
      for (let i = 0; i < toUpload.length; i += 1) {
        const file = toUpload[i]!;
        const fd = new FormData();
        fd.set('file', file);
        try {
          const res = await uploadImage(fd);
          if (res.ok) {
            newEntries.push({
              imageUrl: res.url,
              caption: '',
              locationName: null,
              position: value.length + newEntries.length,
            });
          } else {
            failures += 1;
            toast.error(res.error);
          }
        } catch (err) {
          failures += 1;
          toast.error(err instanceof Error ? err.message : 'アップロードに失敗しました');
        }
        setProgress({ done: i + 1, total: toUpload.length });
      }
      if (newEntries.length > 0) {
        onChange(reindex([...value, ...newEntries]));
        toast.success(
          failures > 0
            ? `${newEntries.length} 枚追加（${failures} 件失敗）`
            : `${newEntries.length} 枚追加しました`,
        );
      }
      setProgress(null);
    });
  };

  return (
    <section
      className="space-y-5 rounded-md bg-card p-5 ring-1 ring-border sm:p-6"
      aria-labelledby="photojournal-title"
    >
      <header>
        <h3
          id="photojournal-title"
          className="text-[15px] font-semibold tracking-tight"
        >
          フォト日記の写真
          <span className="ml-2 text-[12px] font-normal text-foreground/55">
            {value.length} / {MAX_ENTRIES} 枚
          </span>
        </h3>
        <p className="mt-1 text-[12px] text-foreground/65">
          縦スクロールで 1 枚ずつ全画面表示される、インスタ風の没入型記事です。
          1 枚目がカバー画像になります。各写真にキャプションと場所名を付けてください。
        </p>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
        multiple
        hidden
        onChange={onFilesChange}
      />

      {value.length > 0 ? (
        <ol className="space-y-3">
          {value.map((entry, i) => (
            <li
              key={i}
              className="grid gap-3 rounded-lg bg-background p-3 ring-1 ring-border sm:grid-cols-[160px_1fr]"
            >
              {/* サムネ + 操作 */}
              <div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-muted ring-1 ring-border">
                  <Image
                    src={entry.imageUrl}
                    alt=""
                    fill
                    sizes="200px"
                    className="object-cover"
                    unoptimized
                  />
                  <span className="absolute left-1 top-1 rounded-sm bg-primary-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-950">
                    {i + 1}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    aria-label="上に移動"
                    disabled={i === 0}
                    onClick={() => moveAt(i, -1)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-card text-foreground/70 ring-1 ring-border transition hover:bg-primary-500/10 disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="下に移動"
                    disabled={i === value.length - 1}
                    onClick={() => moveAt(i, 1)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-card text-foreground/70 ring-1 ring-border transition hover:bg-primary-500/10 disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="削除"
                    onClick={() => removeAt(i)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-card text-danger-500 ring-1 ring-border transition hover:bg-danger-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* キャプション + 場所名 */}
              <div className="space-y-2">
                <div>
                  <label
                    htmlFor={`pj-caption-${i}`}
                    className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55"
                  >
                    キャプション
                  </label>
                  <textarea
                    id={`pj-caption-${i}`}
                    value={entry.caption}
                    onChange={(e) =>
                      updateAt(i, { caption: e.target.value.slice(0, 500) })
                    }
                    rows={3}
                    placeholder="この写真で伝えたいこと（500 字まで）"
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px] leading-relaxed focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
                  />
                  <p className="mt-0.5 text-right text-[10px] text-foreground/45">
                    {entry.caption.length} / 500
                  </p>
                </div>
                <div>
                  <label
                    htmlFor={`pj-loc-${i}`}
                    className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55"
                  >
                    <MapPin className="mr-1 inline h-3 w-3" />
                    場所
                  </label>
                  <input
                    id={`pj-loc-${i}`}
                    type="text"
                    value={entry.locationName ?? ''}
                    onChange={(e) =>
                      updateAt(i, {
                        locationName: e.target.value
                          ? e.target.value.slice(0, 200)
                          : null,
                      })
                    }
                    placeholder="例: マレ地区 Du Pain et des Idées"
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      <button
        type="button"
        onClick={onPickFiles}
        disabled={isPending || value.length >= MAX_ENTRIES}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background py-8 text-[13px] font-medium text-foreground/65 transition hover:border-primary-300 hover:bg-primary-500/10 hover:text-primary-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            アップロード中 {progress ? `${progress.done}/${progress.total}` : ''}
          </>
        ) : value.length >= MAX_ENTRIES ? (
          <>最大 {MAX_ENTRIES} 枚です</>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            写真を追加（残り {MAX_ENTRIES - value.length} 枚）
          </>
        )}
      </button>
    </section>
  );
}

function reindex(entries: PhotoEntry[]): PhotoEntry[] {
  return entries.map((e, i) => ({ ...e, position: i }));
}
