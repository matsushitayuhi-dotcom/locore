'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Input } from '@locore/ui';
import { ChevronDown, Plus, X } from 'lucide-react';
import type { EducationEntry, WorkEntry } from '@locore/db';
import { updateResidentProfile } from '@/app/settings/profile/actions';
import { SpecialtyPicker } from '@/components/experts/SpecialtyPicker';
import {
  CareerHistoryEditor,
  type CareerDraft,
} from '@/components/settings/CareerHistoryEditor';
import {
  COMMON_LANGUAGES,
  LANGUAGE_LEVELS,
  LANGUAGE_LEVEL_LABEL,
  type FamilyStage,
  type LanguageLevel,
} from '@/lib/resident/constants';
import {
  RESIDENCE_COUNTRIES,
  RESIDENCE_CITIES_BY_COUNTRY,
} from '@/lib/resident/masters';

/**
 * エキスパート情報（留学特化）の編集フォーム。/settings/profile の 2 枚目。
 *
 * 2026-09 再設計: 縦長で触りにくかった旧「駐在員プロフィール」を、留学の決め手の順に並べた
 * 1 フォーム＋固定の保存バーに整理。
 *   1 学校・在学状況（必須） → 2 留学先の国・都市 → 3 得意分野（必須） → 4 相談できること
 *   → 5 話せる言語 → 6 職歴・職業（任意・折りたたみ）
 *
 * 表示から外した項目（データは消さない。既存値をそのまま送り返す）:
 *   出身（都道府県）/ 在住年数 / 家族構成 / ヘッダー画像 URL / 興味・趣味 / 探していること / 気軽に会える。
 *   これらは旧「住人検索（/residents）」向けで、留学相談の意思決定には効かないため。
 * 公開トグルはここには置かない（/settings ハブに一本化。メニュー作成など他タブの充足に依存するため）。
 */

type Lang = { code: string; level: LanguageLevel };

type Props = {
  initial: {
    homeRegion: string;
    residencyCountry: string;
    residencyCity: string;
    arrivalYear: number | null;
    familyStage: FamilyStage | '';
    occupation: string;
    coverImageUrl: string;
    offerings: string[];
    /** 得意分野（第 2 階層 code、0080）。lib/experts/specialties.ts */
    specialties: string[];
    education: EducationEntry[];
    workHistory: WorkEntry[];
    languages: Lang[];
    interests: string[];
    lookingFor: string[];
    openToMeetups: boolean;
  };
};

/** DB の経歴エントリ ⇄ 行エディタの draft 形の相互変換 */
function workToDraft(w: WorkEntry): CareerDraft {
  return {
    name: w.company,
    sub1: w.title ?? '',
    sub2: '',
    startYear: w.startYear ?? '',
    endYear: w.endYear ?? '',
    current: !!w.current,
    universityWikidataId: null,
    schoolNameEn: null,
  };
}
function eduToDraft(e: EducationEntry): CareerDraft {
  return {
    name: e.school,
    sub1: e.degree ?? '',
    sub2: e.field ?? '',
    startYear: e.startYear ?? '',
    endYear: e.endYear ?? '',
    current: !!e.current,
    universityWikidataId: e.universityWikidataId ?? null,
    schoolNameEn: e.schoolNameEn ?? null,
  };
}
function draftToWork(d: CareerDraft): WorkEntry {
  return {
    company: d.name.trim(),
    title: d.sub1.trim() || null,
    startYear: d.startYear === '' ? null : d.startYear,
    endYear: d.current || d.endYear === '' ? null : d.endYear,
    current: d.current,
  };
}
function draftToEdu(d: CareerDraft): EducationEntry {
  return {
    school: d.name.trim(),
    degree: d.sub1.trim() || null,
    field: d.sub2.trim() || null,
    startYear: d.startYear === '' ? null : d.startYear,
    endYear: d.current || d.endYear === '' ? null : d.endYear,
    current: d.current,
    universityWikidataId: d.universityWikidataId,
    schoolNameEn: d.schoolNameEn,
  };
}

const selectCls =
  'h-10 w-full rounded-md border border-border bg-background px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

