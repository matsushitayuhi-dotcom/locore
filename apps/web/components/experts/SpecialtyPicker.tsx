'use client';

import { useState } from 'react';
import {
  MAX_SPECIALTIES,
  MAX_SPECIALTY_GROUPS,
  SPECIALTY_GROUPS,
  isExperienceOnly,
  normalizeSpecialties,
  specialtyGroupOf,
} from '@/lib/experts/specialties';

/**
 * 得意分野（統制リスト・2 階層）の選択 UI。settings/profile に組み込む前提。
 *
 * - 第 1 階層ごとに第 2 階層のチップを並べ、クリックでトグル。
 * - 上限: 第 2 階層 MAX_SPECIALTIES（6）件、第 1 階層 MAX_SPECIALTY_GROUPS（3）つ。
 *   超えるチップは disabled にして理由を表示する。
 * - 制御 / 非制御どちらでも使える:
 *   - `value` + `onChange` を渡せば制御（ResidentProfileForm の state に載せる用）
 *   - `name` を渡すと選択ぶんの hidden input を出す（通常の <form> 送信用）
 *
 * 保存側は normalizeSpecialties() で再検証すること（未知の code・上限超えを落とす）。
 */
export function SpecialtyPicker({
  value,
  defaultValue = [],
  onChange,
  name,
}: {
  value?: string[];
  defaultValue?: string[];
  onChange?: (next: string[]) => void;
  name?: string;
}) {
  const [inner, setInner] = useState<string[]>(() => normalizeSpecialties(defaultValue));
  const selected = value ?? inner;
  const set = (next: string[]) => {
    const n = normalizeSpecialties(next);
    if (value === undefined) setInner(n);
    onChange?.(n);
  };

  const selectedGroups = new Set(
    selected.map((c) => specialtyGroupOf(c)?.code).filter(Boolean) as string[],
  );
  const atMax = selected.length >= MAX_SPECIALTIES;
  const atMaxGroups = selectedGroups.size >= MAX_SPECIALTY_GROUPS;

  const toggle = (code: string) => {
    if (selected.includes(code)) {
      set(selected.filter((c) => c !== code));
      return;
    }
    set([...selected, code]);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px] text-neutral-500">
        <span>
          <b className="tabular-nums text-foreground">{selected.length}</b> / {MAX_SPECIALTIES} 件
          （分野は {MAX_SPECIALTY_GROUPS} つまで）
        </span>
        {atMax ? <span className="text-warning-700">上限に達しました</span> : null}
      </div>
      <div className="flex flex-col gap-4">
        {SPECIALTY_GROUPS.map((g) => {
          const groupLocked = atMaxGroups && !selectedGroups.has(g.code);
          return (
            <fieldset key={g.code} className={groupLocked ? 'opacity-45' : ''}>
              <legend className="mb-1.5 text-[13px] font-bold">{g.label}</legend>
              <div className="flex flex-wrap gap-1.5">
                {g.children.map((c) => {
                  const on = selected.includes(c.code);
                  const disabled = !on && (atMax || groupLocked);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => toggle(c.code)}
                      disabled={disabled}
                      aria-pressed={on}
                      className={
                        'rounded-full border px-3 py-1.5 text-[12.5px] transition disabled:cursor-not-allowed ' +
                        (on
                          ? 'border-neutral-900 bg-neutral-900 font-bold text-white'
                          : 'border-border-strong bg-card font-medium text-neutral-700 hover:border-foreground disabled:hover:border-border-strong')
                      }
                    >
                      {c.label}
                      {isExperienceOnly(c.code) ? (
                        <span className="ml-1 text-[10px] opacity-70">※</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-neutral-400">
        ※ 付きの分野（ビザ・税務・資産など）は「本人の体験談」として掲載されます。専門家としての助言はできません。
      </p>
      {name
        ? selected.map((c) => <input key={c} type="hidden" name={name} value={c} />)
        : null}
    </div>
  );
}
