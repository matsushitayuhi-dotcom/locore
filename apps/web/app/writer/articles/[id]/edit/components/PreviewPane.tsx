'use client';

import { useMemo } from 'react';
import { markdownToHtml } from '@/lib/markdown/toHtml';

type Props = {
  title: string;
  body: string;
  coverImageUrl: string;
  priceJpy: number;
  tags: string[];
};

/**
 * 公開時の見え方の簡易プレビュー（サイドパネル用）。
 * 実際の購入後ページとは異なるが、執筆中の感触を掴むための軽量版。
 */
export function PreviewPane({ title, body, coverImageUrl, priceJpy, tags }: Props) {
  const bodyHtml = useMemo(() => markdownToHtml(body), [body]);

  return (
    <aside
      className="space-y-3 rounded-md border border-border bg-background p-4 sm:p-5"
      aria-label="プレビュー"
    >
      <p className="text-[11px] uppercase tracking-wider text-foreground/40">プレビュー</p>

      {coverImageUrl ? (
        <div className="overflow-hidden rounded-md border border-border" style={{ aspectRatio: '3 / 2' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded-md border border-dashed border-border bg-card text-[12px] text-foreground/40"
          style={{ aspectRatio: '3 / 2' }}
        >
          カバー画像未設定
        </div>
      )}

      <h2
        className="text-[18px] font-semibold leading-snug"
      >
        {title || '（無題）'}
      </h2>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-primary-300">
          ¥{priceJpy.toLocaleString('ja-JP')}
        </span>
        {tags.slice(0, 5).map((t) => (
          <span key={t} className="rounded-full border border-border px-2 py-0.5 text-foreground/60">
            #{t}
          </span>
        ))}
      </div>

      <div
        className="prose prose-sm max-w-none text-[13px] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: bodyHtml || '<p class="text-foreground/40">本文が入ります…</p>' }}
      />
    </aside>
  );
}