export function ResidentProfileForm({ initial }: Props) {
  const [residencyCountry, setResidencyCountry] = useState(initial.residencyCountry);
  const [residencyCity, setResidencyCity] = useState(initial.residencyCity);
  const [occupation, setOccupation] = useState(initial.occupation);
  const [offerings, setOfferings] = useState<string[]>(initial.offerings);
  const [specialties, setSpecialties] = useState<string[]>(initial.specialties);
  const [workRows, setWorkRows] = useState<CareerDraft[]>(
    initial.workHistory.map(workToDraft),
  );
  const [eduRows, setEduRows] = useState<CareerDraft[]>(
    initial.education.map(eduToDraft),
  );
  const [languages, setLanguages] = useState<Lang[]>(initial.languages);
  const [offeringDraft, setOfferingDraft] = useState('');
  const [isPending, startTransition] = useTransition();

  const addOffering = () => {
    const v = offeringDraft.trim();
    if (!v || offerings.includes(v) || offerings.length >= 8) return;
    setOfferings([...offerings, v]);
    setOfferingDraft('');
  };
  const removeOffering = (tag: string) =>
    setOfferings((prev) => prev.filter((t) => t !== tag));

  const addLanguage = (code: string) => {
    if (languages.some((l) => l.code === code)) return;
    if (languages.length >= 8) return;
    setLanguages([...languages, { code, level: 'conversation' }]);
  };
  const removeLanguage = (code: string) =>
    setLanguages(languages.filter((l) => l.code !== code));
  const updateLanguageLevel = (code: string, level: LanguageLevel) =>
    setLanguages(languages.map((l) => (l.code === code ? { ...l, level } : l)));

  const hasSchool = eduRows.some((r) => r.name.trim());

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateResidentProfile({
        homeCountry: undefined,
        residencyCountry: residencyCountry || undefined,
        residencyCity: residencyCity || undefined,
        occupation: occupation || undefined,
        offerings,
        specialties,
        // 経歴: 名称が空の行は未入力扱いで除外し、DB のエントリ形に変換して全置換
        education: eduRows.filter((r) => r.name.trim()).map(draftToEdu),
        workHistory: workRows.filter((r) => r.name.trim()).map(draftToWork),
        languages,
        // ---- 表示から外した項目は既存値をそのまま送る（省略すると空で上書きされる）----
        homeRegion: initial.homeRegion || undefined,
        arrivalYear: initial.arrivalYear ?? undefined,
        familyStage: initial.familyStage || undefined,
        coverImageUrl: initial.coverImageUrl || undefined,
        interests: initial.interests,
        lookingFor: initial.lookingFor,
        openToMeetups: initial.openToMeetups,
      });
      if (res.ok) {
        toast.success('エキスパート情報を保存しました');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="relative">
      <div className="space-y-6 rounded-md bg-card p-5 ring-1 ring-border sm:p-6">
        <header>
          <h3 className="text-[15px] font-semibold tracking-tight">エキスパート情報</h3>
          <p className="mt-1 text-[12px] text-foreground/60">
            相談者が「この人に聞きたい」と決める材料です。学校と得意分野は必須、それ以外は任意。
          </p>
        </header>

        {/* 1. 学校・在学状況 */}
        <Block
          no="1"
          title="学校・在学状況"
          required
          helper="留学先の大学・大学院を最初に。在学中なら「在学中」にチェック（一覧に「在学中」、卒業なら「アルムナイ ’24」と表示されます）。"
        >
          <CareerHistoryEditor
            kind="education"
            label="学歴"
            rows={eduRows}
            onChange={setEduRows}
          />
          {!hasSchool ? (
            <p className="mt-2 text-[11.5px] text-warning-700">
              学校が未登録です。公開には 1 校以上の登録が必要です。
            </p>
          ) : null}
        </Block>

        {/* 2. 留学先の国・都市 */}
        <Block
          no="2"
          title="いま住んでいる国・都市"
          helper="一覧の「国で探す」に使います。留学先（または現在の居住地）を選んでください。"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-foreground/70">国</label>
              <select
                value={residencyCountry}
                onChange={(e) => {
                  setResidencyCountry(e.target.value);
                  setResidencyCity('');
                }}
                className={selectCls}
              >
                <option value="">— 選択 —</option>
                {RESIDENCE_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-foreground/70">都市</label>
              <select
                value={residencyCity}
                onChange={(e) => setResidencyCity(e.target.value)}
                disabled={!residencyCountry}
                className={selectCls}
              >
                <option value="">{residencyCountry ? '— 選択 —' : '先に国を選択'}</option>
                {(RESIDENCE_CITIES_BY_COUNTRY[residencyCountry] ?? []).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Block>

        {/* 3. 得意分野 */}
        <Block
          no="3"
          title="得意分野"
          required
          helper="相談者が探すときの分類です。一覧カードのホバーとテーマの絞り込みに使われます。"
        >
          <SpecialtyPicker value={specialties} onChange={setSpecialties} />
        </Block>

        {/* 4. こんな相談に乗れます */}
        <Block
          no="4"
          title="こんな相談に乗れます"
          helper="短い一文で具体的に。例:「SoP の構成レビュー」「GMAT 700 までの勉強法」（最大 8 個）。"
          count={`${offerings.length}/8`}
        >
          {offerings.length > 0 ? (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {offerings.map((o) => (
                <li
                  key={o}
                  className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-1 text-[12px] font-medium text-white"
                >
                  {o}
                  <button
                    type="button"
                    aria-label={`${o} を削除`}
                    onClick={() => removeOffering(o)}
                    className="rounded-full p-0.5 text-neutral-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={offeringDraft}
              onChange={(e) => setOfferingDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOffering();
                }
              }}
              maxLength={120}
              placeholder="入力して Enter で追加"
              disabled={offerings.length >= 8}
              className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={addOffering}
              disabled={offerings.length >= 8}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border-strong bg-card px-3 text-[12.5px] font-semibold hover:border-foreground disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              追加
            </button>
          </div>
        </Block>

        {/* 5. 言語 */}
        <Block no="5" title="話せる言語" helper="相談で使える言語とレベル。">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {COMMON_LANGUAGES.filter((l) => !languages.some((x) => x.code === l.code)).map(
              (l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => addLanguage(l.code)}
                  className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-card px-2.5 py-1 text-[11.5px] font-medium text-foreground/70 hover:border-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3" aria-hidden /> {l.label}
                </button>
              ),
            )}
          </div>
          {languages.length > 0 ? (
            <ul className="space-y-1.5">
              {languages.map((l) => {
                const label = COMMON_LANGUAGES.find((x) => x.code === l.code)?.label ?? l.code;
                return (
                  <li key={l.code} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[12.5px] font-semibold">{label}</span>
                    <select
                      value={l.level}
                      onChange={(e) => updateLanguageLevel(l.code, e.target.value as LanguageLevel)}
                      className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-[12px]"
                    >
                      {LANGUAGE_LEVELS.map((lv) => (
                        <option key={lv} value={lv}>
                          {LANGUAGE_LEVEL_LABEL[lv]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`${label} を削除`}
                      onClick={() => removeLanguage(l.code)}
                      className="rounded-sm p-1 text-foreground/40 hover:bg-muted hover:text-danger-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Block>

        {/* 6. 職歴・職業（任意・折りたたみ） */}
        <details
          className="group rounded-md border border-border"
          open={!!occupation || workRows.length > 0}
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold tabular-nums text-neutral-700">
              6
            </span>
            <span className="text-[13.5px] font-semibold">職歴・職業</span>
            <span className="rounded-full bg-muted px-2 py-px text-[10px] font-semibold text-foreground/55">
              任意
            </span>
            <span className="ml-auto hidden text-[11.5px] text-foreground/50 sm:inline">
              社会人出願・MBA・キャリア相談を受けるなら
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-foreground/50 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="space-y-4 border-t border-border px-4 pb-4 pt-4">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-foreground/70">
                現在の職業・肩書き
              </label>
              <Input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="例: MBA 留学中（元総合商社） / 現地企業でデザイナー"
                maxLength={80}
              />
              <p className="mt-1 text-[11px] text-foreground/55">名前の下に表示されます。</p>
            </div>
            <CareerHistoryEditor
              kind="work"
              label="職歴"
              rows={workRows}
              onChange={setWorkRows}
            />
          </div>
        </details>
      </div>

      {/* 固定の保存バー */}
      <div className="sticky bottom-0 z-10 mt-3 flex items-center gap-3 rounded-md border border-border bg-card/95 px-4 py-3 shadow-md backdrop-blur-md">
        <p className="text-[12px] text-foreground/60">
          {hasSchool && specialties.length > 0
            ? '必須項目は揃っています。保存後、公開ステータスから公開できます。'
            : '必須: 学校 1 校以上・得意分野 1 つ以上'}
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="ml-auto inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-primary-500 px-6 text-[13.5px] font-bold text-neutral-950 transition hover:bg-primary-300 disabled:opacity-50"
        >
          {isPending ? '保存中…' : 'エキスパート情報を保存'}
        </button>
      </div>
    </form>
  );
}

/** 番号つきのセクション枠。必須 / 件数のバッジと 1 行ヘルプ */
function Block({
  no,
  title,
  required = false,
  helper,
  count,
  children,
}: {
  no: string;
  title: string;
  required?: boolean;
  helper?: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neutral-900 text-[11px] font-bold tabular-nums text-primary-500">
          {no}
        </span>
        <h4 className="text-[13.5px] font-semibold">{title}</h4>
        {required ? (
          <span className="rounded-full bg-primary-100 px-2 py-px text-[10px] font-bold text-primary-900">
            必須
          </span>
        ) : null}
        {count ? (
          <span className="ml-auto text-[11px] tabular-nums text-foreground/50">{count}</span>
        ) : null}
      </div>
      {helper ? <p className="mb-2.5 text-[11.5px] text-foreground/55">{helper}</p> : null}
      {children}
    </section>
  );
}
