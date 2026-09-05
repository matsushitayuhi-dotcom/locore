'use client';

import { Input } from '@locore/ui';
import { Plus, X } from 'lucide-react';
import { UniversityAutocomplete } from './UniversityAutocomplete';

/**
 * 経歴（職歴 / 学歴）の行エディタ。ResidentProfileForm から両方で共用する。
 *
 * 行の形は共通（CareerDraft）にして kind でラベルと表示項目を切り替える:
 *   - work:      name=会社・組織* / sub1=役職 / 開始年〜終了年 or「現在」
 *   - education: name=学校* / sub1=学位 / sub2=専攻 / 開始年〜終了年 or「在学中」
 * 年は任意（'' = 未記入）。上限 10 行。保存時の payload 変換は親側で行う。
 * education の「在学中」は留学特化の在学生/アルムナイ判定（EducationEntry.current）。
 */

export type CareerDraft = {
  /** 会社・組織名 or 学校名（必須） */
  name: string;
  /** 役職（work）or 学位（education） */
  sub1: string;
  /** 専攻（education のみ使用） */
  sub2: string;
  startYear: number | '';
  endYear: number | '';
  /** 在職中（work）/ 在学中（education）。true のとき endYear は無効化 */
  current: boolean;
  /** 大学マスタの QID（education・オートコンプリート選択時のみ。自由入力は null） */
  universityWikidataId: string | null;
};

export const emptyCareerDraft = (): CareerDraft => ({
  name: '',
  sub1: '',
  sub2: '',
  startYear: '',
  endYear: '',
  current: false,
  universityWikidataId: null,
});

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS: number[] = Array.from(
  { length: CURRENT_YEAR + 1 - 1950 + 1 },
  (_, i) => CURRENT_YEAR + 1 - i,
);

const MAX_ROWS = 10;

const yearSelectCls =
  'h-8 rounded-sm border border-border bg-background px-1.5 text-[12px] tabular-nums focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40';

function YearSelect({
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: {
  value: number | '';
  onChange: (v: number | '') => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value === '' ? '' : String(value)}
      onChange={(e) =>
        onChange(e.target.value === '' ? '' : Number(e.target.value))
      }
      aria-label={ariaLabel}
      disabled={disabled}
      className={yearSelectCls}
    >
      <option value="">年</option>
      {YEAR_OPTIONS.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

export function CareerHistoryEditor({
  kind,
  label,
  rows,
  onChange,
}: {
  kind: 'work' | 'education';
  label: string;
  rows: CareerDraft[];
  onChange: (rows: CareerDraft[]) => void;
}) {
  const patch = (idx: number, p: Partial<CareerDraft>) =>
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...p } : r)));
  const remove = (idx: number) => onChange(rows.filter((_, i) => i !== idx));
  const add = () => {
    if (rows.length >= MAX_ROWS) return;
    onChange([...rows, emptyCareerDraft()]);
  };

  const namePlaceholder =
    kind === 'work' ? '例: 日系総合商社 パリ駐在' : '例: 早稲田大学';
  const sub1Placeholder = kind === 'work' ? '役職（例: 消費財部門）' : '学位（例: 学士）';

  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold text-foreground/80">
        {label}
        <span className="ml-1 text-[10px] font-normal text-foreground/45">
          ({rows.length}/{MAX_ROWS})
        </span>
      </p>
      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={i}
              className="space-y-2 rounded-md bg-background p-3 ring-1 ring-border"
            >
              <div className="flex items-center gap-2">
                {kind === 'education' ? (
                  // 学校名は大学マスタ（0081）のオートコンプリート。自由入力も可
                  <UniversityAutocomplete
                    value={r.name}
                    onChange={(name, wikidataId) =>
                      patch(i, { name, universityWikidataId: wikidataId })
                    }
                    placeholder={namePlaceholder}
                  />
                ) : (
                  <Input
                    value={r.name}
                    onChange={(e) => patch(i, { name: e.target.value })}
                    placeholder={namePlaceholder}
                    maxLength={80}
                    className="flex-1"
                  />
                )}
                <button
                  type="button"
                  aria-label="この行を削除"
                  onClick={() => remove(i)}
                  className="rounded-sm p-1.5 text-foreground/40 hover:bg-muted hover:text-danger-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className={kind === 'education' ? 'grid gap-2 sm:grid-cols-2' : ''}>
                <Input
                  value={r.sub1}
                  onChange={(e) => patch(i, { sub1: e.target.value })}
                  placeholder={sub1Placeholder}
                  maxLength={80}
                />
                {kind === 'education' ? (
                  <Input
                    value={r.sub2}
                    onChange={(e) => patch(i, { sub2: e.target.value })}
                    placeholder="専攻（例: 商学）"
                    maxLength={80}
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <YearSelect
                  value={r.startYear}
                  onChange={(v) => patch(i, { startYear: v })}
                  ariaLabel="開始年"
                />
                <span className="text-[12px] text-foreground/50">〜</span>
                <YearSelect
                  value={r.endYear}
                  onChange={(v) => patch(i, { endYear: v })}
                  ariaLabel="終了年"
                  disabled={r.current}
                />
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-foreground/70">
                  <input
                    type="checkbox"
                    checked={r.current}
                    onChange={(e) => patch(i, { current: e.target.checked })}
                    className="h-3.5 w-3.5"
                  />
                  {kind === 'work' ? '現在' : '在学中'}
                </label>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={add}
        disabled={rows.length >= MAX_ROWS}
        className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[12px] font-medium text-foreground/70 hover:bg-primary-500/15 hover:text-primary-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        追加
      </button>
    </div>
  );
}
