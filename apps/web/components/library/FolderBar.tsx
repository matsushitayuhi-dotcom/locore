'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, X } from '@locore/ui/icons';

/**
 * Library の各タブで共通に使う「フォルダ切替 + 新規作成」バー。
 *
 * - 「すべて」「未分類」+ 各フォルダボタンが横スクロール可能
 * - 右端に「+ 新しいフォルダ」インライン入力
 * - フォルダ作成は呼び出し側から渡された createAction を実行
 *
 * 状態は selectedFolderId をクエリ string ではなく親に持ってもらう想定
 * （/library?tab=spots&folder=xxx のように親で URL 同期しても良い）。
 */

export type FolderItem = {
  id: string;
  name: string;
  count: number;
};

type Props = {
  /** 「すべて」「未分類」を含めた選択中の値。null = すべて、'unfiled' = 未分類 */
  selected: string | null | 'unfiled';
  onSelect: (next: string | null | 'unfiled') => void;
  /** すべて + 未分類のカウント */
  totals: { all: number; unfiled: number };
  folders: FolderItem[];
  /** 新規フォルダ作成 server action */
  createFolder: (name: string) => Promise<{ ok: boolean; error?: string }>;
  /** 全体ラベル（"記事" / "旅程" / "スポット" 等） */
  label: string;
};

export function FolderBar({
  selected,
  onSelect,
  totals,
  folders,
  createFolder,
  label,
}: Props) {
  const [drafting, setDrafting] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isPending, startTransition] = useTransition();

  const onCreate = () => {
    const name = draftName.trim();
    if (!name) {
      toast.error('フォルダ名を入力してください');
      return;
    }
    startTransition(async () => {
      const res = await createFolder(name);
      if (res.ok) {
        toast.success(`フォルダ「${name}」を作成しました`);
        setDraftName('');
        setDrafting(false);
      } else {
        toast.error(res.error ?? 'フォルダ作成に失敗しました');
      }
    });
  };

  return (
    <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
      <Chip
        active={selected === null}
        onClick={() => onSelect(null)}
        label={`すべて`}
        count={totals.all}
      />
      <Chip
        active={selected === 'unfiled'}
        onClick={() => onSelect('unfiled')}
        label="未分類"
        count={totals.unfiled}
      />
      {folders.map((f) => (
        <Chip
          key={f.id}
          active={selected === f.id}
          onClick={() => onSelect(f.id)}
          label={f.name}
          count={f.count}
        />
      ))}

      {drafting ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder={`新しい${label}フォルダ名`}
            maxLength={60}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onCreate();
              } else if (e.key === 'Escape') {
                setDrafting(false);
                setDraftName('');
              }
            }}
            className="h-9 w-[180px] rounded-full border border-primary-500/40 bg-card px-3 text-[12px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          />
          <button
            type="button"
            onClick={onCreate}
            disabled={isPending || !draftName.trim()}
            className="rounded-full bg-primary-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-primary-500 disabled:opacity-40"
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
            className="rounded-full p-1.5 text-foreground/50 hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDrafting(true)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-500/10 px-3 py-1.5 text-[12px] font-medium text-primary-300 ring-1 ring-border transition hover:bg-primary-500/15"
        >
          <Plus className="h-3.5 w-3.5" />
          フォルダ
        </button>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition ' +
        (active
          ? 'bg-primary-700 text-white shadow-sm'
          : 'bg-card text-primary-300 ring-1 ring-border hover:bg-primary-500/10')
      }
    >
      <span>{label}</span>
      <span className={'text-[10px] ' + (active ? 'text-white/70' : 'text-foreground/50')}>
        {count}
      </span>
    </button>
  );
}
