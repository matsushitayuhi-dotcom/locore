'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Lock } from 'lucide-react';
import type { CountryListItem } from '@/lib/geo/countries';

/**
 * グローバルヘッダーの「場所」ドロップダウン。
 *
 * - active 国だけクリック可能。クリックで /country/<code> へドリルダウン
 * - 準備中の国はグレーアウト表示で、サインアップを促す情報は出さない（軽め）
 * - 末尾に「すべての国を見る → /world」リンク
 * - 親 SiteHeader から countries を SSR で渡してもらう
 */
export function PlaceMenu({ countries }: { countries: CountryListItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active = countries.filter((c) => c.status === 'active');
  const coming = countries.filter((c) => c.status === 'coming_soon');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-foreground/70 transition hover:bg-primary-500/10 hover:text-foreground"
      >
        場所
        <ChevronDown
          className={'h-3.5 w-3.5 transition-transform ' + (open ? 'rotate-180' : '')}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-2 w-[320px] overflow-hidden rounded-xl bg-card shadow-xl ring-1 ring-border"
        >
          {/* Active 国 */}
          {active.length > 0 ? (
            <div className="border-b border-border px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/55">
                いま読める
              </p>
              <ul className="space-y-0.5">
                {active.map((c) => (
                  <li key={c.code}>
                    <Link
                      href={`/country/${c.code}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] text-foreground hover:bg-primary-500/10"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="font-semibold">{c.nameJa}</span>
                        <span className="text-[10px] text-foreground/45">
                          {c.activeRegionCount} 地域
                        </span>
                      </span>
                      <ArrowRight className="h-3 w-3 text-foreground/40" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Coming Soon 国（プレビュー、最大 6 件） */}
          {coming.length > 0 ? (
            <div className="px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/45">
                これから開く
              </p>
              <ul className="space-y-0.5">
                {coming.slice(0, 6).map((c) => (
                  <li
                    key={c.code}
                    className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-[12px] text-foreground/55"
                  >
                    <span>{c.nameJa}</span>
                    <Lock className="h-3 w-3 text-foreground/35" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* すべて見る */}
          <Link
            href="/world"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between border-t border-border bg-primary-500/10 px-4 py-3 text-[12px] font-bold text-primary-300 transition hover:bg-primary-500/15"
          >
            すべての国・地域を見る
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
