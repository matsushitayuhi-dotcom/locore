'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bookmark, Plus, X } from '@locore/ui/icons';
import {
  bookmarkSpot,
  unbookmarkSpot,
  createSpotFolder,
  type FolderSummary,
} from '@/lib/spotFavorites/actions';

/**
 * スポット個別のお気に入りボタン。
 *
 * - 未ログイン → /auth/login にリダイレクト
 * - ログイン中 → クリックで popover を開き、フォルダ一覧から選んで保存
 *   - 既にお気に入り済みなら「外す」を提示
 *   - 「新しいフォルダを作る…」インライン入力でフォルダ追加
 *
 * 親（SpotsCardList）から：
 *   - spotId       : 対象スポット
 *   - bookmarked   : 初期状態
 *   - folders      : ユーザーのフォルダ一覧（サーバ側で listMyFolders を呼んで渡す）
 *   - viewerLoggedIn : 未ログインなら早期離脱用
 */

type Props = {
  spotId: string;
  spotName: string;
  bookmarked: boolean;
  folders: FolderSummary[];
  viewerLoggedIn: boolean;
};

export function SpotFavoriteButton({
  spotId,
  spotName,
  bookmarked: initialBookmarked,
  folders: initialFolders,
  viewerLoggedIn,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [folders, setFolders] = useState<FolderSummary[]>(initialFolders);
  const [drafting, setDrafting] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isPending, startTransition] = useTransition();
  const popRef = useRef<HTMLDivElement>(null);

  // ポップアップ外クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const onPickFolder = (folderId: string | null, label: string) => {
    startTransition(async () => {
      const res = await bookmarkSpot({ spotId, folderId });
      if (res.ok) {
        setBookmarked(true);
        setOpen(false);
        toast.success(`「${spotName}」を「${label}」に追加しました`);
      } else {
        toast.error(res.error);
      }
    });
  };

  const onUnbookmark = () => {
    startTransition(async () => {
      const res = await unbookmarkSpot({ spotId });
      if (res.ok) {
        setBookmarked(false);
        setOpen(false);
        toast.success('お気に入りから外しました');
      } else {
        toast.error(res.error);
      }
    });
  };

  const onCreateFolder = () => {
    const name = draftName.trim();
    if (!name) {
      toast.error('フォルダ名を入力してください');
      return;
    }
    startTransition(async () => {
      const res = await createSpotFolder({ name });
      if (res.ok && res.data) {
        const newFolder: FolderSummary = {
          id: res.data.id,
          name,
          color: null,
          count: 0,
        };
        setFolders((prev) => [...prev, newFolder]);
        setDraftName('');
        setDrafting(false);
        // 作ってすぐ追加
        onPickFolder(newFolder.id, name);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  const onTrigger = () => {
    if (!viewerLoggedIn) {
      router.push(
        `/auth/login?redirectTo=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }
    setOpen((v) => !v);
  };

  return (
    <div className="relative inline-block" ref={popRef}>
      <button
        type="button"
        onClick={onTrigger}
        disabled={isPending}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? 'お気に入りから外す' : 'お気に入りに追加'}
        className={
          'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium ring-1 transition ' +
          (bookmarked
            ? 'bg-primary-700 text-white ring-primary-700 hover:bg-primary-500'
            : 'bg-card text-primary-300 ring-border hover:bg-primary-500/10 hover:ring-primary-300')
        }
      >
        <Bookmark
          className="h-4 w-4"
          fill={bookmarked ? 'currentColor' : 'none'}
        />
        {bookmarked ? 'お気に入り済み' : 'お気に入りに追加'}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[280px] rounded-lg bg-card p-3 shadow-md ring-1 ring-border">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
              フォルダを選ぶ
            </p>
            <button
              type="button"
              aria-label="閉じる"
              onClick={() => setOpen(false)}
              className="rounded-sm p-1 text-foreground/40 hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <ul className="max-h-[260px] space-y-0.5 overflow-y-auto">
            <li>
              <button
                type="button"
                onClick={() => onPickFolder(null, '未分類')}
                disabled={isPending}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-primary-500/10"
              >
                <span className="font-medium">未分類</span>
                <span className="text-[10px] text-foreground/50">
                  既定フォルダ
                </span>
              </button>
            </li>
            {folders.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onPickFolder(f.id, f.name)}
                  disabled={isPending}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-primary-500/10"
                >
                  <span className="truncate font-medium">{f.name}</span>
                  <span className="ml-2 shrink-0 text-[10px] text-foreground/50">
                    {f.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-2 border-t border-border pt-2">
            {drafting ? (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="新しいフォルダ名"
                  maxLength={60}
                  autoFocus
                  className="h-8 flex-1 rounded-sm border border-primary-500/40 bg-card px-2 text-[12px] focus:border-2 focus:border-primary-500 focus:px-[7px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={onCreateFolder}
                  disabled={isPending || !draftName.trim()}
                  className="rounded-sm bg-primary-700 px-2 text-[11px] font-bold text-white hover:bg-primary-500 disabled:opacity-40"
                >
                  追加
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDrafting(true)}
                className="inline-flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-[12px] font-medium text-primary-300 hover:bg-primary-500/10"
              >
                <Plus className="h-3.5 w-3.5" />
                新しいフォルダを作る
              </button>
            )}
          </div>

          {bookmarked ? (
            <button
              type="button"
              onClick={onUnbookmark}
              disabled={isPending}
              className="mt-2 w-full rounded-md border border-danger-500/40 bg-card px-2 py-1.5 text-[12px] font-medium text-danger-500 hover:bg-danger-50"
            >
              お気に入りから外す
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
