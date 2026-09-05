'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@locore/ui';
import { GraduationCap } from 'lucide-react';
import {
  searchUniversities,
  type UniversityHit,
} from '@/lib/universities/search';

/**
 * 大学名オートコンプリート（universities マスタ・0081）。
 *
 * - 250ms デバウンスで searchUniversities を叩き、候補をドロップダウン表示
 * - 候補を選ぶと表示名（name_ja ?? name_en）＋ wikidataId を親へ返す
 * - 自由入力も許容（マスタに無い学校）: そのまま文字列・wikidataId は null
 */
export function UniversityAutocomplete({
  value,
  onChange,
  placeholder = '例: ハーバード大学 / Harvard',
}: {
  value: string;
  /**
   * 入力・選択のどちらでも呼ばれる。自由入力時 wikidataId は null。
   * 候補選択時のみ第 3 引数に選んだ行（国コード等）が入る。
   */
  onChange: (
    name: string,
    wikidataId: string | null,
    hit?: UniversityHit,
  ) => void;
  placeholder?: string;
}) {
  const [hits, setHits] = useState<UniversityHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // 選択直後の再検索を抑止するフラグ
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    const q = value.trim();
    if (q.length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await searchUniversities(q);
        setHits(res);
        setOpen(res.length > 0);
        setActive(-1);
      } catch {
        setHits([]);
        setOpen(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);

  // 外側クリックで閉じる
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const pick = (h: UniversityHit) => {
    skipNextSearch.current = true;
    onChange(h.nameJa ?? h.nameEn ?? '', h.wikidataId, h);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value, null)}
        onFocus={() => {
          if (hits.length > 0) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, hits.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && active >= 0 && hits[active]) {
            e.preventDefault();
            pick(hits[active]!);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        maxLength={80}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-card py-1 shadow-md"
        >
          {hits.map((h, i) => (
            <li key={`${h.wikidataId}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                // blur より先に反応させる（onClick だと外側クリック判定に食われる）
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(h);
                }}
                onMouseEnter={() => setActive(i)}
                className={
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] ' +
                  (i === active ? 'bg-primary-500/10' : '')
                }
              >
                <GraduationCap
                  className="h-3.5 w-3.5 shrink-0 text-primary-700"
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {h.nameJa ?? h.nameEn}
                  </span>
                  <span className="block truncate text-[10.5px] text-foreground/50">
                    {h.nameJa && h.nameEn ? `${h.nameEn} ・ ` : ''}
                    {h.country ?? h.countryCode ?? ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
          <li className="border-t border-border px-3 py-1.5 text-[10.5px] text-foreground/45">
            リストに無い学校は、そのまま入力して構いません
          </li>
        </ul>
      ) : null}
    </div>
  );
}
