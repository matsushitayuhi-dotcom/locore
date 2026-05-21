'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { markdownToHtml } from '@/lib/markdown/toHtml';
import { htmlToMarkdown } from '@/lib/markdown/toMarkdown';

/**
 * WYSIWYG 専用の本文エディタ。
 *
 * - DB 保存形式: Markdown（既存スキーマと互換）
 * - 内部では HTML を保持し、親への通知時のみ Markdown に変換
 * - TipTap は heavy なので dynamic import でコード分割
 *
 * 旧版にあった Markdown / WYSIWYG タブ切替は 2026-05 に撤廃。
 * 一般ライターに Markdown 記法を要求しないために WYSIWYG に統一した。
 */

// TipTap は SSR 非対応のため dynamic import
const RichTextEditor = dynamic(
  () => import('@/components/writer/RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <p className="text-[12px] text-foreground/40">エディタを読み込み中…</p> },
);

type Props = {
  /** Markdown（DB 保存形式） */
  value: string;
  onChange: (markdown: string) => void;
};

const MAX_BODY = 20000;
// 日本語の読了時間：300 字/分
const CHAR_PER_MIN = 300;

export function BodyEditorSection({ value, onChange }: Props) {
  // WYSIWYG 内部状態（HTML）
  const [html, setHtml] = useState<string>(() => markdownToHtml(value));

  // Markdown が外部から書き換わったら HTML を再生成
  useEffect(() => {
    setHtml(markdownToHtml(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const charCount = value.length;
  const overLimit = charCount > MAX_BODY;
  const readingMin = useMemo(
    () => Math.max(1, Math.ceil(charCount / CHAR_PER_MIN)),
    [charCount],
  );

  return (
    <section className="space-y-3 rounded-md border border-border bg-card p-5 sm:p-6" aria-labelledby="body-section-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="body-section-title" className="text-[15px] font-medium tracking-tight">
          本文
        </h3>
      </div>

      <RichTextEditor
        initialHtml={html}
        onChange={(nextHtml) => {
          setHtml(nextHtml);
          // 自動的に Markdown へ変換し親に伝える（自動保存対象）
          onChange(htmlToMarkdown(nextHtml));
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <p className={overLimit ? 'text-danger-500' : 'text-foreground/50'}>
          {charCount.toLocaleString('ja-JP')} / {MAX_BODY.toLocaleString('ja-JP')} 文字
          ・ 公開申請には 100 文字以上が必要です
        </p>
        <p className="text-foreground/50">読了 約 {readingMin} 分</p>
      </div>
    </section>
  );
}
