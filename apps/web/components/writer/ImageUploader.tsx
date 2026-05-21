'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { uploadImage } from '@/lib/storage/uploadImage';

/**
 * 画像アップロード共通 UI。
 * - drag&drop / クリックで <input type="file"> を起動
 *   (UAT 指摘でクリップボード貼り付けは廃止)
 * - クライアント側で max 2000px / JPEG 80% に縮小してから Server Action へ
 *   （カバー画像のフリーズや Vercel body limit (4.5MB) 超過対策）
 * - 失敗時の原因別 toast / 進捗スピナー
 * - HEIC / HEIF は明示的に対応外として弾く
 * - URL 直接入力にもフォールバック対応（Storage 未設定時の救済）
 *
 * 使い回し:
 *   - カバー画像（aspect 3:2）
 *   - 本文内画像（小サイズ）
 *   - スポット画像（任意）
 */

// クライアント側リサイズの最大辺と JPEG 品質
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.82;
// HEIC / HEIF は明示的に対応外
const UNSUPPORTED_TYPES = new Set(['image/heic', 'image/heif']);
const HEIC_EXT_RE = /\.(heic|heif)$/i;
// クライアント側のハードリミット（uploadImage 側でも 20MB を超えると弾かれる）
const CLIENT_MAX_BYTES = 20 * 1024 * 1024;

/**
 * 画像を canvas で max 2000px に縮小して JPEG 80% で再エンコード。
 * 失敗した場合 (decode 不能 / canvas エラー) は元の File を返す。
 */
async function resizeImageIfNeeded(file: File): Promise<File> {
  // GIF はアニメーションが失われるのでリサイズ対象外。
  if (file.type === 'image/gif') return file;
  if (typeof window === 'undefined') return file;
  try {
    const bitmap = await createBitmap(file);
    if (!bitmap) return file;
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    // 既に十分小さい かつ ファイル本体も 1MB 未満なら触らない
    if (longest <= MAX_DIMENSION && file.size < 1024 * 1024) {
      bitmap.close?.();
      return file;
    }
    const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) return file;
    const stem = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${stem}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

async function createBitmap(file: File): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // 一部のブラウザ / 形式は createImageBitmap が落ちる。フォールバックする。
    }
  }
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        // ImageBitmap 互換のダミーを返す（drawImage に渡せる）
        URL.revokeObjectURL(url);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolve(img as any);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

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
  // 簡易進捗フェーズ表示（リサイズ中 / 送信中）
  const [phase, setPhase] = useState<'idle' | 'resizing' | 'uploading'>('idle');

  const handleFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files);
    if (arr.length === 0) return;
    const file = arr[0]!;
    // 1) HEIC / HEIF は明示的に対応外
    if (
      UNSUPPORTED_TYPES.has(file.type.toLowerCase()) ||
      HEIC_EXT_RE.test(file.name)
    ) {
      toast.error(
        '.heic / .heif ファイルは対応していません。.jpg / .png に変換してから再アップロードしてください。',
      );
      return;
    }
    // 2) 画像種別チェック
    if (file.type && !file.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください');
      return;
    }
    // 3) 上限超え（リサイズ前判定）
    if (file.size > CLIENT_MAX_BYTES) {
      toast.error(
        `ファイルサイズが大きすぎます（${Math.round(
          file.size / 1024 / 1024,
        )}MB / 上限 20MB）。`,
      );
      return;
    }
    startTransition(async () => {
      try {
        setPhase('resizing');
        // 4) クライアント側で max 2000px / JPEG 80% にリサイズ
        const compressed = await resizeImageIfNeeded(file);
        setPhase('uploading');
        const fd = new FormData();
        fd.append('file', compressed);
        const res = await uploadImage(fd);
        if (res.ok) {
          onChange(res.url);
          setUrlDraft(res.url);
          const reduction =
            file.size > 0
              ? Math.max(0, Math.round((1 - compressed.size / file.size) * 100))
              : 0;
          toast.success(
            reduction > 5
              ? `画像をアップロードしました（${reduction}% 圧縮）`
              : '画像をアップロードしました',
          );
        } else {
          // サーバ側からのエラーメッセージを尊重しつつ、ヒントを足す
          toast.error(res.error || 'アップロードに失敗しました');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '不明なエラー';
        toast.error(`アップロード中に問題が発生しました: ${msg}`);
      } finally {
        setPhase('idle');
      }
    });
  };

  const progressLabel =
    phase === 'resizing'
      ? '画像を圧縮中…'
      : phase === 'uploading'
        ? 'アップロード中…'
        : null;

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
            className="relative w-full overflow-hidden rounded-md border border-border bg-muted"
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
            >
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  {progressLabel ?? '処理中…'}
                </span>
              ) : (
                '差し替える'
              )}
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
          aria-label="画像をアップロード（クリック / ドラッグ&ドロップ）"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={
            'flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-10 text-center text-[12px] transition ' +
            (dragOver
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-border bg-card hover:border-primary-300 hover:bg-primary-500/10')
          }
          style={{ aspectRatio: aspect }}
        >
          <p className="font-medium text-foreground/80">
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner />
                {progressLabel ?? '処理中…'}
              </span>
            ) : (
              '画像をドラッグ & ドロップ、またはクリック'
            )}
          </p>
          <p className="text-[11px] text-foreground/40">
            JPEG / PNG / WebP / GIF（最大 20MB / 長辺 2000px に自動縮小）
          </p>
          <p className="text-[11px] text-foreground/40">
            .heic / .heif は非対応。jpg / png に変換してください。
          </p>
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
            className="flex h-9 w-full rounded-sm border border-border bg-card px-3 text-[12px] text-foreground placeholder:text-neutral-400 focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
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

/** 小さなインライン円形スピナー（外部依存なし） */
function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin text-primary-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
