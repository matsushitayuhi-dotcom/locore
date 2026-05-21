'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { markdownToHtml } from '@/lib/markdown/toHtml';
import { isHtmlBody } from '@/lib/markdown/render';

/**
 * WYSIWYG 専用の本文エディタ。
 *
 * - DB 保存形式: **HTML**（2026-05 改修）
 *   - 旧版は HTML → Markdown 変換 (`htmlToMarkdown`) を経由していたが、
 *     TipTap 独自ブロック（コールアウト / コードブロック / テーブル /
 *     タスクリスト / ハイライト等）が Markdown に潰れて消える or
 *     `## 〜` のまま表示されるバグがあったため、HTML をそのまま保存するよう変更。
 *   - DB の `articles.body` カラム型 (text) は変更不要。
 *   - 旧 Markdown 記事との互換は保つ: 初期 value が Markdown のときは
 *     `markdownToHtml` で HTML 化してエディタに流し込む。以後の編集分は HTML 保存。
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
  /** 本文（HTML 保存形式。旧データは Markdown のこともある） */
  value: string;
  onChange: (html: string) => void;
};

const MAX_BODY = 20000;
// 日本語の読了時間：300 字/分
const CHAR_PER_MIN = 300;

/**
 * HTML タグを取り除いて純粋なテキスト文字数を概算する。
 * 文字数カウンタ / 読了時間用。サーバ送信前のバリデーション用途ではない。
 */
function htmlToPlainTextLength(input: string): number {
  if (!input) return 0;
  // タグ除去 → 連続空白を 1 に潰す
  const text = input
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length;
}

/**
 * value (HTML or 旧 Markdown) を TipTap に流し込む HTML へ正規化する。
 */
function toInitialHtml(value: string): string {
  if (!value) return '';
  return isHtmlBody(value) ? value : markdownToHtml(value);
}

export function BodyEditorSection({ value, onChange }: Props) {
  // WYSIWYG 内部状態（HTML）
  const [html, setHtml] = useState<string>(() => toInitialHtml(value));

  /**
   * #5 / #エディタ⇄表示 改修 (2026-05): 自分が `onChange` で送り出した HTML が親経由で
   * `value` として戻ってきたときに、もう一度エディタへ setContent すると
   *  - Enter での段落分割が壊れる（trailing 空 <p> が消える）
   *  - スラッシュコマンドで挿入したノードが直後に上書きされて表示されない
   * といった症状が出る（TipTap の onCreate 後の setContent はカーソル / undo を壊す）。
   *
   * そこで「自分が emit した HTML」を ref に覚えておき、それと一致する value
   * 変更は無視する。外部（モード切替・別画面からの戻り）由来の変更だけが
   * HTML を再生成する。
   */
  const lastEmittedRef = useRef<string>(value);

  // 外部から書き換わったら HTML を再生成
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    setHtml(toInitialHtml(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // 文字数 / 読了時間はタグを除いた純粋テキスト長で算出
  const charCount = useMemo(() => htmlToPlainTextLength(value), [value]);
  const overLimit = value.length > MAX_BODY;
  const readingMin = useMemo(
    () => Math.max(1, Math.ceil(charCount / CHAR_PER_MIN)),
    [charCount],
  );

  return (
    // 2026-05 Notion ライク改修: スマホで余白を詰めて本文エリアを最大化
    <section className="space-y-2 rounded-md border border-border bg-card p-2 sm:space-y-3 sm:p-5" aria-labelledby="body-section-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="body-section-title" className="text-[13px] font-medium tracking-tight sm:text-[15px]">
          本文
        </h3>
      </div>

      <RichTextEditor
        initialHtml={html}
        onChange={(nextHtml) => {
          setHtml(nextHtml);
          // 2026-05 改修: HTML をそのまま親に伝える（DB 保存形式 = HTML）
          lastEmittedRef.current = nextHtml;
          onChange(nextHtml);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <p className={overLimit ? 'text-danger-500' : 'text-foreground/50'}>
          {charCount.toLocaleString('ja-JP')} 文字
          ・ 公開申請には 100 文字以上が必要です
        </p>
        <p className="text-foreground/50">読了 約 {readingMin} 分</p>
      </div>
    </section>
  );
}
