'use client';

import { useEffect, type ReactNode } from 'react';
import { Heading2, Heading3, Image as ImageIcon, Link as LinkIcon, List, ListOrdered, Minus, Quote, StickyNote, Table as TableIcon, Type, X } from 'lucide-react';
import type { BlockKindDef, EditorKind } from './BLOCK_KINDS';

/**
 * ＋ を押すと出るボトムシート（0091 / エディタ作り直し）。
 *
 * ここが**挿入の唯一の正規ルート**。402px で親指が届く位置に、2 列・88px 角のセルで並べる。
 * 出すのは BLOCK_KINDS の 9 種だけ（「種類を変える」では TURN_INTO_KINDS を渡して同じ見た目で使い回す）。
 * 実装用語（paragraph / aside / link_card / embed）は 1 つも出さない。
 */

/** BLOCK_KINDS の icon 名（文字列）→ lucide の部品。ここだけで解決する */
const KIND_ICON: Record<string, typeof Type> = {
  Type,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  StickyNote,
  Image: ImageIcon,
  Table: TableIcon,
  Minus,
  Link: LinkIcon,
};

/**
 * 下から出る共通のシート。挿入・種類を変える・URL・「…」で使い回す。
 * hover に依存しない（背景をタップ / 右上の 44px の × / Esc の 3 通りで閉じられる）。
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // 開いている間は後ろの本文をスクロールさせない
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="閉じる" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[560px] rounded-t-2xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-1 px-2 pt-1">
          <h2 className="min-w-0 flex-1 truncate px-3 text-[15px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="閉じる" className="grid h-11 w-11 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {/* 端末の下端（ホームバー）ぶんの余白を足す */}
        <div className="max-h-[68vh] overflow-y-auto px-3 pb-[max(16px,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

/**
 * 種類を選ぶシート。2 列グリッド・各セル 88px 角。
 * items に BLOCK_KINDS を渡せば「追加」、TURN_INTO_KINDS を渡せば「種類を変える」になる。
 */
export function InsertSheet({
  open,
  title,
  items,
  activeKind = null,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  items: readonly BlockKindDef[];
  /** いまの行の種類（「種類を変える」で今どれかを示す） */
  activeKind?: EditorKind | null;
  onPick: (kind: EditorKind) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2.5 pb-2">
        {items.map((k) => {
          const Icon = KIND_ICON[k.icon] ?? Type;
          const on = activeKind === k.kind;
          return (
            <button
              key={k.kind}
              type="button"
              onClick={() => onPick(k.kind)}
              aria-pressed={on}
              className={
                'flex h-[88px] flex-col items-start justify-center gap-1 rounded-xl border px-3.5 text-left transition ' +
                (on ? 'border-foreground bg-neutral-50' : 'border-border bg-card hover:border-foreground')
              }
            >
              <Icon className={'h-[22px] w-[22px] ' + (on ? 'text-foreground' : 'text-neutral-500')} aria-hidden />
              <span className="text-[15px] font-bold leading-[1.3]">{k.label}</span>
              <span className="text-[11.5px] leading-[1.3] text-neutral-500">{k.hint}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
