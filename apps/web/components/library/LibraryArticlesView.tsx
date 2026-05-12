'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Plus, X } from '@locore/ui/icons';
import type { Article } from '@/lib/mock';
import {
  createBookmarkFolder,
  type BookmarkFolderSummary,
} from '@/lib/bookmarks/actions';
import { ArticleGrid } from '@/components/ArticleGrid';
import { WishlistFolderCard } from './WishlistFolderCard';

/**
 * /library の「記事」「旅程」タブ用のクライアントビュー（v2: Airbnb Wishlists 風）。
 *
 * 2 つのビューを行き来する:
 *  1. **folders** — フォルダをカードグリッドで表示（"すべて" "未分類" + ユーザー作成フォルダ）
 *  2. **items**   — 選択フォルダ内の記事をグリッド表示。上部に戻るボタン。
 */

type Item = Article & { folderId: string | null };

type Props = {
  items: Item[];
  folders: BookmarkFolderSummary[];
  bookmarkedIds: Set<string>;
  emptyLabel: string;
  kindLabel: string;
};

type FolderKey = string | 'all' | 'unfiled';

export function LibraryArticlesView({
  items,
  folders,
  bookmarkedIds,
  emptyLabel,
  kindLabel,
}: Props) {
  const [openFolder, setOpenFolder] = useState<FolderKey | null>(null);
  const [localFolders, setLocalFolders] =
    useState<BookmarkFolderSummary[]>(folders);
  const [drafting, setDrafting] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isPending, startTransition] = useTransition();

  // フォルダごとの items を事前計算
  const allItems = items;
  const unfiledItems = useMemo(() => items.filter((i) => !i.folderId), [items]);
  const itemsByFolder = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const f of localFolders) map.set(f.id, []);
    for (const it of items) {
      if (it.folderId && map.has(it.folderId)) {
        map.get(it.folderId)!.push(it);
      }
    }
    return map;
  }, [items, localFolders]);

  const foldersWithCount = useMemo(
    () =>
      localFolders.map((f) => ({
        ...f,
        count: itemsByFolder.get(f.id)?.length ?? 0,
      })),
    [localFolders, itemsByFolder],
  );

  const onCreateFolder = () => {
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
        setLocalFolders((prev) => [newFolder, ...prev]);
        setDraftName('');
        setDrafting(false);
        toast.success(`フォルダ「${name}」を作成しました`);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  // 「フォルダ詳細」ビュー
  if (openFolder !== null) {
    const filtered =
      openFolder === 'all'
        ? allItems
        : openFolder === 'unfiled'
          ? unfiledItems
          : itemsByFolder.get(openFolder) ?? [];
    const folderName =
      openFolder === 'all'
        ? `すべての${kindLabel}`
        : openFolder === 'unfiled'
          ? '未分類'
          : localFolders.find((f) => f.id === openFolder)?.name ??
            'フォルダ';

    return (
      <div>
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpenFolder(null)}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[12px] font-medium text-foreground/80 ring-1 ring-border transition hover:bg-card hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
            ライブラリへ戻る
          </button>
          <p className="text-[14px] font-semibold text-foreground">
            {folderName}
            <span className="ml-2 text-[12px] font-normal text-foreground/55 tabular">
              {filtered.length} 件
            </span>
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-md bg-card p-12 text-center text-[13px] text-foreground/60 ring-1 ring-border">
            このフォルダにはまだ {kindLabel} がありません
          </div>
        ) : (
          <ArticleGrid
            articles={filtered}
            bookmarkedIds={bookmarkedIds}
            bookmarkFolders={foldersWithCount}
          />
        )}
      </div>
    );
  }

  // 「Wishlists 一覧」ビュー
  if (allItems.length === 0) {
    return (
      <div className="rounded-md bg-card p-12 text-center text-[13px] text-foreground/60 ring-1 ring-border">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
        {/* "すべて" — 全保存記事の総覧 */}
        <WishlistFolderCard
          name={`すべての${kindLabel}`}
          count={allItems.length}
          previews={allItems.slice(0, 4)}
          variant="special"
          onClick={() => setOpenFolder('all')}
        />

        {/* "未分類" — フォルダに振り分けてない記事 */}
        {unfiledItems.length > 0 ? (
          <WishlistFolderCard
            name="未分類"
            count={unfiledItems.length}
            previews={unfiledItems.slice(0, 4)}
            variant="special"
            onClick={() => setOpenFolder('unfiled')}
          />
        ) : null}

        {/* ユーザー作成フォルダ */}
        {foldersWithCount.map((f) => {
          const inside = itemsByFolder.get(f.id) ?? [];
          return (
            <WishlistFolderCard
              key={f.id}
              name={f.name}
              count={f.count}
              previews={inside.slice(0, 4)}
              onClick={() => setOpenFolder(f.id)}
            />
          );
        })}

        {/* 新規フォルダ作成カード */}
        {drafting ? (
          <div className="flex flex-col gap-2">
            <div className="flex aspect-square items-center justify-center rounded-xl bg-muted ring-1 ring-dashed ring-border">
              <Plus className="h-8 w-8 text-foreground/30" aria-hidden />
            </div>
            <div className="flex gap-1.5 px-0.5">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="フォルダ名"
                maxLength={60}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onCreateFolder();
                  } else if (e.key === 'Escape') {
                    setDrafting(false);
                    setDraftName('');
                  }
                }}
                className="h-8 flex-1 rounded-sm border border-primary-500/40 bg-card px-2 text-[12px] focus:border-2 focus:border-primary-500 focus:px-[7px] focus:outline-none"
              />
              <button
                type="button"
                onClick={onCreateFolder}
                disabled={isPending || !draftName.trim()}
                className="rounded-sm bg-primary-500 px-2 text-[11px] font-bold text-neutral-950 hover:bg-primary-300 disabled:opacity-40"
              >
                追加
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrafting(false);
                  setDraftName('');
                }}
                aria-label="キャンセル"
                className="rounded-sm p-1 text-foreground/50 hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDrafting(true)}
            className="group flex flex-col gap-2 text-left"
          >
            <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-muted ring-1 ring-dashed ring-border transition-colors group-hover:ring-primary-500/40">
              <div className="flex flex-col items-center gap-2 text-foreground/40 group-hover:text-primary-300">
                <Plus className="h-7 w-7" aria-hidden />
                <span className="text-[11px] font-medium">新しいフォルダ</span>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 px-0.5">
              <p className="text-[14px] font-semibold leading-snug text-foreground/60">
                新しいフォルダ
              </p>
              <p className="text-[11px] text-foreground/40">作成して整理</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
