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

/**
 * 駐在員プロフィールの編集フォーム。
 *
 * 既存の ProfileForm（表示名 / bio / avatar）とは別カードで出して、
 * 「交流を促す情報」をオプトインで埋めてもらう設計。
 */

type Lang = { code: string; level: LanguageLevel };

type Props = {
  initial: {
    homeCountry: string;
    homeRegion: string;
    residencyCountry: string;
    residencyCity: string;
    arrivalYear: number | null;
    familyStage: FamilyStage | '';
    occupation: string;
    languages: Lang[];
    interests: string[];
    lookingFor: string[];
    openToMeetups: boolean;
  };
};

export function ResidentProfileForm({ initial }: Props) {
  const [homeCountry, setHomeCountry] = useState(initial.homeCountry || 'JP');
  const [homeRegion, setHomeRegion] = useState(initial.homeRegion);
  const [residencyCountry, setResidencyCountry] = useState(
    initial.residencyCountry,
  );
  const [residencyCity, setResidencyCity] = useState(initial.residencyCity);
  const [arrivalYear, setArrivalYear] = useState<number | ''>(
    initial.arrivalYear ?? '',
  );
  const [familyStage, setFamilyStage] = useState<FamilyStage | ''>(
    initial.familyStage,
  );
  const [occupation, setOccupation] = useState(initial.occupation);
  const [languages, setLanguages] = useState<Lang[]>(initial.languages);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [lookingFor, setLookingFor] = useState<string[]>(initial.lookingFor);
  const [openToMeetups, setOpenToMeetups] = useState(initial.openToMeetups);
  const [interestDraft, setInterestDraft] = useState('');
  const [lookingForDraft, setLookingForDraft] = useState('');
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
        homeCountry: homeCountry || undefined,
        homeRegion: homeRegion || undefined,
        residencyCountry: residencyCountry || undefined,
        residencyCity: residencyCity || undefined,
        arrivalYear: arrivalYear === '' ? undefined : Number(arrivalYear),
        familyStage: familyStage || undefined,
        occupation: occupation || undefined,
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

  const thisYear = new Date().getFullYear();

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

      {/* 出身地 / 在住地 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            出身地（県・都市）
          </label>
          <Input
            value={homeRegion}
            onChange={(e) => setHomeRegion(e.target.value)}
            placeholder="例: 東京都 / 大阪 / 福岡県"
            maxLength={80}
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            出身国（ISO 2 文字）
          </label>
          <Input
            value={homeCountry}
            onChange={(e) => setHomeCountry(e.target.value.toUpperCase())}
            placeholder="JP"
            maxLength={2}
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            在住国（ISO 2 文字）
          </label>
          <Input
            value={residencyCountry}
            onChange={(e) =>
              setResidencyCountry(e.target.value.toUpperCase())
            }
            placeholder="FR / US / DE"
            maxLength={2}
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            在住都市
          </label>
          <Input
            value={residencyCity}
            onChange={(e) => setResidencyCity(e.target.value)}
            placeholder="例: パリ / ベルリン / ハノイ"
            maxLength={80}
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            在住開始年
          </label>
          <Input
            type="number"
            inputMode="numeric"
            min={1950}
            max={thisYear + 1}
            value={arrivalYear}
            onChange={(e) =>
              setArrivalYear(e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder={`${thisYear - 3}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            家族構成
          </label>
          <select
            value={familyStage}
            onChange={(e) => setFamilyStage(e.target.value as FamilyStage | '')}
            className="h-10 w-full rounded-sm border border-border bg-background px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none"
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
          placeholder="例: IT エンジニア / 飲食 / 教育 / 駐在帯同"
          maxLength={80}
        />
      </div>

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
          maxLength={30}
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
