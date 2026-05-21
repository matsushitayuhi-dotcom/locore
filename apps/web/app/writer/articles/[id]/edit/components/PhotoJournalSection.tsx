'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { MapPin, Upload, X, Loader2, GripVertical } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { uploadImage } from '@/lib/storage/uploadImage';
import type { PhotoEntry } from '@/lib/mock/types';

/**
 * フォト日記エディタ。最大 10 枚の写真 + キャプション + 場所名を編集する。
 *
 * - 写真アップロードは既存の uploadImage（'article-images' バケット）を使用
 * - キャプション 500 字、場所名 200 字
 * - 並び替えは dnd-kit のドラッグ&ドロップ（マウス・タッチ・キーボード対応）
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

  // ----- dnd-kit -----
  // 各エントリの安定 ID を維持するため、index ではなく imageUrl + position の組み合わせを使う。
  // 同じ imageUrl が万一複数あっても position で重複しないようにする。
  const itemIds = value.map((e, i) => entryId(e, i));

  const sensors = useSensors(
    // 軽いドラッグ閾値を与えてキャプション編集中の誤ドラッグを避ける
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = itemIds.indexOf(String(active.id));
    const newIndex = itemIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(value, oldIndex, newIndex);
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
          並べ替えは左のハンドル（≡）をドラッグ。
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <ol className="space-y-3">
              {value.map((entry, i) => (
                <SortablePhotoItem
                  key={itemIds[i]}
                  id={itemIds[i]!}
                  entry={entry}
                  index={i}
                  onChangeCaption={(caption) => updateAt(i, { caption })}
                  onChangeLocation={(locationName) =>
                    updateAt(i, { locationName })
                  }
                  onRemove={() => removeAt(i)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
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

// =============================================================================
// 1 枚分のソータブル行
// =============================================================================
function SortablePhotoItem({
  id,
  entry,
  index,
  onChangeCaption,
  onChangeLocation,
  onRemove,
}: {
  id: string;
  entry: PhotoEntry;
  index: number;
  onChangeCaption: (v: string) => void;
  onChangeLocation: (v: string | null) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={
        'grid gap-3 rounded-lg bg-background p-3 ring-1 ring-border sm:grid-cols-[28px_160px_1fr] ' +
        (isDragging ? 'ring-2 ring-primary-500' : '')
      }
    >
      {/* ドラッグハンドル */}
      <button
        type="button"
        aria-label={`${index + 1} 枚目を並べ替え`}
        {...attributes}
        {...listeners}
        className="flex items-start justify-center pt-2 text-foreground/40 hover:text-foreground/70 touch-none cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </button>

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
            {index + 1}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label="削除"
            onClick={onRemove}
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
            htmlFor={`pj-caption-${index}`}
            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55"
          >
            キャプション
          </label>
          <textarea
            id={`pj-caption-${index}`}
            value={entry.caption}
            onChange={(e) => onChangeCaption(e.target.value.slice(0, 500))}
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
            htmlFor={`pj-loc-${index}`}
            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55"
          >
            <MapPin className="mr-1 inline h-3 w-3" />
            場所
          </label>
          <input
            id={`pj-loc-${index}`}
            type="text"
            value={entry.locationName ?? ''}
            onChange={(e) =>
              onChangeLocation(e.target.value ? e.target.value.slice(0, 200) : null)
            }
            placeholder="例: マレ地区 Du Pain et des Idées"
            className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          />
        </div>
      </div>
    </li>
  );
}

function reindex(entries: PhotoEntry[]): PhotoEntry[] {
  return entries.map((e, i) => ({ ...e, position: i }));
}

/**
 * 並べ替え中に React の key と dnd-kit の id を安定させるためのキー。
 * imageUrl は基本的にユニークだが、念のため index/position を混ぜて完全に一意化する。
 */
function entryId(entry: PhotoEntry, index: number): string {
  return `${entry.imageUrl}#${index}`;
}
