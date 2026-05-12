'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bookmark, Plus, X } from '@locore/ui/icons';
import {
  bookmarkSpotsBulk,
  createSpotFolder,
  type FolderSummary,
} from '@/lib/spotFavorites/actions';

/**
 * 記事内の全スポットを一括お気に入り登録するボタン。
 *
 * - 未ログイン → /auth/login にリダイレクト
 * - ログイン中 → クリックで popover を開き、対象フォルダを選択
 *   - 「新しいフォルダを作る」インライン入力で追加 → 作成後に即一括登録
 *   - 既に登録済みのスポットはスキップ（folderId は上書きしない）
 *   - 結果は「N 件追加 / M 件は登録済み」で toast 表示
 */

type Props = {
  spotIds: string[];
  folders: FolderSummary[];
  viewerLoggedIn: boolean;
  /** 既にお気に入り済みの spot id（ボタンラベル「N件中 M件登録済」表示用） */
  bookmarkedSpotIds?: Set<string>;
};

export function BulkSpotFavoriteButton({
  spotIds,
  folders: initialFolders,
  viewerLoggedIn,
  bookmarkedSpotIds,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<FolderSummary[]>(initialFolders);
  const [drafting, setDrafting] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isPending, startTransition] = useTransition();
  const popRef = useRef<HTMLDivElement>(null);

  // クライアント側の即時カウント（popover 内表示用）
  const total = spotIds.length;
  const alreadyCount = bookmarkedSpotIds
    ? spotIds.filter((id) => bookmarkedSpotIds.has(id)).length
    : 0;
  const remaining = total - alreadyCount;

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
      const res = await bookmarkSpotsBulk({ spotIds, folderId });
      if (res.ok && res.data) {
        setOpen(false);
        const { added, existing } = res.data;
        if (added === 0) {
          toast.info(`全 ${existing} スポットは登録済みでした`);
        } else if (existing === 0) {
          toast.success(`${added} スポットを「${label}」に追加しました`);
        } else {
          toast.success(
            `${added} スポットを「${label}」に追加（${existing} 件は登録済）`,
          );
        }
        // サーバ側で revalidatePath('/library/spots') 済み。詳細ページ側は
        // bookmarkedSpotIds prop なのでリロードで反映させる。
        router.refresh();
      } else if (!res.ok) {
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

  if (total === 0) return null;

  return (
    <div className="relative inline-block" ref={popRef}>
      <button
        type="button"
        onClick={onTrigger}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary-500/10 px-3 py-1.5 text-[12px] font-semibold text-primary-300 ring-1 ring-primary-300/40 transition hover:bg-primary-500/15 hover:ring-primary-300"
      >
        <Bookmark className="h-3.5 w-3.5" />
        全 {total} スポットを保存
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[300px] rounded-lg bg-card p-3 shadow-md ring-1 ring-border">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
              一括でフォルダに保存
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

          <p className="mb-2 rounded-sm bg-primary-500/10 px-2 py-1.5 text-[11px] leading-snug text-primary-300">
            この記事の <strong>{total}</strong> 個のスポットを選んだフォルダに追加します。
            {alreadyCount > 0 ? (
              <>
                <br />
                <span className="text-foreground/60">
                  うち {alreadyCount} 件は既に登録済み（{remaining} 件が追加対象）
                </span>
              </>
            ) : null}
          </p>

          <ul className="max-h-[220px] space-y-0.5 overflow-y-auto">
            <li>
              <button
                type="button"
                onClick={() => onPickFolder(null, '未分類')}
                disabled={isPending}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-primary-500/10"
              >
                <span className="font-medium">未分類</span>
                <span className="text-[10px] text-foreground/50">既定</span>
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
                  作って追加
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDrafting(true)}
                className="inline-flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-[12px] font-medium text-primary-300 hover:bg-primary-500/10"
              >
                <Plus className="h-3.5 w-3.5" />
                新しいフォルダを作って追加
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
