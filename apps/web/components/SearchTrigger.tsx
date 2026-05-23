'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import {
  SearchSheet,
  type SearchSheetCountry,
  type SearchSheetRegion,
} from './SearchSheet';

/**
 * グローバルナビ / モバイル下部ナビ から呼ぶ「検索」ボタン + Sheet 一式。
 *
 * SiteHeader / BottomNav からは server fetch した countries / regions を
 * props で渡す。ボタンを押すと SearchSheet を開き、内部の state はここで持つ。
 *
 * variant:
 *   'pill'   — SiteHeader 用。pill 形状の小さなテキストボタン。
 *   'icon'   — BottomNav 用。アイコン + 小さなラベル (フル幅の li 内)。
 */
export function SearchTrigger({
  countries,
  regions,
  variant = 'pill',
  className,
  children,
}: {
  countries: SearchSheetCountry[];
  regions: SearchSheetRegion[];
  variant?: 'pill' | 'icon' | 'raw';
  className?: string;
  /** raw variant のときに任意の見た目を流し込む */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === 'pill' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            className ??
            'inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium text-foreground/70 transition hover:bg-primary-500/10 hover:text-foreground'
          }
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          検索
        </button>
      ) : null}
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="検索を開く"
          className={
            className ?? 'inline-flex items-center justify-center rounded-md p-2'
          }
        >
          <Search className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
      {variant === 'raw' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={className}
        >
          {children}
        </button>
      ) : null}

      <SearchSheet
        open={open}
        onClose={() => setOpen(false)}
        countries={countries}
        regions={regions}
      />
    </>
  );
}
