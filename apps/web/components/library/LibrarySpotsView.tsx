'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ChevronRight, MapPin, Plus, X } from '@locore/ui/icons';
import { createSpotFolder } from '@/lib/spotFavorites/actions';
import { WishlistFolderCard } from './WishlistFolderCard';

const CATEGORY_LABEL: Record<string, string> = {
  food: '食事',
  sight: '観光',
  shopping: '買い物',
  lodging: '宿泊',
  other: 'その他',
};

/**
 * /library の「スポット」タブ用クライアントビュー（v2: Airbnb Wishlists 風）。
 */

export type SpotRow = {
  spotId: string;
  folderId: string | null;
  name: string;
  address: string | null;
  category: string | null;
  articleId: string;
  notes: string | null;
  /** プレビュー画像（記事カバー or スポット写真）。なくても OK、その場合 placeholder */
  previewImageUrl?: string | null;
};

type Props = {
  bookmarks: SpotRow[];
  folders: { id: string; name: string; color: string | null }[];
};

type FolderKey = string | 'all' | 'unfiled';

export function LibrarySpotsView({ bookmarks, folders: initialFolders }: Props) {
  const [openFolder, setOpenFolder] = useState<FolderKey | null>(null);
  const [localFolders, setLocalFolders] = useState(initialFolders);
  const [drafting, setDrafting] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isPending, startTransition] = useTransition();

  const allItems = bookmarks;
  const unfiledItems = useMemo(
    () => bookmarks.filter((b) => !b.folderId),
    [bookmarks],
  );
  const itemsByFolder = useMemo(() => {
    const map = new Map<string, SpotRow[]>();
    for (const f of localFolders) map.set(f.id, []);
    for (const it of bookmarks) {
      if (it.folderId && map.has(it.folderId)) {
        map.get(it.folderId)!.push(it);
      }
    }
    return map;
  }, [bookmarks, localFolders]);

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
      const res = await createSpotFolder({ name });
      if (res.ok && res.data) {
        setLocalFolders((prev) => [
          ...prev,
          { id: res.data!.id, name, color: null },
        ]);
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
        ? 'すべてのスポット'
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
            このフォルダにはまだスポットがありません
          </div>
        ) : (
          <ul className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0 lg:grid-cols-3">
            {filtered.map((r) => (
              <li key={r.spotId}>
                <SpotRowItem row={r} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Wishlists 一覧
  if (allItems.length === 0) {
    return (
      <div className="rounded-md bg-card p-12 text-center text-[13px] text-foreground/60 ring-1 ring-border">
        お気に入りスポットはまだありません
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
        <WishlistFolderCard
          name="すべてのスポット"
          count={allItems.length}
          previews={allItems
            .slice(0, 4)
            .map((s) => ({ coverImageUrl: s.previewImageUrl ?? null }))}
          variant="special"
          onClick={() => setOpenFolder('all')}
        />

        {unfiledItems.length > 0 ? (
          <WishlistFolderCard
            name="未分類"
            count={unfiledItems.length}
            previews={unfiledItems
              .slice(0, 4)
              .map((s) => ({ coverImageUrl: s.previewImageUrl ?? null }))}
            variant="special"
            onClick={() => setOpenFolder('unfiled')}
          />
        ) : null}

        {foldersWithCount.map((f) => {
          const inside = itemsByFolder.get(f.id) ?? [];
          return (
            <WishlistFolderCard
              key={f.id}
              name={f.name}
              count={f.count}
              previews={inside
                .slice(0, 4)
                .map((s) => ({ coverImageUrl: s.previewImageUrl ?? null }))}
              onClick={() => setOpenFolder(f.id)}
            />
          );
        })}

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

/**
 * フォルダ内のスポット 1 行表示。
 * 左に小画像 (64x64)、右にスポット名・住所・カテゴリ・元記事へのリンク。
 */
function SpotRowItem({ row }: { row: SpotRow }) {
  const fallback = `https://picsum.photos/seed/${row.spotId}/200/200`;
  return (
    <div className="flex gap-3 rounded-lg bg-card p-2.5 ring-1 ring-border transition hover:ring-primary-300">
      <Link
        href={row.articleId ? `/articles/${row.articleId}` : '#'}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border sm:h-20 sm:w-20"
      >
        <Image
          src={row.previewImageUrl ?? fallback}
          alt=""
          fill
          sizes="80px"
          className="object-cover"
          unoptimized
        />
      </Link>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="line-clamp-1 text-[13px] font-semibold text-foreground">
          {row.name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-foreground/60">
          {row.category ? (
            <span className="rounded-sm bg-primary-500/10 px-1.5 py-0.5 font-semibold text-primary-300">
              {CATEGORY_LABEL[row.category] ?? row.category}
            </span>
          ) : null}
          {row.address ? (
            <span className="inline-flex items-center gap-0.5 truncate">
              <MapPin className="h-2.5 w-2.5" />
              {row.address}
            </span>
          ) : null}
        </p>
        {row.notes ? (
          <p className="mt-1 line-clamp-1 text-[11px] text-primary-300">
            {row.notes}
          </p>
        ) : null}
        {row.articleId ? (
          <Link
            href={`/articles/${row.articleId}`}
            className="mt-1 inline-block text-[10px] text-primary-300 underline-offset-4 hover:underline"
          >
            元の記事を見る
          </Link>
        ) : null}
      </div>
    </div>
  );
}
