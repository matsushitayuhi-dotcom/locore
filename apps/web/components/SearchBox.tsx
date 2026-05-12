'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from '@locore/ui/icons';

/**
 * フィードのトップに置く検索ボックス。
 *
 * - 入力後 Enter or 検索ボタンで `/search?q=...&in=title|body` に遷移
 * - タイトル検索 / 本文検索 をラジオで切替（既定: title）
 * - `defaultQuery` を渡すと初期値として表示（検索結果ページからの再検索用）
 */
type Props = {
  defaultQuery?: string;
  defaultIn?: 'title' | 'body';
  /** label を出すかどうか（ホームでは非表示、検索ページでは表示） */
  showLabel?: boolean;
  className?: string;
};

export function SearchBox({
  defaultQuery = '',
  defaultIn = 'title',
  showLabel = false,
  className,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQuery);
  const [mode, setMode] = useState<'title' | 'body'>(defaultIn);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length < 1) return;
    const params = new URLSearchParams();
    params.set('q', trimmed);
    params.set('in', mode);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      className={'w-full ' + (className ?? '')}
    >
      {showLabel ? (
        <label
          htmlFor="search-q"
          className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55"
        >
          記事を検索
        </label>
      ) : null}

      <div className="flex items-stretch gap-2 rounded-2xl bg-card p-2 shadow-sm ring-1 ring-border focus-within:ring-2 focus-within:ring-primary-300">
        <div className="flex flex-1 items-center gap-2 px-2">
          <Search className="h-4 w-4 shrink-0 text-foreground/45" />
          <input
            id="search-q"
            type="search"
            inputMode="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              mode === 'title'
                ? 'タイトルから検索（例: マレ ビストロ）'
                : '本文から検索（例: 路地裏 朝食 ローカル）'
            }
            className="h-10 w-full bg-transparent text-[14px] text-foreground placeholder:text-foreground/40 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={q.trim().length === 0}
          className="rounded-xl bg-primary-500 px-4 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300 disabled:bg-foreground/15 disabled:text-foreground/45"
        >
          検索
        </button>
      </div>

      <div
        role="radiogroup"
        aria-label="検索対象"
        className="mt-2 flex flex-wrap items-center gap-1 px-1 text-[11px]"
      >
        <span className="mr-1 text-foreground/45">検索対象:</span>
        <ModePill
          label="タイトル"
          checked={mode === 'title'}
          onChange={() => setMode('title')}
        />
        <ModePill
          label="本文"
          checked={mode === 'body'}
          onChange={() => setMode('body')}
        />
      </div>
    </form>
  );
}

function ModePill({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={
        'inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 font-medium transition ' +
        (checked
          ? 'bg-primary-500/15 text-primary-300 ring-1 ring-primary-300/40'
          : 'text-foreground/55 hover:bg-primary-500/10')
      }
    >
      <input
        type="radio"
        name="search-mode"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}
