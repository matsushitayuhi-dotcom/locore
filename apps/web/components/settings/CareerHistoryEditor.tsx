'use client';

import { Input } from '@locore/ui';
import { Plus, X } from 'lucide-react';
import { UniversityAutocomplete } from './UniversityAutocomplete';

/**
 * 経歴（職歴 / 学歴）の行エディタ。ResidentProfileForm から両方で共用する。
 *
 * 行の形は共通（CareerDraft）にして kind でラベルと表示項目を切り替える:
 *   - work:      name=会社・組織* / sub1=役職 / 開始年〜終了年 or「現在」
 *   - education: name=学校* / sub1=学位 / sub2=専攻 / 出願年 / 開始年〜終了年 or「在学中」
 *   - admission: name=学校* / sub1=学位・プログラム / 出願年（進学しなかった合格校・0087）
 * 年は任意（'' = 未記入）。上限 10 行。保存時の payload 変換は親側で行う。
 * education の「在学中」は留学特化の在学生/アルムナイ判定（EducationEntry.current）。
 * 出願年は /experts/[id] の「合格実績」で年ごとにまとめる材料（applicationYear）。
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
  /** 大学の英語名（education・オートコンプリート選択時のみ） */
  schoolNameEn: string | null;
  /** 出願年（education / admission）。'' = 未記入 */
  applicationYear: number | '';
};

export const emptyCareerDraft = (): CareerDraft => ({
  name: '',
  sub1: '',
  sub2: '',
  startYear: '',
  endYear: '',
  current: false,
  universityWikidataId: null,
  schoolNameEn: null,
  applicationYear: '',
});

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS: number[] = Array.from(
  { length: CURRENT_YEAR + 1 - 1950 + 1 },
  (_, i) => CURRENT_YEAR + 1 - i,
);

const MAX_ROWS = 10;

// shrink-0: 年セレクトは縮んではいけない側（縮むと「2 / 0 / 2 / 6」と割れる）。
// 足りなければ親の flex-wrap で次行に送る。max-sm:h-9 はスマホのタップ領域 36px 確保。
const yearSelectCls =
  'h-8 shrink-0 rounded-sm border border-border bg-background px-1.5 text-[12px] tabular-nums focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 max-sm:h-9';

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
  helper,
}: {
  kind: 'work' | 'education' | 'admission';
  label: string;
  rows: CareerDraft[];
  onChange: (rows: CareerDraft[]) => void;
  /** 見出し下の補足（任意） */
  helper?: string;
}) {
  const patch = (idx: number, p: Partial<CareerDraft>) =>
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...p } : r)));
  const remove = (idx: number) => onChange(rows.filter((_, i) => i !== idx));
  const add = () => {
    if (rows.length >= MAX_ROWS) return;
    onChange([...rows, emptyCareerDraft()]);
  };

  const namePlaceholder =
    kind === 'work'
      ? '例: 日系総合商社 パリ駐在'
      : kind === 'admission'
        ? '例: London School of Economics'
        : '例: 早稲田大学';
  const sub1Placeholder =
    kind === 'work'
      ? '役職（例: 消費財部門）'
      : kind === 'admission'
        ? '学位・プログラム（例: MSc Finance）'
        : '学位（例: 学士）';
  // 学校名は大学マスタ（0081）のオートコンプリート（education / admission）。自由入力も可
  const isSchool = kind !== 'work';

  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold text-foreground/80">
        {label}
        {/* 10px は実機で読めないのでスマホだけ 11px に上げる（PC は据え置き） */}
        <span className="ml-1 text-[10px] font-normal text-foreground/45 max-sm:text-[11px]">
          ({rows.length}/{MAX_ROWS})
        </span>
      </p>
      {helper ? <p className="mb-2 text-[11.5px] text-foreground/55">{helper}</p> : null}
      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={i}
              className="space-y-2 rounded-md bg-background p-3 ring-1 ring-border"
            >
              <div className="flex items-center gap-2">
                {isSchool ? (
                  <UniversityAutocomplete
                    value={r.name}
                    onChange={(name, wikidataId, hit) =>
                      patch(i, {
                        name,
                        universityWikidataId: wikidataId,
                        // 候補選択時のみ英語名を保持（自由入力は null に戻す）
                        schoolNameEn: hit?.nameEn ?? null,
                      })
                    }
                    placeholder={namePlaceholder}
                  />
                ) : (
                  <Input
                    value={r.name}
                    onChange={(e) => patch(i, { name: e.target.value })}
                    placeholder={namePlaceholder}
                    maxLength={80}
                    // input は min-width:auto が既定サイズ(約 176px)で止まるため、
                    // min-w-0 が無いと 320px で削除ボタンごと右へはみ出す
                    className="min-w-0 flex-1"
                  />
                )}
                <button
                  type="button"
                  aria-label="この行を削除"
                  onClick={() => remove(i)}
                  // shrink-0 で入力欄側にしわ寄せ。28px では押しづらいのでスマホは 36px
                  className="inline-flex shrink-0 items-center justify-center rounded-sm p-1.5 text-foreground/40 hover:bg-muted hover:text-danger-500 max-sm:h-9 max-sm:w-9"
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
                {isSchool ? (
                  // shrink-0: 「出 / 願」と 1 文字ずつ割れないよう縮ませない側にする
                  <label className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-foreground/70">
                    出願
                    <YearSelect
                      value={r.applicationYear}
                      onChange={(v) => patch(i, { applicationYear: v })}
                      ariaLabel="出願年"
                    />
                  </label>
                ) : null}
                {kind !== 'admission' ? (
                  <>
                    {isSchool ? (
                      <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />
                    ) : null}
                    <YearSelect
                      value={r.startYear}
                      onChange={(v) => patch(i, { startYear: v })}
                      ariaLabel="開始年"
                    />
                    <span className="shrink-0 text-[12px] text-foreground/50">〜</span>
                    <YearSelect
                      value={r.endYear}
                      onChange={(v) => patch(i, { endYear: v })}
                      ariaLabel="終了年"
                      disabled={r.current}
                    />
                    {/* shrink-0 で「現 / 在」の縦割れを防ぎ、スマホは高さ 36px を確保 */}
                    <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap text-[12px] text-foreground/70 max-sm:min-h-9">
                      <input
                        type="checkbox"
                        checked={r.current}
                        onChange={(e) => patch(i, { current: e.target.checked })}
                        className="h-3.5 w-3.5 shrink-0 max-sm:h-4 max-sm:w-4"
                      />
                      {kind === 'work' ? '現在' : '在学中'}
                    </label>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={add}
        disabled={rows.length >= MAX_ROWS}
        // 高さ 30px でタップしづらかったのでスマホだけ 36px に
        className="mt-2 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-3 py-1.5 text-[12px] font-medium text-foreground/70 hover:bg-primary-500/15 hover:text-primary-300 disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-9"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        追加
      </button>
    </div>
  );
}
