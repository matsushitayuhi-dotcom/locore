'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, X } from '@locore/ui/icons';
import {
  createBookmarkFolder,
  moveBookmark,
  type BookmarkFolderSummary,
} from '@/lib/bookmarks/actions';

/**
 * 記事ブックマーク用のフォルダ選択ダイアログ。
 * 親が articleId を渡したら開く（null で閉じる）。
 *
 * - 「未分類」を選ぶと folderId=null で保存
 * - 既存フォルダを選ぶとそのフォルダに移動
 * - 新しいフォルダ名を入力 → 作成して即その記事を入れる
 */

type Props = {
  /** 開きたい記事の ID。null なら閉じる */
  articleId: string | null;
  articleTitle?: string;
  initialFolders: BookmarkFolderSummary[];
  onClose: () => void;
};

export function BookmarkFolderDialog({
  articleId,
  articleTitle,
  initialFolders,
  onClose,
}: Props) {
  const [folders, setFolders] = useState<BookmarkFolderSummary[]>(initialFolders);
  const [drafting, setDrafting] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

  // initialFolders が外から変わったら追従（再フェッチ用）
  useEffect(() => {
    setFolders(initialFolders);
  }, [initialFolders]);

  // ESC で閉じる
  useEffect(() => {
    if (!articleId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [articleId, onClose]);

  if (!articleId) return null;

  const onPick = (folderId: string | null, label: string) => {
    startTransition(async () => {
      const res = await moveBookmark({ articleId, folderId });
      if (res.ok) {
        toast.success(`「${label}」に追加しました`);
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  };

  const onCreateAndPick = () => {
    const name = draftName.trim();
    if (!name) {
      toast.error('フォルダ名を入力してください');
      return;
    }
    startTransition(async () => {
      const res = await createBookmarkFolder({ name });
      if (res.ok && res.data) {
        const newFolder: BookmarkFolderSummary = {
          id: res.data.id,
          name,
          color: null,
          count: 0,
        };
        setFolders((prev) => [newFolder, ...prev]);
        setDraftName('');
        setDrafting(false);
        // 作ってすぐその記事を入れる
        onPick(newFolder.id, name);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="フォルダを選ぶ"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[360px] rounded-lg bg-card p-4 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
              フォルダを選ぶ
            </p>
            {articleTitle ? (
              <p className="mt-0.5 line-clamp-1 text-[12px] text-foreground/60">
                {articleTitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="rounded-sm p-1 text-foreground/40 hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="max-h-[280px] space-y-0.5 overflow-y-auto">
          <li>
            <button
              type="button"
              onClick={() => onPick(null, '未分類')}
              disabled={isPending}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] hover:bg-primary-500/10 disabled:opacity-50"
            >
              <span className="font-medium">未分類</span>
              <span className="text-[10px] text-foreground/50">既定フォルダ</span>
            </button>
          </li>
          {folders.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onPick(f.id, f.name)}
                disabled={isPending}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] hover:bg-primary-500/10 disabled:opacity-50"
              >
                <span className="truncate font-medium">{f.name}</span>
                <span className="ml-2 shrink-0 text-[10px] text-foreground/50">
                  {f.count}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t border-border pt-3">
          {drafting ? (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="新しいフォルダ名"
                maxLength={60}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onCreateAndPick();
                  }
                }}
                className="h-9 flex-1 rounded-sm border border-primary-500/40 bg-card px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:px-[7px] focus:outline-none"
              />
              <button
                type="button"
                onClick={onCreateAndPick}
                disabled={isPending || !draftName.trim()}
                className="rounded-sm bg-primary-700 px-3 text-[12px] font-bold text-white hover:bg-primary-500 disabled:opacity-40"
              >
                追加
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDrafting(true)}
              className="inline-flex w-full items-center justify-center gap-1 rounded-md px-3 py-2 text-[13px] font-medium text-primary-300 hover:bg-primary-500/10"
            >
              <Plus className="h-3.5 w-3.5" />
              新しいフォルダを作る
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
