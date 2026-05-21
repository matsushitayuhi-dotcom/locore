'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

/**
 * Notion / Substack 風のピル型タグ入力。記事タグ・スポットタグ共通で使う汎用 UI。
 *
 * 仕様:
 *  - `#`, `,`, 空白（半角/全角）, Enter のいずれかを打った瞬間にタグ確定
 *  - 確定タグは色付きピルで表示。× ボタンで削除可能
 *  - 入力欄が空のとき backspace で末尾タグを削除
 *  - 既存の `tags: string[]` フィールドをそのまま使う（DB スキーマ非変更）
 *
 * value は CSV 文字列で受け取り、内部的に split → trim → 重複/空除去でピル配列に整形。
 *
 * 元は `app/writer/articles/[id]/edit/components/TagsInput.tsx` にあったが、
 * SpotEditor などからも使えるよう `components/writer` 配下に移動した。
 */
type Props = {
  /** カンマ区切りの tagsText（既存スキーマ互換） */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  maxTags?: number;
  /** 1 タグの最大文字数 */
  maxTagLength?: number;
  id?: string;
};

/** CSV 文字列 → string[]。空要素は除外、重複は前優先で除去 */
function csvToTags(csv: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of csv.split(/[,、\n]/)) {
    const t = raw.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function tagsToCsv(tags: string[]): string {
  return tags.join(', ');
}

/** 入力テキストから「タグ化トリガー」の境界を判定し、確定対象を取り出す */
const TRIGGER_RE = /[\s,、#]/;

export function TagsInput({
  value,
  onChange,
  placeholder,
  maxTags = 20,
  maxTagLength = 40,
  id,
}: Props) {
  const tags = useMemo(() => csvToTags(value), [value]);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commitTag = (raw: string) => {
    const t = raw.replace(/^#+/, '').trim().slice(0, maxTagLength);
    if (!t) return;
    if (tags.length >= maxTags) return;
    if (tags.includes(t)) return;
    onChange(tagsToCsv([...tags, t]));
  };

  const removeAt = (idx: number) => {
    onChange(tagsToCsv(tags.filter((_, i) => i !== idx)));
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // 末尾が trigger 文字なら直前部分を tag 化
    if (v.length > 0 && TRIGGER_RE.test(v[v.length - 1]!)) {
      const candidate = v.slice(0, -1);
      if (candidate.trim()) {
        commitTag(candidate);
      }
      setDraft('');
      return;
    }
    setDraft(v);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (draft.trim()) {
        commitTag(draft);
        setDraft('');
      }
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      // 末尾削除
      e.preventDefault();
      removeAt(tags.length - 1);
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    // カンマ・空白を含むテキストを貼り付けた場合は分割して一括登録
    if (TRIGGER_RE.test(text)) {
      e.preventDefault();
      const pieces = text.split(/[\s,、#]+/).filter((p) => p.trim());
      let working = [...tags];
      const seen = new Set(working);
      for (const p of pieces) {
        const t = p.trim().slice(0, maxTagLength);
        if (!t || seen.has(t) || working.length >= maxTags) continue;
        seen.add(t);
        working.push(t);
      }
      onChange(tagsToCsv(working));
      setDraft('');
    }
  };

  const onBlur = () => {
    if (draft.trim()) {
      commitTag(draft);
      setDraft('');
    }
  };

  const isFull = tags.length >= maxTags;

  return (
    <div
      className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 focus-within:border-2 focus-within:border-primary-500 focus-within:px-[7px] focus-within:py-[5px]"
      onClick={() => inputRef.current?.focus()}
      role="group"
      aria-label="タグ入力"
    >
      {tags.map((t, i) => (
        <span
          key={`${t}-${i}`}
          className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2.5 py-1 text-[12px] font-semibold text-primary-300 ring-1 ring-primary-500/30"
        >
          <span className="text-primary-300/70">#</span>
          <span>{t}</span>
          <button
            type="button"
            aria-label={`タグ「${t}」を削除`}
            onClick={(e) => {
              e.stopPropagation();
              removeAt(i);
            }}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-primary-300/70 transition hover:bg-primary-500/20 hover:text-primary-300"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={draft}
        onChange={onInput}
        onKeyDown={onKey}
        onPaste={onPaste}
        onBlur={onBlur}
        placeholder={
          isFull
            ? `最大 ${maxTags} 個まで`
            : tags.length === 0
              ? placeholder ?? '例: 朝食 マレ 路地裏（# / カンマ / 空白で確定）'
              : ''
        }
        disabled={isFull}
        className="min-w-[120px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-foreground/40 disabled:cursor-not-allowed"
      />
    </div>
  );
}
