'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input, Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { updateProfile } from '@/app/settings/profile/actions';
import { uploadAvatar } from '@/lib/storage/uploadImage';

/**
 * プロフィール編集フォーム。
 *
 * - 駐在員 / 読者の区別なし（"writer 用 bio" は廃止）
 * - アバター画像はファイル選択 / D&D で Supabase Storage にアップロード
 *   (UAT 指摘でクリップボード貼り付けは廃止)
 */

type Props = {
  initial: {
    displayName: string;
    bio: string;
    avatarUrl: string;
  };
};

export function ProfileForm({ initial }: Props) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [isPending, startTransition] = useTransition();
  const [isUploading, startUpload] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProfile({
        displayName,
        bio,
        avatarUrl,
      });
      if (res.ok) {
        toast.success('プロフィールを更新しました');
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const file = arr[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    startUpload(async () => {
      const res = await uploadAvatar(fd);
      if (res.ok) {
        setAvatarUrl(res.url);
        toast.success('アップロードしました。下の「保存する」を押して反映してください');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-md bg-card p-5 ring-1 ring-border sm:p-6"
    >
      {/* アバター ---------------------------------------------------- */}
      <div>
        <label className="mb-2 block text-[12px] font-medium text-foreground/70">
          プロフィール画像
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar size="xl" className="ring-2 ring-border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback>
              {displayName ? displayName[0]!.toUpperCase() : '?'}
            </AvatarFallback>
          </Avatar>
          <div
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-primary-500/40 bg-primary-500/10 px-4 py-6 text-center text-[12px] outline-none transition hover:border-primary-300 hover:bg-primary-500/10 focus:border-primary-500"
          >
            <p className="font-medium text-primary-300">
              {isUploading ? 'アップロード中…' : '画像をドラッグ & ドロップ、またはクリック'}
            </p>
            <p className="mt-1 text-[11px] text-foreground/40">
              JPEG / PNG / WebP / GIF・最大 4MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
        {avatarUrl ? (
          // 旧実装は avatarUrl をテキスト表示していたが、Supabase の署名 URL
          // は数百文字あるためスマホで横スクロールが発生していた (UAT 指摘)。
          // URL は出さず、アップロード済みの状態と「画像を外す」だけを表示する。
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-foreground/55">
            <span className="inline-flex items-center gap-1 text-success-500">
              <span aria-hidden>✓</span>
              アップロード済み
            </span>
            <button
              type="button"
              onClick={() => setAvatarUrl('')}
              className="shrink-0 rounded-sm px-2 py-0.5 text-[11px] font-medium text-foreground/60 hover:bg-muted hover:text-danger-500"
            >
              画像を外す
            </button>
          </div>
        ) : null}
      </div>

      {/* 表示名 ---------------------------------------------------- */}
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          表示名
          <span className="ml-1 text-danger-500">*</span>
        </label>
        <Input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          required
        />
        <p className="mt-1 text-[11px] text-foreground/50">1〜50 文字</p>
      </div>

      {/* 自己紹介 -------------------------------------------------- */}
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          自己紹介
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={4}
          className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-body-md text-foreground placeholder:text-neutral-400 focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-foreground/50">{bio.length} / 500</p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isPending || isUploading}>
          {isPending ? '保存中…' : '保存する'}
        </Button>
      </div>
    </form>
  );
}
