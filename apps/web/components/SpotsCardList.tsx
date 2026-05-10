'use client';

import { useState } from 'react';
import { MapPin, ExternalLink } from '@locore/ui/icons';
import type { Spot } from '../lib/mock';
import { SpotFavoriteButton } from './SpotFavoriteButton';
import type { FolderSummary } from '@/lib/spotFavorites/actions';

/**
 * 記事ページのスポット一覧。
 * 各カードは最小限の情報（番号 / 名前 / カテゴリ / エリア部分）だけを表示し、
 * クリックで詳細メニュー（お気に入り追加 / 地図で開く / Google Maps に追加）を出す。
 *
 * 営業時間や電話番号などの細かい情報は記事の本文に書く想定で、ここには出さない。
 */

const CATEGORY_LABEL: Record<string, string> = {
  food: '食事',
  sight: '観光',
  shopping: '買い物',
  lodging: '宿泊',
  other: 'その他',
};

type Props = {
  spots: Spot[];
  /**
   * 未購入時のロック表示用。true ならスポット名を ?????? でマスク表示し、
   * 詳細メニューも開けないようにする。
   */
  locked?: boolean;
  /** ログイン中ユーザーのお気に入りフォルダ（SpotFavoriteButton に渡す） */
  folders?: FolderSummary[];
  /** 既にお気に入り登録されている spot id 集合 */
  bookmarkedSpotIds?: Set<string>;
  /** ログイン状態（未ログインなら favorite ボタンが /auth/login にリダイレクト） */
  viewerLoggedIn?: boolean;
};

export function SpotsCardList({
  spots,
  locked = false,
  folders = [],
  bookmarkedSpotIds,
  viewerLoggedIn = false,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  if (spots.length === 0) return null;

  return (
    <section>
      <h3 className="mb-3 text-[16px] font-bold tracking-tight">
        この記事のスポット
        <span className="ml-2 text-[12px] font-medium text-foreground/50">
          {spots.length} 箇所
        </span>
      </h3>
      <ul className="space-y-2">
        {spots.map((s, i) => {
          const open = activeId === s.id;
          return (
            <li
              key={s.id}
              className="rounded-lg bg-card ring-1 ring-primary-100"
            >
              <button
                type="button"
                disabled={locked}
                aria-expanded={open}
                onClick={() => setActiveId((prev) => (prev === s.id ? null : s.id))}
                className={
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition ' +
                  (locked
                    ? 'cursor-not-allowed opacity-70'
                    : 'hover:bg-primary-50/40')
                }
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[12px] font-bold text-primary-700">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-neutral-900">
                    {locked ? '????????' : s.name}
                  </p>
                  <p className="truncate text-[11px] text-foreground/60">
                    {s.category
                      ? CATEGORY_LABEL[s.category] ?? s.category
                      : 'スポット'}
                    {!locked && s.address ? (
                      <>
                        <span className="mx-1.5 text-foreground/30">·</span>
                        <span>{areaSnippet(s.address)}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                {!locked ? (
                  <span className="text-[18px] text-foreground/30">
                    {open ? '−' : '+'}
                  </span>
                ) : null}
              </button>

              {/* 詳細メニュー */}
              {open && !locked ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-primary-100 bg-primary-50/30 px-4 py-3">
                  <SpotFavoriteButton
                    spotId={s.id}
                    spotName={s.name}
                    bookmarked={bookmarkedSpotIds?.has(s.id) ?? false}
                    folders={folders}
                    viewerLoggedIn={viewerLoggedIn}
                  />
                  <ActionButton
                    label="地図で開く"
                    icon={<MapPin className="h-4 w-4" />}
                    onClick={() => {
                      window.open(
                        `/map?spot=${encodeURIComponent(s.id)}`,
                        '_self',
                      );
                    }}
                  />
                  <ActionButton
                    label="Google マップに追加"
                    icon={<ExternalLink className="h-4 w-4" />}
                    onClick={() => {
                      const url =
                        s.lat && s.lng
                          ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}&query_place_id=${encodeURIComponent(s.name)}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + (s.address ?? ''))}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-[12px] font-medium text-primary-700 ring-1 ring-primary-100 transition hover:bg-primary-50 hover:ring-primary-300"
    >
      {icon}
      {label}
    </button>
  );
}

/** 住所から「マレ4区」のようなエリア部分だけ抽出（簡易） */
function areaSnippet(address: string): string {
  // 例: "Rue Vieille du Temple, 75003 Paris" → "75003 Paris"
  const parts = address.split(',').map((p) => p.trim());
  return parts[parts.length - 1] ?? address;
}
