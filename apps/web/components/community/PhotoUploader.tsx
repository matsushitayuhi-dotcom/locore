'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadCommunityImage } from '@/lib/storage/uploadImage';

/**
 * コミュニティ投稿（アパート、売買、レッスン等）の写真アップローダー。
 *
 * - URL 入力ではなく、Supabase Storage 'community-images' バケットに直接アップロード
 * - 公開 URL を photos 配列として管理（親に onChange で渡す）
 * - 最大 maxPhotos（既定 12）まで
 * - 並び替え（左右移動）と削除に対応
 * - JPEG / PNG / WebP / GIF まで、8MB 上限
 */

type Props = {
  photos: string[];
  onChange: (next: string[]) => void;
  maxPhotos?: number;
  /** 親の form の name 属性に対応する hidden input を出すか */
  inputName?: string;
};

export function PhotoUploader({
  photos,
  onChange,
  maxPhotos = 12,
  inputName,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  const onPickFiles = () => fileInputRef.current?.click();

  const onFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // 同じファイル再選択を許す
    if (files.length === 0) return;

    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      toast.error(`写真は最大 ${maxPhotos} 枚までです`);
      return;
    }
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.warning(
        `${maxPhotos} 枚を超えるため、最初の ${remaining} 枚だけアップロードします`,
      );
    }

    startTransition(async () => {
      setProgress({ done: 0, total: toUpload.length });
      const successUrls: string[] = [];
      let failures = 0;

      for (let i = 0; i < toUpload.length; i += 1) {
        const file = toUpload[i]!;
        const fd = new FormData();
        fd.set('file', file);
        try {
          const res = await uploadCommunityImage(fd);
          if (res.ok) {
            successUrls.push(res.url);
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

      if (successUrls.length > 0) {
        onChange([...photos, ...successUrls]);
        toast.success(
          failures > 0
            ? `${successUrls.length} 枚アップロード（${failures} 件失敗）`
            : `${successUrls.length} 枚アップロードしました`,
        );
      }
      setProgress(null);
    });
  };

  const onRemove = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx);
    onChange(next);
  };

  const onMove = (idx: number, dir: -1 | 1) => {
    const next = [...photos];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {/* hidden inputs（form submit 用）*/}
      {inputName
        ? photos.map((url, i) => (
            <input key={i} type="hidden" name={inputName} value={url} />
          ))
        : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
        multiple
        hidden
        onChange={onFilesChange}
      />

      {photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {photos.map((url, i) => (
            <li
              key={url}
              className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted ring-1 ring-border"
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="200px"
                className="object-cover"
                unoptimized
              />
              {/* 並び替え + 削除 */}
              <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                <button
                  type="button"
                  aria-label="左に移動"
                  disabled={i === 0}
                  onClick={() => onMove(i, -1)}
                  className="h-6 w-6 rounded-full bg-card/90 text-[10px] font-bold text-foreground/70 backdrop-blur transition hover:bg-card disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="右に移動"
                  disabled={i === photos.length - 1}
                  onClick={() => onMove(i, 1)}
                  className="h-6 w-6 rounded-full bg-card/90 text-[10px] font-bold text-foreground/70 backdrop-blur transition hover:bg-card disabled:opacity-30"
                >
                  →
                </button>
              </div>
              <button
                type="button"
                aria-label="削除"
                onClick={() => onRemove(i)}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-card/90 text-danger-500 backdrop-blur transition hover:bg-card"
              >
                <X className="h-3 w-3" />
              </button>
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded-sm bg-primary-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-950">
                  TOP
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={onPickFiles}
        disabled={isPending || photos.length >= maxPhotos}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background py-6 text-[13px] font-medium text-foreground/65 transition hover:border-primary-300 hover:bg-primary-500/10 hover:text-primary-300 disabled:cursor-not-allowed disabled:opacity-50 sm:py-8"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            アップロード中 {progress ? `${progress.done}/${progress.total}` : ''}
          </>
        ) : photos.length >= maxPhotos ? (
          <>最大 {maxPhotos} 枚です</>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            写真を選ぶ（残り {maxPhotos - photos.length} 枚、JPEG/PNG/HEIC など 20MB まで）
          </>
        )}
      </button>

      <p className="text-[10px] text-foreground/55">
        1 枚目がカードのサムネイルになります。「←→」ボタンで並び替えできます。
      </p>
    </div>
  );
}
