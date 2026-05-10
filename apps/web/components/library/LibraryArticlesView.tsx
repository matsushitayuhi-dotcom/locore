'use client';

import { useMemo, useState } from 'react';
import type { Article } from '@/lib/mock';
import {
  createBookmarkFolder,
  type BookmarkFolderSummary,
} from '@/lib/bookmarks/actions';
import { ArticleGrid } from '@/components/ArticleGrid';
import { FolderBar } from './FolderBar';

/**
 * /library の「記事」「旅程」タブ用のクライアントビュー。
 * フォルダで絞り込むためにクライアント側でフィルタリングする。
 *
 * 親（Server Component）から:
 *   - items: 表示候補の記事配列（folderId 付き）
 *   - folders: 自分のブックマークフォルダ一覧
 *   - emptyLabel: 0件時の文言
 */

type Item = Article & { folderId: string | null };

type Props = {
  items: Item[];
  folders: BookmarkFolderSummary[];
  bookmarkedIds: Set<string>;
  emptyLabel: string;
  /** "記事" or "旅程" — FolderBar のラベル用 */
  kindLabel: string;
};

export function LibraryArticlesView({
  items,
  folders,
  bookmarkedIds,
  emptyLabel,
  kindLabel,
}: Props) {
  const [selected, setSelected] = useState<string | null | 'unfiled'>(null);
  // 直近作成したフォルダを即時反映するためのローカル state
  const [localFolders, setLocalFolders] =
    useState<BookmarkFolderSummary[]>(folders);

  const totals = useMemo(() => {
    return {
      all: items.length,
      unfiled: items.filter((i) => !i.folderId).length,
    };
  }, [items]);

  // フォルダ別件数を再計算（リスト変動 / フィルタには影響しない）
  const foldersWithCount = useMemo(() => {
    return localFolders.map((f) => ({
      ...f,
      count: items.filter((i) => i.folderId === f.id).length,
    }));
  }, [localFolders, items]);

  const filtered = useMemo(() => {
    if (selected === null) return items;
    if (selected === 'unfiled') return items.filter((i) => !i.folderId);
    return items.filter((i) => i.folderId === selected);
  }, [items, selected]);

  const onCreateFolder = async (name: string) => {
    const res = await createBookmarkFolder({ name });
    if (res.ok && res.data) {
      const newFolder: BookmarkFolderSummary = {
        id: res.data.id,
        name,
        color: null,
        count: 0,
      };
      setLocalFolders((prev) => [newFolder, ...prev]);
      return { ok: true };
    }
    return { ok: false, error: res.ok ? undefined : res.error };
  };

  return (
    <div>
      <FolderBar
        label={kindLabel}
        selected={selected}
        onSelect={setSelected}
        totals={totals}
        folders={foldersWithCount.map((f) => ({
          id: f.id,
          name: f.name,
          count: f.count,
        }))}
        createFolder={onCreateFolder}
      />

      <div className="mt-6">
        {filtered.length === 0 ? (
          <div className="rounded-md bg-card p-12 text-center text-[13px] text-foreground/60 ring-1 ring-primary-100">
            {selected === null
              ? emptyLabel
              : 'このフォルダにはまだ何もありません'}
          </div>
        ) : (
          <ArticleGrid
            articles={filtered}
            bookmarkedIds={bookmarkedIds}
            bookmarkFolders={foldersWithCount}
          />
        )}
      </div>
    </div>
  );
}
