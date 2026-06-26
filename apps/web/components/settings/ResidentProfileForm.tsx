'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { Plus, X } from 'lucide-react';
import { updateResidentProfile } from '@/app/settings/profile/actions';
import {
  FAMILY_STAGES,
  FAMILY_STAGE_LABEL,
  COMMON_LANGUAGES,
  LANGUAGE_LEVELS,
  LANGUAGE_LEVEL_LABEL,
  INTEREST_PRESETS,
  LOOKING_FOR_PRESETS,
  type FamilyStage,
  type LanguageLevel,
} from '@/lib/resident/constants';
import {
  JP_PREFECTURES,
  RESIDENCE_COUNTRIES,
  RESIDENCE_CITIES_BY_COUNTRY,
  RESIDENCE_YEAR_OPTIONS,
  arrivalYearFromBucket,
  type ResidenceYearBucket,
} from '@/lib/resident/masters';

/**
 * 駐在員プロフィールの編集フォーム。
 *
 * 既存の ProfileForm（表示名 / bio / avatar）とは別カードで出して、
 * 「交流を促す情報」をオプトインで埋めてもらう設計。
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
    languages: Lang[];
    interests: string[];
    lookingFor: string[];
    openToMeetups: boolean;
  };
};

/** users.arrival_year（西暦）→ "1-2" 等のバケット */
function bucketFromArrivalYear(arrivalYear: number | null): ResidenceYearBucket | '' {
  if (arrivalYear === null || !Number.isFinite(arrivalYear)) return '';
  const years = Math.max(0, new Date().getFullYear() - arrivalYear);
  if (years < 1) return '<1';
  if (years <= 2) return '1-2';
  if (years <= 5) return '3-5';
  if (years <= 10) return '6-10';
  if (years <= 15) return '11-15';
  if (years <= 20) return '16-20';
  return '20+';
}

