'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react';

/**
 * /search のトップ検索バー。記事検索 (ArticleJournal) の UI に準拠:
 *   - 常時表示: 国セレクト + キーワード入力
 *   - 「詳細設定」トグルで検索対象 (記事 / サービス / ユーザー / コミュニティ
 *     6 カテゴリ) のチェックを開く
 *   - 「検索する」ボタン submit で GET クエリに反映（リアルタイム検索はしない）
 *
 * GET フォーム (`method="get" action="/search"`) なので JS 無効でも submit でき、
 * 結果は Server Component 側 (page.tsx) が searchParams から描画する。
 * 折りたたみ中もチェックボックスは DOM に残す（hidden 属性）ため、パネルを
 * 閉じたまま submit しても現在の選択がそのまま送信される。
 */

type CountryOption = { slug: string; code: string; nameJa: string; emoji: string };
type ScopeOption = { value: string; label: string };

export function SearchForm({
  countries,
  scopeGroups,
  initialQ,
  initialCountry,
  selectedScopes,
  tags = [],
}: {
  countries: CountryOption[];
  /** 詳細設定パネルのチェック群（見出し付き） */
  scopeGroups: { title: string; options: ScopeOption[] }[];
  initialQ: string;
  initialCountry: string;
  /** 現在 ON になっている scope value の集合 */
  selectedScopes: Set<string>;
  /** /services のタグ絞り込みからの引き継ぎ（hidden で submit に持ち越す） */
  tags?: string[];
}) {
  const [advOpen, setAdvOpen] = useState(false);
  const hasFilter = !!initialQ || !!initialCountry;

  return (
    <form
      method="get"
      action="/search"
      className="rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5"
    >
      {tags.length > 0 ? (
        <input type="hidden" name="tags" value={tags.join(',')} />
      ) : null}

      {/* 常時表示: 国 + キーワード + 詳細設定トグル */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <select
          name="country"
          defaultValue={initialCountry}
          aria-label="国"
          className="h-11 shrink-0 rounded-xl bg-background px-3 text-[14px] ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary-500 sm:w-44"
        >
          <option value="">すべての国</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.emoji} {c.nameJa}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={initialQ}
            placeholder="例: マレ ビストロ / 翻訳 / 求人"
            aria-label="キーワード"
            className="h-11 w-full rounded-xl bg-background pl-9 pr-3 text-[14px] ring-1 ring-border placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          type="button"
          onClick={() => setAdvOpen((v) => !v)}
          aria-expanded={advOpen}
          className={
            'inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-[13px] font-semibold transition ' +
            (advOpen
              ? 'bg-primary-500/15 text-primary-300 ring-1 ring-primary-300/40'
              : 'bg-background text-foreground/70 ring-1 ring-border hover:bg-primary-500/10')
          }
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          詳細設定
        </button>
      </div>

      {/* 詳細設定: 検索対象チェック群。折りたたみ中も hidden で DOM に残す。 */}
      <div className={advOpen ? 'mt-4 space-y-4' : 'hidden'} aria-hidden={!advOpen}>
        {scopeGroups.map((group) => (
          <fieldset key={group.title}>
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              {group.title}
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.options.map((o) => {
                const checked = selectedScopes.has(o.value);
                return (
                  <label
                    key={o.value}
                    className={
                      'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition ' +
                      (checked
                        ? 'bg-primary-500/15 text-primary-300 ring-1 ring-primary-300/40'
                        : 'bg-background text-foreground/65 ring-1 ring-border hover:bg-primary-500/10')
                    }
                  >
                    <input
                      type="checkbox"
                      name="areas"
                      value={o.value}
                      defaultChecked={checked}
                      className="h-3.5 w-3.5 accent-primary-500"
                    />
                    {o.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {hasFilter ? (
          <Link
            href="/search"
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[12px] font-semibold text-foreground/65 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            リセット
          </Link>
        ) : null}
        <button
          type="submit"
          className="ml-auto h-11 w-full rounded-full bg-primary-500 px-6 text-[14px] font-bold text-neutral-950 transition active:scale-[0.98] hover:bg-primary-300 sm:ml-auto sm:w-auto"
        >
          この条件で検索
        </button>
      </div>
    </form>
  );
}
