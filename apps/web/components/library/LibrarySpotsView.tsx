'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { createSpotFolder } from '@/lib/spotFavorites/actions';
import { FolderBar } from './FolderBar';

/**
 * /library の「スポット」タブ用クライアントビュー。
 * フォルダで絞り込んでブックマークを表示し、フォルダ作成 UI も内蔵。
 */

export type SpotRow = {
  spotId: string;
  folderId: string | null;
  name: string;
  address: string | null;
  category: string | null;
  articleId: string;
  notes: string | null;
};

type Props = {
  bookmarks: SpotRow[];
  folders: { id: string; name: string; color: string | null }[];
};

export function LibrarySpotsView({ bookmarks, folders: initialFolders }: Props) {
  const [selected, setSelected] = useState<string | null | 'unfiled'>(null);
  const [localFolders, setLocalFolders] = useState(initialFolders);

  const totals = useMemo(
    () => ({
      all: bookmarks.length,
      unfiled: bookmarks.filter((b) => !b.folderId).length,
    }),
    [bookmarks],
  );

  const foldersWithCount = useMemo(
    () =>
      localFolders.map((f) => ({
        id: f.id,
        name: f.name,
        count: bookmarks.filter((b) => b.folderId === f.id).length,
      })),
    [localFolders, bookmarks],
  );

  const filtered = useMemo(() => {
    if (selected === null) return bookmarks;
    if (selected === 'unfiled') return bookmarks.filter((b) => !b.folderId);
    return bookmarks.filter((b) => b.folderId === selected);
  }, [bookmarks, selected]);

  const onCreateFolder = async (name: string) => {
    const res = await createSpotFolder({ name });
    if (res.ok && res.data) {
      setLocalFolders((prev) => [
        ...prev,
        { id: res.data!.id, name, color: null },
      ]);
      return { ok: true };
    }
    return { ok: false, error: res.ok ? undefined : res.error };
  };

  return (
    <div>
      <FolderBar
        label="スポット"
        selected={selected}
        onSelect={setSelected}
        totals={totals}
        folders={foldersWithCount}
        createFolder={onCreateFolder}
      />

      <div className="mt-6">
        {filtered.length === 0 ? (
          <div className="rounded-md bg-card p-12 text-center text-[13px] text-foreground/60 ring-1 ring-border">
            {selected === null
              ? 'お気に入りスポットはまだありません'
              : 'このフォルダにはまだスポットがありません'}
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {filtered.map((r) => (
              <li
                key={r.spotId}
                className="rounded-md bg-card p-3 ring-1 ring-border"
              >
                <p className="text-[13px] font-semibold">{r.name}</p>
                {r.address ? (
                  <p className="mt-0.5 text-[11px] text-foreground/60">
                    {r.address}
                  </p>
                ) : null}
                {r.notes ? (
                  <p className="mt-1 text-[11px] text-primary-300">{r.notes}</p>
                ) : null}
                {r.articleId ? (
                  <Link
                    href={`/articles/${r.articleId}`}
                    className="mt-2 inline-block text-[11px] text-primary-300 underline-offset-4 hover:underline"
                  >
                    元の記事を見る →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
