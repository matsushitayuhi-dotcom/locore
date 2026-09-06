'use client';

import { useState } from 'react';
import { PLATFORM_LABEL } from '@/lib/media/display';

/**
 * 外部サムネ画像（OG / oEmbed 由来）。読み込み失敗や未取得のときは platform の面にフォールバック。
 * 外部 URL なので next/image は使わず <img referrerPolicy="no-referrer">（remotePatterns 不要・hotlink 対策）。
 */

const TONE: Record<string, string> = {
  youtube: 'from-neutral-800 to-neutral-600 text-white',
  note: 'from-emerald-50 to-emerald-200 text-emerald-900',
  blog: 'from-slate-50 to-slate-200 text-slate-700',
  website: 'from-slate-50 to-slate-200 text-slate-700',
  instagram: 'from-rose-50 to-rose-200 text-rose-800',
  x: 'from-neutral-100 to-neutral-300 text-neutral-800',
  threads: 'from-neutral-100 to-neutral-300 text-neutral-800',
  tiktok: 'from-neutral-800 to-neutral-600 text-white',
  facebook: 'from-blue-50 to-blue-200 text-blue-900',
  email: 'from-neutral-100 to-neutral-200 text-neutral-700',
};

/** 小さい枠（ボタンの 48px）用の略称 */
const MONOGRAM: Record<string, string> = {
  instagram: 'IG',
  x: 'X',
  threads: 'Th',
  note: 'note',
  youtube: 'YT',
  tiktok: 'TT',
  facebook: 'FB',
  blog: 'Blog',
  website: 'Web',
  email: '@',
};

export function MediaThumb({
  src,
  platform,
  className,
  monogram = false,
}: {
  src: string | null | undefined;
  platform: string;
  className?: string;
  /** 小さい枠向け: ラベルを 2 文字に */
  monogram?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={className}
      />
    );
  }
  const label = PLATFORM_LABEL[platform] ?? platform;
  return (
    <div
      className={
        'grid h-full w-full place-items-center bg-gradient-to-br ' +
        (TONE[platform] ?? 'from-neutral-100 to-neutral-200 text-neutral-700')
      }
      aria-hidden
    >
      <span className={monogram ? 'text-[11px] font-bold' : 'text-[13px] font-bold tracking-wide'}>
        {monogram ? (MONOGRAM[platform] ?? label.slice(0, 2)) : label}
      </span>
    </div>
  );
}
