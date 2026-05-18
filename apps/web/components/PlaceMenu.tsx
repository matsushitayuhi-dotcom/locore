'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Lock } from 'lucide-react';
import type { CountryListItem } from '@/lib/geo/countries';

/**
 * グローバルヘッダーの「場所」ドロップダウン。
 *
 * モード別に挙動を変える:
 *   - traveler:  国の一覧 → クリックで地域パネルに drill-down → 地域選択で /region/{slug}
 *   - resident:  国のみ表示 → クリックで /country/{code} に直行（地域単位は管理しない方針）
 *
 * 各国の region 一覧は暫定でハードコード。現時点ではフランスのみ active なので問題なし。
 * 国が増えてきたら lib/geo に動的取得 API を追加して置き換える。
 */

type RegionLink = { slug: string; nameJa: string };

const REGIONS_BY_COUNTRY: Record<string, RegionLink[]> = {
  fr: [
    { slug: 'paris', nameJa: 'パリ＆近郊' },
    { slug: 'lyon', nameJa: 'リヨン' },
    { slug: 'marseille', nameJa: 'マルセイユ' },
    { slug: 'bordeaux', nameJa: 'ボルドー' },
    { slug: 'toulouse', nameJa: 'トゥールーズ' },
    { slug: 'strasbourg', nameJa: 'ストラスブール・アルザス' },
    { slug: 'lille', nameJa: 'リール' },
    { slug: 'montpellier', nameJa: 'モンペリエ' },
    { slug: 'nantes', nameJa: 'ナント' },
    { slug: 'rennes', nameJa: 'レンヌ' },
    { slug: 'provence', nameJa: 'プロヴァンス' },
    { slug: 'loire-valley', nameJa: 'ロワール渓谷' },
    { slug: 'normandy', nameJa: 'ノルマンディー' },
    { slug: 'brittany', nameJa: 'ブルターニュ' },
    { slug: 'champagne', nameJa: 'シャンパーニュ・ランス' },
    { slug: 'dordogne', nameJa: 'ドルドーニュ' },
    { slug: 'fr-other', nameJa: 'フランスその他' },
  ],
};

export function PlaceMenu({
  countries,
  mode = 'traveler',
  availableRegionSlugs,
}: {
  countries: CountryListItem[];
  mode?: 'traveler' | 'resident';
  /**
   * コンテンツ (記事 / コミュニティ投稿) が紐付いている region slug の配列。
   * これに含まれない region は drill-down 一覧から除外する。
   * undefined ならフィルタしない (後方互換)。
   */
  availableRegionSlugs?: string[];
}) {
  // 配列 → Set で高速 lookup
  const availableSet =
    availableRegionSlugs != null ? new Set(availableRegionSlugs) : null;
  const [open, setOpen] = useState(false);
  const [drilledCode, setDrilledCode] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
        setDrilledCode(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drilledCode) setDrilledCode(null);
        else setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, drilledCode]);

  const active = countries.filter((c) => c.status === 'active');
  const coming = countries.filter((c) => c.status === 'coming_soon');

  const drilledCountry = drilledCode
    ? countries.find((c) => c.code === drilledCode)
    : null;
  const allDrilledRegions = drilledCode ? REGIONS_BY_COUNTRY[drilledCode] ?? [] : [];
  // コンテンツのある region だけ表示。availableSet が無いときは
  // 全件出す (後方互換)
  const drilledRegions = availableSet
    ? allDrilledRegions.filter((r) => availableSet.has(r.slug))
    : allDrilledRegions;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setDrilledCode(null);
        }}
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
          {!drilledCountry ? (
            <>
              {active.length > 0 ? (
                <div className="border-b border-border px-4 py-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/55">
                    いま読める
                  </p>
                  <ul className="space-y-0.5">
                    {active.map((c) => (
                      <li key={c.code}>
                        <CountryRow
                          country={c}
                          mode={mode}
                          onDrill={
                            mode === 'traveler' &&
                            // コンテンツのある region が 1 つでもあれば drill 可
                            (REGIONS_BY_COUNTRY[c.code] ?? []).some(
                              (r) => !availableSet || availableSet.has(r.slug),
                            )
                              ? () => setDrilledCode(c.code)
                              : undefined
                          }
                          onNavigate={() => setOpen(false)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

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

              <Link
                href={mode === 'resident' ? '/expat' : '/world'}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-t border-border bg-primary-500/10 px-4 py-3 text-[12px] font-bold text-primary-300 transition hover:bg-primary-500/15"
              >
                {mode === 'resident' ? '駐在員ホームへ' : 'すべての国・地域を見る'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <button
                  type="button"
                  onClick={() => setDrilledCode(null)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground/60 hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  国を選び直す
                </button>
                <span className="text-[11px] font-bold tracking-tight text-foreground">
                  {drilledCountry.nameJa}
                </span>
              </div>

              {drilledRegions.length > 0 ? (
                <div className="px-3 py-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/55">
                    地域を選ぶ
                  </p>
                  <ul className="max-h-[320px] space-y-0.5 overflow-y-auto">
                    {drilledRegions.map((r) => (
                      <li key={r.slug}>
                        <Link
                          href={`/region/${r.slug}`}
                          onClick={() => {
                            setOpen(false);
                            setDrilledCode(null);
                          }}
                          className="flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] text-foreground hover:bg-primary-500/10"
                        >
                          <span className="font-semibold">{r.nameJa}</span>
                          <ArrowRight className="h-3 w-3 text-foreground/40" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-[12px] text-foreground/55">
                  この国にはまだ地域が登録されていません
                </div>
              )}

              <Link
                href={`/country/${drilledCountry.code}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-t border-border bg-primary-500/10 px-4 py-3 text-[12px] font-bold text-primary-300 transition hover:bg-primary-500/15"
              >
                {drilledCountry.nameJa} の全体を見る
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CountryRow({
  country,
  mode,
  onDrill,
  onNavigate,
}: {
  country: CountryListItem;
  mode: 'traveler' | 'resident';
  onDrill?: () => void;
  onNavigate: () => void;
}) {
  if (mode === 'traveler' && onDrill) {
    return (
      <button
        type="button"
        onClick={onDrill}
        className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] text-foreground hover:bg-primary-500/10"
      >
        <span className="flex items-baseline gap-2">
          <span className="font-semibold">{country.nameJa}</span>
          <span className="text-[10px] text-foreground/45">
            {country.activeRegionCount} 地域
          </span>
        </span>
        <ArrowRight className="h-3 w-3 text-foreground/40" />
      </button>
    );
  }
  // resident モード: 駐在員ホーム /expat に直行（地域には行かない）。
  // 将来、国別駐在員ホームが増えたら /expat?country={code} or /expat/{code} に拡張。
  const href = mode === 'resident' ? '/expat' : `/country/${country.code}`;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] text-foreground hover:bg-primary-500/10"
    >
      <span className="flex items-baseline gap-2">
        <span className="font-semibold">{country.nameJa}</span>
        {mode === 'resident' ? null : (
          <span className="text-[10px] text-foreground/45">
            {country.activeRegionCount} 地域
          </span>
        )}
      </span>
      <ArrowRight className="h-3 w-3 text-foreground/40" />
    </Link>
  );
}
