'use client';

import { useId } from 'react';

/**
 * プレーン textarea ベースの Markdown エディタ。
 * CodeMirror を入れる手もあるが、執筆ハードルを下げる方針なので最小実装。
 */

type Props = {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  /** 文字数上限（DB スキーマと合わせて 20000）。 */
  maxLength?: number;
};

export function MarkdownEditor({
  value,
  onChange,
  rows = 22,
  placeholder = '# 見出し\n\n本文を書きましょう。\n\n## サブ見出し\n\n…',
  maxLength = 20000,
}: Props) {
  const id = useId();
  return (
    <div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label="本文（Markdown）"
        className="flex w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 py-2 font-mono text-[13px] leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:border-2 focus:border-primary-700 focus:px-[11px] focus:py-[7px] focus:outline-none"
      />
    </div>
  );
}
