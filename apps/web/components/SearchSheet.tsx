'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

/**
 * 検索シート — IA 3 領域モデル (2026-05) の検索 UI。
 *
 * トリガー (SiteHeader / BottomNav の「検索」ボタン) から開かれ、
 *   - 検索クエリ (1 行 input)
 *   - 領域チェックボックス (記事 / サービス / 駐在員向け; default 全 ON)
 *   - 国 dropdown
 *   - 地域 dropdown (選択した国に応じて切替, 国未選択時は disabled)
 * を提示し、「検索する」で /search?q=...&areas=...&country=...&region=...
 * に遷移する。
 *
 * 領域 (areas) は SearchResult ページが
 *   articles / services / residents
 * の 3 値を理解するキーで持つ。
 *
 * スマホでは下から slide-up、PC では中央モーダルとして描画。
 * Esc / 背景クリックで閉じる。
 */

export type SearchAreaKey = 'articles' | 'services' | 'residents';

const AREA_OPTIONS: { key: SearchAreaKey; label: string }[] = [
  { key: 'articles', label: '記事' },
  { key: 'services', label: 'サービス' },
  { key: 'residents', label: '駐在員向け' },
];

export type SearchSheetCountry = {
  code: string;
  nameJa: string;
};

export type SearchSheetRegion = {
  countryCode: string;
  slug: string;
  nameJa: string;
};

export function SearchSheet({
  open,
  onClose,
  countries,
  regions,
  defaultQuery = '',
  defaultAreas,
  defaultCountry = '',
  defaultRegion = '',
}: {
  open: boolean;
  onClose: () => void;
  countries: SearchSheetCountry[];
  regions: SearchSheetRegion[];
  defaultQuery?: string;
  defaultAreas?: SearchAreaKey[];
  defaultCountry?: string;
  defaultRegion?: string;
}) {
  const router = useRouter();

  const [q, setQ] = useState(defaultQuery);
  const [areas, setAreas] = useState<Set<SearchAreaKey>>(
    () => new Set(defaultAreas ?? AREA_OPTIONS.map((a) => a.key)),
  );
  const [country, setCountry] = useState(defaultCountry);
  const [region, setRegion] = useState(defaultRegion);

  // body スクロールロック + Esc 対応
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // 国が変わったら、その国に属さない region は自動でリセット
  useEffect(() => {
    if (!region) return;
    const r = regions.find((x) => x.slug === region);
    if (!r) {
      setRegion('');
      return;
    }
    if (country && r.countryCode !== country) {
      setRegion('');
    }
  }, [country, region, regions]);

  const filteredRegions = useMemo(() => {
    if (!country) return [];
    return regions.filter((r) => r.countryCode === country);
  }, [country, regions]);

  const toggleArea = (key: SearchAreaKey) => {
    setAreas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = q.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    // areas は 3 つ全部選ばれていれば省略 (= 全領域)
    if (areas.size > 0 && areas.size < AREA_OPTIONS.length) {
      params.set('areas', Array.from(areas).join(','));
    }
    if (country) params.set('country', country);
    if (region) params.set('region', region);
    onClose();
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="検索"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      {/* オーバーレイ */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
      />

      {/* シート本体 */}
      <form
        onSubmit={submit}
        className={
          'relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden bg-background shadow-2xl ' +
          'rounded-t-2xl sm:max-w-lg sm:rounded-2xl sm:max-h-[85vh]'
        }
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-foreground/75" aria-hidden />
            <h2 className="text-[14px] font-bold">検索</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-full p-1.5 text-foreground/65 transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {/* 検索クエリ */}
          <div>
            <label
              htmlFor="search-sheet-q"
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55"
            >
              キーワード
            </label>
            <input
              id="search-sheet-q"
              type="search"
              inputMode="search"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="例: マレ ビストロ / 翻訳 / 求人"
              className="h-11 w-full rounded-xl bg-card px-3 text-[14px] text-foreground placeholder:text-foreground/40 ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          {/* 領域チェックボックス */}
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              検索する領域
            </p>
            <ul className="flex flex-wrap gap-2">
              {AREA_OPTIONS.map((opt) => {
                const checked = areas.has(opt.key);
                return (
                  <li key={opt.key}>
                    <label
                      className={
                        'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition ' +
                        (checked
                          ? 'bg-primary-500/15 text-primary-300 ring-1 ring-primary-300/40'
                          : 'bg-card text-foreground/65 ring-1 ring-border hover:bg-primary-500/10')
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleArea(opt.key)}
                        className="h-3.5 w-3.5 accent-primary-500"
                      />
                      {opt.label}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 国 / 地域 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="search-sheet-country"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55"
              >
                国
              </label>
              <select
                id="search-sheet-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-11 w-full rounded-xl bg-card px-3 text-[14px] text-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">すべての国</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.nameJa}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="search-sheet-region"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/55"
              >
                地域
              </label>
              <select
                id="search-sheet-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={!country}
                className="h-11 w-full rounded-xl bg-card px-3 text-[14px] text-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{country ? 'すべての地域' : '国を先に選んでください'}</option>
                {filteredRegions.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.nameJa}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-border px-4 py-3">
          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-primary-500 text-[14px] font-bold text-neutral-950 transition active:scale-[0.98] hover:bg-primary-300"
          >
            検索する
          </button>
        </footer>
      </form>
    </div>
  );
}
