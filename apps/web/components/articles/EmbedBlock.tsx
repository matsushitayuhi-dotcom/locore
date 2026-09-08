'use client';

import { useState } from 'react';
import { ArrowUpRight, Play, MapPin } from 'lucide-react';
import type { ArticleBlock } from '@/lib/articles/blocks';
import { EMBED_RATIO, PROVIDER_LABEL, gmapEmbedSrc, gmapPlaceName } from '@/lib/articles/embeds';

type Embed = Extract<ArticleBlock, { type: 'embed' }>;

/**
 * 埋め込みの共通枠（docs §5.2）。幅は本文と同じ、角丸 12px、罫 1 本、下にバー。
 * - YouTube / Google マップ: facade（サムネ・静止面 → クリックで iframe）
 * - X / Instagram / TikTok / Spotify / その他: iframe を使わず、取得したテキスト・画像を自前で描く
 * - 失敗時も同じ枠のまま（比率固定）
 */
export function EmbedBlock({ block }: { block: Embed }) {
  const [live, setLive] = useState(false);
  const label = PROVIDER_LABEL[block.provider];
  const ratio = EMBED_RATIO[block.provider];
  const p = block.preview;

  const bar = (title: string | null, sub?: string | null, action = `${label} で開く`) => (
    <div className="flex items-center gap-2.5 border-t border-border px-3.5 py-2.5 text-[12.5px] text-neutral-700">
      {title ? <b className="min-w-0 truncate text-foreground">{title}</b> : <span className="text-neutral-500">{label}</span>}
      {sub ? <span className="hidden truncate text-neutral-500 sm:inline">{sub}</span> : null}
      {/* -my-2.5/py-2.5 でバーの高さは変えずにタップ領域だけ 40px に広げる */}
      <a href={block.url} target="_blank" rel="noopener noreferrer" className="-my-2.5 ml-auto inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap py-2.5 text-neutral-500 hover:text-foreground">
        {action} <ArrowUpRight className="h-3 w-3" aria-hidden />
      </a>
    </div>
  );

  // ---- YouTube ----
  if (block.provider === 'youtube' && block.videoId) {
    const thumb = p?.imageUrl ?? `https://i.ytimg.com/vi/${block.videoId}/hqdefault.jpg`;
    return (
      <figure className="my-9 overflow-hidden rounded-xl border border-border bg-card">
        <div className={`relative bg-neutral-100 ${ratio}`}>
          {live ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${block.videoId}?autoplay=1&rel=0`}
              title={p?.title ?? 'YouTube'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <button type="button" onClick={() => setLive(true)} className="group absolute inset-0 block h-full w-full" aria-label="再生">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-2 py-[3px] text-[10.5px] font-bold text-neutral-900 shadow-sm max-sm:text-[11px]">YouTube</span>
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-primary-500 text-neutral-950 shadow-lg transition group-hover:scale-105">
                  <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden />
                </span>
              </span>
            </button>
          )}
        </div>
        {bar(p?.title ?? null, null, 'YouTube で開く')}
      </figure>
    );
  }

  // ---- Google マップ ----
  if (block.provider === 'gmap') {
    const src = gmapEmbedSrc(block.url);
    const name = p?.title ?? gmapPlaceName(block.url);
    return (
      <figure className="my-9 overflow-hidden rounded-xl border border-border bg-card">
        <div className={`relative bg-gradient-to-br from-[#e8eef2] to-[#d5dee6] ${ratio}`}>
          {live && src ? (
            <iframe src={src} title={name ?? 'Google マップ'} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 h-full w-full border-0" />
          ) : (
            <button type="button" onClick={() => setLive(true)} disabled={!src} className="absolute inset-0 block h-full w-full" aria-label="地図を読み込む">
              <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-2 py-[3px] text-[10.5px] font-bold text-neutral-900 shadow-sm max-sm:text-[11px]">Google マップ</span>
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <MapPin className="h-8 w-8 text-neutral-900" fill="#fff" aria-hidden />
              </span>
              {src ? <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-bold text-white">クリックで地図を表示</span> : null}
            </button>
          )}
        </div>
        {bar(name, null, '経路を見る')}
      </figure>
    );
  }

  // ---- SNS・その他: 自前描画（iframe なし） ----
  const hasAny = !!(p?.title || p?.description || p?.imageUrl);
  return (
    <figure className="my-9 overflow-hidden rounded-xl border border-border bg-card">
      {hasAny ? (
        <div className="p-3.5">
          <div className="flex items-center gap-2 text-[12px] text-neutral-500">
            <span className="rounded-full bg-neutral-100 px-2 py-[3px] text-[10.5px] font-bold text-neutral-900 max-sm:text-[11px]">{label}</span>
            {p?.siteName ? <span>{p.siteName}</span> : null}
          </div>
          {p?.title ? <p className="mt-2 text-[15px] leading-[1.8] text-neutral-800">{p.title}</p> : null}
          {p?.description && p.description !== p.title ? <p className="mt-1 text-[13px] leading-[1.7] text-neutral-500">{p.description}</p> : null}
          {p?.imageUrl ? (
            <div className={`mt-3 overflow-hidden rounded-lg bg-neutral-100 ${block.provider === 'instagram' ? 'aspect-square' : 'aspect-video'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            </div>
          ) : null}
        </div>
      ) : (
        <div className={`grid place-items-center bg-neutral-100 text-[13px] text-neutral-500 ${ratio}`}>この埋め込みは表示できませんでした</div>
      )}
      {bar(hasAny ? null : `${label} の投稿`, null)}
    </figure>
  );
}