export function ResidentProfileForm({ initial }: Props) {
  const [homeRegion, setHomeRegion] = useState(initial.homeRegion);
  const [residencyCountry, setResidencyCountry] = useState(
    initial.residencyCountry,
  );
  const [residencyCity, setResidencyCity] = useState(initial.residencyCity);
  const [yearBucket, setYearBucket] = useState<ResidenceYearBucket | ''>(
    bucketFromArrivalYear(initial.arrivalYear),
  );
  const [familyStage, setFamilyStage] = useState<FamilyStage | ''>(
    initial.familyStage,
  );
  const [occupation, setOccupation] = useState(initial.occupation);
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl);
  const [offerings, setOfferings] = useState<string[]>(initial.offerings);
  const [languages, setLanguages] = useState<Lang[]>(initial.languages);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [lookingFor, setLookingFor] = useState<string[]>(initial.lookingFor);
  const [openToMeetups, setOpenToMeetups] = useState(initial.openToMeetups);
  const [interestDraft, setInterestDraft] = useState('');
  const [lookingForDraft, setLookingForDraft] = useState('');
  const [offeringDraft, setOfferingDraft] = useState('');
  const [isPending, startTransition] = useTransition();

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };
  const toggleLookingFor = (tag: string) => {
    setLookingFor((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const addInterest = () => {
    const v = interestDraft.trim();
    if (!v || interests.includes(v) || interests.length >= 20) return;
    setInterests([...interests, v]);
    setInterestDraft('');
  };
  const addLookingFor = () => {
    const v = lookingForDraft.trim();
    if (!v || lookingFor.includes(v) || lookingFor.length >= 10) return;
    setLookingFor([...lookingFor, v]);
    setLookingForDraft('');
  };
  const addOffering = () => {
    const v = offeringDraft.trim();
    if (!v || offerings.includes(v) || offerings.length >= 8) return;
    setOfferings([...offerings, v]);
    setOfferingDraft('');
  };
  const toggleOffering = (tag: string) =>
    setOfferings((prev) => prev.filter((t) => t !== tag));

  const addLanguage = (code: string) => {
    if (languages.some((l) => l.code === code)) return;
    if (languages.length >= 8) return;
    setLanguages([...languages, { code, level: 'conversation' }]);
  };
  const removeLanguage = (code: string) => {
    setLanguages(languages.filter((l) => l.code !== code));
  };
  const updateLanguageLevel = (code: string, level: LanguageLevel) => {
    setLanguages(languages.map((l) => (l.code === code ? { ...l, level } : l)));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateResidentProfile({
        // homeCountry はもう聞かない（駐在員は実質日本固定）。後方互換のため undefined を送る
        homeCountry: undefined,
        homeRegion: homeRegion || undefined,
        residencyCountry: residencyCountry || undefined,
        residencyCity: residencyCity || undefined,
        // バケット → 西暦に変換して保存
        arrivalYear: yearBucket === '' ? undefined : arrivalYearFromBucket(yearBucket),
        familyStage: familyStage || undefined,
        occupation: occupation || undefined,
        coverImageUrl: coverImageUrl || undefined,
        offerings,
        languages,
        interests,
        lookingFor,
        openToMeetups,
      });
      if (res.ok) {
        toast.success('駐在員プロフィールを保存しました');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-md bg-card p-5 ring-1 ring-border sm:p-6"
    >
      <header>
        <h3 className="text-[15px] font-semibold tracking-tight">
          駐在員プロフィール
        </h3>
        <p className="mt-1 text-[12px] text-foreground/60">
          /residents の住人検索で表示されます。<span className="text-foreground/70 font-medium">埋めるほどマッチしやすくなります</span>が、すべて任意です。
        </p>
      </header>

      {/* 出身地 / 在住地（すべてドロップダウン） */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            出身（都道府県）
          </label>
          <select
            value={homeRegion}
            onChange={(e) => setHomeRegion(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="">— 選択しない —</option>
            {JP_PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            在住国
          </label>
          <select
            value={residencyCountry}
            onChange={(e) => {
              setResidencyCountry(e.target.value);
              // 国が変わったら都市はリセット（その国に存在しない可能性が高いため）
              setResidencyCity('');
            }}
            className="h-10 w-full rounded-md border border-border bg-background px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="">— 選択しない —</option>
            {RESIDENCE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            在住都市
          </label>
          <select
            value={residencyCity}
            onChange={(e) => setResidencyCity(e.target.value)}
            disabled={!residencyCountry}
            className="h-10 w-full rounded-md border border-border bg-background px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              {residencyCountry ? '— 選択しない —' : '先に在住国を選択'}
            </option>
            {(RESIDENCE_CITIES_BY_COUNTRY[residencyCountry] ?? []).map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            在住年数
          </label>
          <select
            value={yearBucket}
            onChange={(e) =>
              setYearBucket(e.target.value as ResidenceYearBucket | '')
            }
            className="h-10 w-full rounded-md border border-border bg-background px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="">— 選択しない —</option>
            {RESIDENCE_YEAR_OPTIONS.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            家族構成
          </label>
          <select
            value={familyStage}
            onChange={(e) => setFamilyStage(e.target.value as FamilyStage | '')}
            className="h-10 w-full rounded-md border border-border bg-background px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="">— 選択しない —</option>
            {FAMILY_STAGES.map((s) => (
              <option key={s} value={s}>
                {FAMILY_STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 業種 */}
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          業種・職業
        </label>
        <Input
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          placeholder="例: ヴィンテージバイヤー / スタイリスト"
          maxLength={80}
        />
        <p className="mt-1 text-[11px] text-foreground/55">
          プロフィール上部に大きく表示されます。
        </p>
      </div>

      {/* ヘッダー画像 */}
      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          ヘッダー画像（URL）
        </label>
        <Input
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="https://… プロフィール上部の背景写真"
          maxLength={2048}
          type="url"
        />
        <p className="mt-1 text-[11px] text-foreground/55">
          プロフィールのヒーロー背景になります。未設定でもライムのネットワーク演出が表示されます。
        </p>
      </div>

      {/* こんな相談に乗れます */}
      <TagPicker
        label="こんな相談に乗れます"
        helper="提供できることを短い文で。タグより具体的に書くほど相談につながります（最大 8 個）。"
        presets={[]}
        selected={offerings}
        onToggle={toggleOffering}
        draft={offeringDraft}
        setDraft={setOfferingDraft}
        onAdd={addOffering}
        limit={8}
        maxInputLen={120}
      />

      {/* 言語 */}
      <div>
        <label className="mb-2 block text-[12px] font-medium text-foreground/70">
          話せる言語
        </label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {COMMON_LANGUAGES.filter(
            (l) => !languages.some((x) => x.code === l.code),
          ).map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => addLanguage(l.code)}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground/70 hover:bg-primary-500/15 hover:text-primary-300"
            >
              <Plus className="h-3 w-3" /> {l.label}
            </button>
          ))}
        </div>
        {languages.length > 0 ? (
          <ul className="space-y-1.5">
            {languages.map((l) => {
              const label =
                COMMON_LANGUAGES.find((x) => x.code === l.code)?.label ?? l.code;
              return (
                <li key={l.code} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-[12px] font-medium">
                    {label}
                  </span>
                  <select
                    value={l.level}
                    onChange={(e) =>
                      updateLanguageLevel(l.code, e.target.value as LanguageLevel)
                    }
                    className="h-8 flex-1 rounded-sm border border-border bg-background px-2 text-[12px]"
                  >
                    {LANGUAGE_LEVELS.map((lv) => (
                      <option key={lv} value={lv}>
                        {LANGUAGE_LEVEL_LABEL[lv]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="削除"
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
      </div>

      {/* 興味 */}
      <TagPicker
        label="興味・趣味"
        helper="共通の趣味は最大のアイスブレイク。プリセットから選ぶか、自由入力できます。"
        presets={[...INTEREST_PRESETS]}
        selected={interests}
        onToggle={toggleInterest}
        draft={interestDraft}
        setDraft={setInterestDraft}
        onAdd={addInterest}
        limit={20}
      />

      {/* 探していること */}
      <TagPicker
        label="探していること"
        helper="「ママ友募集」「ワイン仲間」など、はっきり書くほど声をかけてもらいやすくなります。"
        presets={[...LOOKING_FOR_PRESETS]}
        selected={lookingFor}
        onToggle={toggleLookingFor}
        draft={lookingForDraft}
        setDraft={setLookingForDraft}
        onAdd={addLookingFor}
        limit={10}
      />

      {/* 気軽に会える */}
      <label className="flex cursor-pointer items-start gap-3 rounded-md bg-primary-500/5 p-3 ring-1 ring-border">
        <input
          type="checkbox"
          checked={openToMeetups}
          onChange={(e) => setOpenToMeetups(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <div className="flex-1">
          <p className="text-[13px] font-semibold">気軽に会える</p>
          <p className="mt-0.5 text-[11px] text-foreground/65">
            ON にすると /residents の「会える人だけ」フィルタに引っかかります。コーヒー1杯くらいの軽い交流に OK な人向け。
          </p>
        </div>
      </label>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? '保存中…' : '駐在員プロフィールを保存'}
        </Button>
      </div>
    </form>
  );
}

function TagPicker({
  label,
  helper,
  presets,
  selected,
  onToggle,
  draft,
  setDraft,
  onAdd,
  limit,
  maxInputLen = 30,
}: {
  label: string;
  helper: string;
  presets: string[];
  selected: string[];
  onToggle: (t: string) => void;
  draft: string;
  setDraft: (v: string) => void;
  onAdd: () => void;
  limit: number;
  maxInputLen?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-foreground/70">
        {label}
        <span className="ml-1 text-[10px] font-normal text-foreground/45">
          ({selected.length}/{limit})
        </span>
      </label>
      <p className="mb-2 text-[11px] text-foreground/55">{helper}</p>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const on = selected.includes(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => onToggle(p)}
              className={
                'rounded-full px-2.5 py-1 text-[11px] font-medium transition ' +
                (on
                  ? 'bg-primary-500 text-neutral-950'
                  : 'bg-muted text-foreground/70 hover:bg-primary-500/15 hover:text-primary-300')
              }
            >
              {p}
            </button>
          );
        })}
      </div>
      {/* カスタム入力 */}
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
          maxLength={maxInputLen}
          placeholder="自由追加（Enter で確定）"
          className="h-8 flex-1 rounded-sm border border-border bg-background px-2 text-[12px] focus:border-2 focus:border-primary-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground ring-1 ring-border hover:bg-muted"
        >
          追加
        </button>
      </div>
      {/* 選択済みのうちプリセット外 = ユーザーが追加したもの */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {selected
          .filter((s) => !presets.includes(s))
          .map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2 py-0.5 text-[11px] font-medium text-primary-300"
            >
              {s}
              <button
                type="button"
                aria-label="削除"
                onClick={() => onToggle(s)}
                className="rounded-full p-0.5 hover:bg-primary-500/30"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
      </div>
    </div>
  );
}
