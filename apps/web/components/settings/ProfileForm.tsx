'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { updateProfile } from '@/app/settings/profile/actions';

type Props = {
  initial: {
    displayName: string;
    bio: string;
    avatarUrl: string;
    writerBio: string;
  };
  isWriter: boolean;
};

export function ProfileForm({ initial, isWriter }: Props) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [writerBio, setWriterBio] = useState(initial.writerBio);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProfile({
        displayName,
        bio,
        avatarUrl,
        writerBio: isWriter ? writerBio : undefined,
      });
      if (res.ok) {
        toast.success('プロフィールを更新しました');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-md border border-border bg-card p-5 sm:p-6">
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

      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          アバター画像 URL
        </label>
        <Input
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…"
        />
        <p className="mt-1 text-[11px] text-foreground/50">
          画像 URL を直接指定できます（直接アップロードは今後対応）。
        </p>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          自己紹介
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={4}
          className="flex w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 py-2 text-body-md text-neutral-900 placeholder:text-neutral-400 focus:border-2 focus:border-primary-700 focus:px-[11px] focus:py-[7px] focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-foreground/50">
          {bio.length} / 500
        </p>
      </div>

      {isWriter ? (
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            書き手向け詳細紹介
          </label>
          <textarea
            value={writerBio}
            onChange={(e) => setWriterBio(e.target.value)}
            maxLength={500}
            rows={4}
            className="flex w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 py-2 text-body-md text-neutral-900 placeholder:text-neutral-400 focus:border-2 focus:border-primary-700 focus:px-[11px] focus:py-[7px] focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-foreground/50">
            読者向けにあなたの専門・滞在歴などを伝える文。{writerBio.length} / 500
          </p>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? '保存中…' : '保存する'}
        </Button>
      </div>
    </form>
  );
}
