'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { MarkdownEditor } from '@/components/writer/MarkdownEditor';
import { markdownToHtml } from '@/lib/markdown/toHtml';
import { htmlToMarkdown } from '@/lib/markdown/toMarkdown';

/**
 * Markdown ⇄ WYSIWYG 切替対応の本文エディタ。
 *
 * - DB 保存形式: Markdown（既存スキーマと互換）
 * - WYSIWYG 中は内部で HTML を保持し、Markdown 切替や親への通知時に変換
 * - TipTap は heavy なので dynamic import でコード分割
 */

// TipTap は SSR 非対応のため dynamic import
const RichTextEditor = dynamic(
  () => import('@/components/writer/RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <p className="text-[12px] text-foreground/40">エディタを読み込み中…</p> },
);

type Mode = 'markdown' | 'wysiwyg';

type Props = {
  /** Markdown（DB 保存形式） */
  value: string;
  onChange: (markdown: string) => void;
};

const MAX_BODY = 20000;
// 日本語の読了時間：300 字/分
const CHAR_PER_MIN = 300;

export function BodyEditorSection({ value, onChange }: Props) {
  // デフォルトは WYSIWYG（一般ユーザー向けに優しいモード）
  const [mode, setMode] = useState<Mode>('wysiwyg');
  // WYSIWYG 内部状態（HTML）
  const [html, setHtml] = useState<string>(() => markdownToHtml(value));

  // Markdown が外部から書き換わったら HTML を再生成
  useEffect(() => {
    if (mode === 'markdown') {
      // markdown モード中は html は使わないので不要
      return;
    }
    setHtml(markdownToHtml(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const charCount = value.length;
  const overLimit = charCount > MAX_BODY;
  const readingMin = useMemo(
    () => Math.max(1, Math.ceil(charCount / CHAR_PER_MIN)),
    [charCount],
  );

  const switchTo = (next: Mode) => {
    if (next === mode) return;
    if (next === 'wysiwyg') {
      // Markdown → HTML
      setHtml(markdownToHtml(value));
      setMode('wysiwyg');
    } else {
      // HTML → Markdown
      const md = htmlToMarkdown(html);
      onChange(md);
      setMode('markdown');
    }
  };

  return (
    <section className="space-y-3 rounded-md border border-border bg-card p-5 sm:p-6" aria-labelledby="body-section-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="body-section-title" className="text-[15px] font-medium tracking-tight">
          本文
        </h3>
        <div role="tablist" aria-label="本文モード切替" className="flex gap-1 rounded-sm border border-border bg-background p-0.5 text-[12px]">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'markdown'}
            onClick={() => switchTo('markdown')}
            className={
              'rounded-sm px-3 py-1 transition ' +
              (mode === 'markdown'
                ? 'bg-primary-700 text-white'
                : 'text-foreground/60 hover:text-foreground')
            }
          >
            Markdown
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'wysiwyg'}
            onClick={() => switchTo('wysiwyg')}
            className={
              'rounded-sm px-3 py-1 transition ' +
              (mode === 'wysiwyg'
                ? 'bg-primary-700 text-white'
                : 'text-foreground/60 hover:text-foreground')
            }
          >
            WYSIWYG
          </button>
        </div>
      </div>

      {mode === 'markdown' ? (
        <MarkdownEditor value={value} onChange={onChange} maxLength={MAX_BODY} />
      ) : (
        <RichTextEditor
          initialHtml={html}
          onChange={(nextHtml) => {
            setHtml(nextHtml);
            // 自動的に Markdown へ変換し親に伝える（自動保存対象）
            onChange(htmlToMarkdown(nextHtml));
          }}
        />
      )}

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
