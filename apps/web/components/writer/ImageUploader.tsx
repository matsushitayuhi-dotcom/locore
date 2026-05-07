'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { uploadImage } from '@/lib/storage/uploadImage';

/**
 * 画像アップロード共通 UI。
 * - drag&drop / クリックで <input type="file"> を起動
 * - Server Action `uploadImage` を呼び、公開 URL を取得
 * - URL 直接入力にもフォールバック対応（Storage 未設定時の救済）
 *
 * 使い回し:
 *   - カバー画像（aspect 3:2）
 *   - 本文内画像（小サイズ）
 *   - スポット画像（任意）
 */

type Props = {
  value: string;
  onChange: (url: string) => void;
  /** プレビューのアスペクト比 ('3 / 2' 等)。デフォルト '3 / 2'。 */
  aspect?: string;
  /** 入力欄の placeholder（URL を貼る入力用）。 */
  placeholder?: string;
  /** ラベル文（必要なら）。 */
  label?: string;
  /** 公開中で編集警告を出したい場合。 */
  isPublished?: boolean;
};

export function ImageUploader({
  value,
  onChange,
  aspect = '3 / 2',
  placeholder = 'https://example.com/cover.jpg',
  label,
  isPublished,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const res = await uploadImage(fd);
      if (res.ok) {
        onChange(res.url);
        setUrlDraft(res.url);
        toast.success('画像をアップロードしました');
      } else {
        toast.error(res.error);
      }
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const onRemove = () => {
    onChange('');
    setUrlDraft('');
  };

  return (
    <div className="space-y-2">
      {label ? (
        <label className="block text-[12px] font-medium text-foreground/70">{label}</label>
      ) : null}

      {value ? (
        <div className="space-y-2">
          <div
            className="relative w-full overflow-hidden rounded-md border border-border bg-neutral-50"
            style={{ aspectRatio: aspect }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="アップロード済みの画像"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0.4';
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              {isPending ? 'アップロード中…' : '差し替える'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              削除
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUrlInput((v) => !v)}
            >
              URL を直接入力
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="画像をアップロード"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={
            'flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-10 text-center text-[12px] transition ' +
            (dragOver
              ? 'border-primary-700 bg-primary-50/40'
              : 'border-border bg-card hover:border-foreground/30')
          }
          style={{ aspectRatio: aspect }}
        >
          <p className="font-medium text-foreground/80">
            {isPending ? 'アップロード中…' : '画像をドラッグ & ドロップ'}
          </p>
          <p className="text-foreground/50">クリックでファイルを選択</p>
          <p className="text-[11px] text-foreground/40">JPEG / PNG / WebP / GIF（最大 8MB）</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {showUrlInput || !value ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder={placeholder}
            className="flex h-9 w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 text-[12px] text-neutral-900 placeholder:text-neutral-400 focus:border-2 focus:border-primary-700 focus:px-[11px] focus:outline-none"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange(urlDraft.trim());
              setShowUrlInput(false);
            }}
            disabled={!urlDraft.trim()}
          >
            適用
          </Button>
        </div>
      ) : null}

      {isPublished ? (
        <p className="text-[11px] text-warning-700">
          公開中の記事です。画像変更は即時反映されます。
        </p>
      ) : null}
    </div>
  );
}
