'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import { createCommunityPost } from '@/lib/community/actions';
import { ContactEmailField } from '@/components/community/ContactEmailField';
import { PhotoUploader } from '@/components/community/PhotoUploader';
import {
  JOB_EMPLOYMENT_TYPES,
  JOB_EMPLOYMENT_TYPE_LABEL,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABEL,
  JOB_CONTRACT_TYPES,
  JOB_CONTRACT_TYPE_LABEL,
  JOB_INDUSTRIES,
  JOB_INDUSTRY_LABEL,
  JOB_REMOTE_TYPES,
  JOB_REMOTE_TYPE_LABEL,
  JOB_LANGUAGE_LEVELS,
  JOB_LANGUAGE_LEVEL_LABEL,
  JOB_JAPANESE_OK_LABEL,
  JOB_BENEFITS,
  type JobEmploymentType,
  type JobCategory,
  type JobContractType,
  type JobIndustry,
  type JobRemoteType,
  type JobLanguageLevel,
  type JobJapaneseOk,
  type CommunityAudience,
} from '@/lib/community/constants';

type Lang = 'ja' | 'fr' | 'en';
const LANG_LABEL: Record<Lang, string> = {
  ja: '日本語',
  fr: 'フランス語',
  en: '英語',
};

type SalaryPeriod = 'annual' | 'monthly' | 'hourly' | 'negotiable';
const SALARY_PERIOD_LABEL: Record<SalaryPeriod, string> = {
  annual: '年収',
  monthly: '月給',
  hourly: '時給',
  negotiable: '応相談',
};

const formSchema = z.object({
  title: z.string().trim().min(2, 'タイトルは 2 文字以上').max(140, 'タイトルは 140 文字以内'),
  body: z.string().trim().min(10, '本文は 10 文字以上').max(8000, '本文は 8000 文字以内'),
  locationText: z.string().trim().max(140).optional(),
  notes: z.string().trim().max(500).optional(),
});

/** 改行区切りテキストを配列に。空行は除外、最大件数で切る */
function linesToArray(text: string, max = 20): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max);
}

const FIELD_CLS =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none';
const LABEL_CLS = 'block text-[12px] font-bold text-foreground';
const SECTION_TITLE_CLS =
  'text-[11px] font-bold uppercase tracking-[0.14em] text-primary-300';

/** 求人投稿フォーム（募集者目線） */
export function JobPostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // --- 基本 ---
  const [title, setTitle] = useState('');
  const audience: CommunityAudience = 'both';
  const [employmentType, setEmploymentType] =
    useState<JobEmploymentType>('part_time');
  const [category, setCategory] = useState<JobCategory>('office');
  const [industry, setIndustry] = useState<JobIndustry | ''>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [locationText, setLocationText] = useState('');
  const [remoteType, setRemoteType] = useState<JobRemoteType | ''>('');

  // --- 契約 / 給与 ---
  const [contractType, setContractType] = useState<JobContractType | ''>('');
  const [trialPeriod, setTrialPeriod] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [salaryMax, setSalaryMax] = useState<string>('');
  const [currency, setCurrency] = useState<'EUR' | 'JPY'>('EUR');
  const [salaryPeriod, setSalaryPeriod] = useState<SalaryPeriod>('monthly');
  const [salaryKind, setSalaryKind] = useState<'gross' | 'net'>('gross');
  const [salaryNetNote, setSalaryNetNote] = useState('');

  // --- 勤務条件 ---
  const [hoursPerWeek, setHoursPerWeek] = useState<string>('');
  const [holidays, setHolidays] = useState('');
  const [overtime, setOvertime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [smokingPolicy, setSmokingPolicy] = useState('');

  // --- 求める人材 / 語学 ---
  const [essentialSkills, setEssentialSkills] = useState('');
  const [preferredSkills, setPreferredSkills] = useState('');
  const [langs, setLangs] = useState<Lang[]>(['ja']);
  // 言語ごとのレベル / 必須
  const [langLevel, setLangLevel] = useState<Record<Lang, JobLanguageLevel | ''>>({
    ja: '',
    fr: '',
    en: '',
  });
  const [langRequired, setLangRequired] = useState<Record<Lang, boolean>>({
    ja: false,
    fr: false,
    en: false,
  });
  const [japaneseOk, setJapaneseOk] = useState<JobJapaneseOk | ''>('');
  const [visaSponsorship, setVisaSponsorship] = useState(false);
  const [experienceRequired, setExperienceRequired] = useState(false);

  // --- 待遇 ---
  const [benefits, setBenefits] = useState<string[]>([]);

  // --- 業務 / 選考 ---
  const [jobDuties, setJobDuties] = useState('');
  const [selectionSteps, setSelectionSteps] = useState('');

  // --- 会社 / 募集 ---
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [companyFounded, setCompanyFounded] = useState('');
  const [japaneseStaff, setJapaneseStaff] = useState(false);
  const [openPositions, setOpenPositions] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [urgent, setUrgent] = useState(false);

  // --- 本文 / その他 ---
  const [remoteOk, setRemoteOk] = useState(false);
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const toggleLang = (l: Lang) => {
    setLangs((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l],
    );
  };

  const toggleBenefit = (key: string) => {
    setBenefits((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse({
      title,
      body,
      locationText: locationText.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? '入力内容に不備があります');
      return;
    }

    const hpwNum = hoursPerWeek ? Number(hoursPerWeek) : undefined;
    if (hpwNum !== undefined && (!Number.isFinite(hpwNum) || hpwNum < 1 || hpwNum > 80)) {
      toast.error('週の労働時間は 1〜80 の数値で入力してください');
      return;
    }
    const amountNum = amount ? Number(amount) : undefined;
    if (amountNum !== undefined && (!Number.isFinite(amountNum) || amountNum < 0)) {
      toast.error('給与金額が不正です');
      return;
    }
    const salaryMaxNum = salaryMax ? Number(salaryMax) : undefined;
    if (salaryMaxNum !== undefined && (!Number.isFinite(salaryMaxNum) || salaryMaxNum < 0)) {
      toast.error('給与上限が不正です');
      return;
    }
    if (amountNum !== undefined && salaryMaxNum !== undefined && salaryMaxNum < amountNum) {
      toast.error('給与上限は下限以上にしてください');
      return;
    }
    const openPosNum = openPositions ? Number(openPositions) : undefined;
    if (openPosNum !== undefined && (!Number.isFinite(openPosNum) || openPosNum < 1)) {
      toast.error('募集人数は 1 以上の数値で入力してください');
      return;
    }

    // 価格単位は salary_period にあわせる（応相談 → undefined）
    const priceUnit =
      salaryPeriod === 'negotiable'
        ? 'negotiable'
        : salaryPeriod === 'annual'
          ? 'annual'
          : salaryPeriod === 'monthly'
            ? 'monthly'
            : 'hourly';

    // 語学レベル配列 (レベル選択済みの言語のみ)
    const languageLevels = (['ja', 'fr', 'en'] as Lang[])
      .filter((l) => langLevel[l])
      .map((l) => ({
        lang: l,
        level: langLevel[l] as JobLanguageLevel,
        required: langRequired[l],
      }));

    // 選考の流れ: 各行を {title} に。
    const steps = linesToArray(selectionSteps, 10).map((t) => ({ title: t }));

    startTransition(async () => {
      const res = await createCommunityPost({
        kind: 'job',
        title: parsed.data.title,
        body: parsed.data.body,
        locationText: parsed.data.locationText ?? null,
        priceAmount: amountNum ?? null,
        priceCurrency: currency,
        priceUnit,
        photos,
        contactEmail: contactEmail.trim() || undefined,
        metadata: {
          // 既存
          employment_type: employmentType,
          category,
          salary_period: salaryPeriod,
          language_requirements: langs,
          remote_ok: remoteOk || (remoteType !== '' && remoteType !== 'onsite'),
          hours_per_week: hpwNum,
          experience_required: experienceRequired,
          notes: parsed.data.notes,
          audience,
          // 拡張 (空は undefined にして metadata を膨らませない)
          contract_type: contractType || undefined,
          trial_period: trialPeriod.trim() || undefined,
          industry: industry || undefined,
          salary_max: salaryMaxNum,
          salary_kind: salaryKind,
          salary_net_note: salaryNetNote.trim() || undefined,
          remote_type: remoteType || undefined,
          holidays: holidays.trim() || undefined,
          overtime: overtime.trim() || undefined,
          start_date: startDate.trim() || undefined,
          smoking_policy: smokingPolicy.trim() || undefined,
          essential_skills: essentialSkills.trim() ? linesToArray(essentialSkills) : undefined,
          preferred_skills: preferredSkills.trim() ? linesToArray(preferredSkills) : undefined,
          language_levels: languageLevels.length > 0 ? languageLevels : undefined,
          japanese_language_ok: japaneseOk || undefined,
          visa_sponsorship: visaSponsorship || undefined,
          job_duties: jobDuties.trim() ? linesToArray(jobDuties) : undefined,
          benefits: benefits.length > 0 ? benefits : undefined,
          selection_steps: steps.length > 0 ? steps : undefined,
          open_positions: openPosNum,
          application_deadline: applicationDeadline || undefined,
          urgent: urgent || undefined,
          company_name: companyName.trim() || undefined,
          company_size: companySize.trim() || undefined,
          company_founded: companyFounded.trim() || undefined,
          japanese_staff: japaneseStaff || undefined,
        },
      });

      if (res.ok && res.data) {
        toast.success('求人を公開しました');
        router.push(res.data.path);
        router.refresh();
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* ============ 基本 ============ */}
      <fieldset className="space-y-5">
        <legend className={SECTION_TITLE_CLS}>基本</legend>

        {/* タイトル */}
        <div>
          <label htmlFor="title" className={LABEL_CLS}>
            タイトル <span className="text-danger-500">*</span>
          </label>
          <p className="mt-0.5 text-[11px] text-foreground/55">
            職種と特徴が一目でわかる短い文（例: 11区 和食レストランでホール業務 / 週末のみ可）
          </p>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            required
            className={`mt-1.5 ${FIELD_CLS}`}
            placeholder="11区 République 駅徒歩 5 分、日系オフィスでの事務職"
          />
          <p className="mt-0.5 text-right text-[10px] text-foreground/45">
            {title.length} / 140
          </p>
        </div>

        {/* 雇用形態 */}
        <fieldset>
          <legend className={LABEL_CLS}>
            雇用形態 <span className="text-danger-500">*</span>
          </legend>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {JOB_EMPLOYMENT_TYPES.map((t) => (
              <label
                key={t}
                className={
                  'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-2 text-[12px] font-medium transition ' +
                  (employmentType === t
                    ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                    : 'border-border bg-card text-foreground/70 hover:border-foreground/30')
                }
              >
                <input
                  type="radio"
                  name="employment_type"
                  value={t}
                  checked={employmentType === t}
                  onChange={() => setEmploymentType(t)}
                  className="sr-only"
                />
                {JOB_EMPLOYMENT_TYPE_LABEL[t]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* 職種 */}
          <div>
            <label htmlFor="category" className={LABEL_CLS}>
              職種カテゴリ <span className="text-danger-500">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as JobCategory)}
              className={`mt-1.5 ${FIELD_CLS}`}
            >
              {JOB_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {JOB_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          {/* 業種 */}
          <div>
            <label htmlFor="industry" className={LABEL_CLS}>
              業種 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <select
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value as JobIndustry | '')}
              className={`mt-1.5 ${FIELD_CLS}`}
            >
              <option value="">選択しない</option>
              {JOB_INDUSTRIES.map((c) => (
                <option key={c} value={c}>
                  {JOB_INDUSTRY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* 勤務地 */}
          <div>
            <label htmlFor="locationText" className={LABEL_CLS}>
              勤務地 / 区
            </label>
            <input
              id="locationText"
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              maxLength={140}
              className={`mt-1.5 ${FIELD_CLS}`}
              placeholder="11区 République 駅徒歩 5 分"
            />
          </div>
          {/* リモート形態 */}
          <div>
            <label htmlFor="remoteType" className={LABEL_CLS}>
              リモート形態 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <select
              id="remoteType"
              value={remoteType}
              onChange={(e) => setRemoteType(e.target.value as JobRemoteType | '')}
              className={`mt-1.5 ${FIELD_CLS}`}
            >
              <option value="">選択しない</option>
              {JOB_REMOTE_TYPES.map((c) => (
                <option key={c} value={c}>
                  {JOB_REMOTE_TYPE_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 写真（仕事の様子） */}
        <div>
          <label className={LABEL_CLS}>
            写真（仕事の様子） <span className="font-normal text-foreground/55">（任意・最大 12 枚）</span>
          </label>
          <p className="mb-2 mt-0.5 text-[11px] text-foreground/55">
            職場やチーム、店舗の雰囲気が伝わる写真を添えると応募が集まりやすくなります。1 枚目が詳細ページのヒーロー画像になります。
          </p>
          <PhotoUploader photos={photos} onChange={setPhotos} maxPhotos={12} />
        </div>
      </fieldset>

      {/* ============ 契約 / 給与 ============ */}
      <fieldset className="space-y-5 border-t border-border pt-5">
        <legend className={SECTION_TITLE_CLS}>契約・給与</legend>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="contractType" className={LABEL_CLS}>
              契約形態 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <select
              id="contractType"
              value={contractType}
              onChange={(e) => setContractType(e.target.value as JobContractType | '')}
              className={`mt-1.5 ${FIELD_CLS}`}
            >
              <option value="">選択しない</option>
              {JOB_CONTRACT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {JOB_CONTRACT_TYPE_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="trialPeriod" className={LABEL_CLS}>
              試用期間 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="trialPeriod"
              type="text"
              value={trialPeriod}
              onChange={(e) => setTrialPeriod(e.target.value)}
              maxLength={120}
              className={`mt-1.5 ${FIELD_CLS}`}
              placeholder="試用期間 3ヶ月"
            />
          </div>
        </div>

        {/* 給与 */}
        <fieldset>
          <legend className={LABEL_CLS}>給与</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label htmlFor="amount" className="block text-[10px] text-foreground/55">
                下限 / 金額
              </label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step={salaryPeriod === 'hourly' ? 1 : 100}
                disabled={salaryPeriod === 'negotiable'}
                className={`mt-1 tabular ${FIELD_CLS} disabled:opacity-50`}
                placeholder={salaryPeriod === 'hourly' ? '15' : '2400'}
              />
            </div>
            <div>
              <label htmlFor="salaryMax" className="block text-[10px] text-foreground/55">
                上限（任意）
              </label>
              <input
                id="salaryMax"
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                min={0}
                step={salaryPeriod === 'hourly' ? 1 : 100}
                disabled={salaryPeriod === 'negotiable'}
                className={`mt-1 tabular ${FIELD_CLS} disabled:opacity-50`}
                placeholder={salaryPeriod === 'hourly' ? '20' : '2900'}
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-[10px] text-foreground/55">
                通貨
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'EUR' | 'JPY')}
                className={`mt-1 ${FIELD_CLS}`}
              >
                <option value="EUR">EUR (€)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>
            <div>
              <label htmlFor="salaryPeriod" className="block text-[10px] text-foreground/55">
                期間
              </label>
              <select
                id="salaryPeriod"
                value={salaryPeriod}
                onChange={(e) => setSalaryPeriod(e.target.value as SalaryPeriod)}
                className={`mt-1 ${FIELD_CLS}`}
              >
                {(Object.keys(SALARY_PERIOD_LABEL) as SalaryPeriod[]).map((p) => (
                  <option key={p} value={p}>
                    {SALARY_PERIOD_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 額面 / 手取り */}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className="text-[11px] font-semibold text-foreground/60">給与の種別</span>
            {(['gross', 'net'] as const).map((k) => (
              <label
                key={k}
                className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-foreground/80"
              >
                <input
                  type="radio"
                  name="salary_kind"
                  checked={salaryKind === k}
                  onChange={() => setSalaryKind(k)}
                  className="h-4 w-4"
                />
                {k === 'gross' ? '額面（控除前）' : '手取り'}
              </label>
            ))}
          </div>

          <div className="mt-3">
            <label htmlFor="salaryNetNote" className="block text-[11px] text-foreground/55">
              手取り目安（任意・入力時のみ表示。自動計算はしません）
            </label>
            <input
              id="salaryNetNote"
              type="text"
              value={salaryNetNote}
              onChange={(e) => setSalaryNetNote(e.target.value)}
              maxLength={160}
              className={`mt-1 ${FIELD_CLS}`}
              placeholder="おおよそ €1,900〜2,300"
            />
          </div>
        </fieldset>
      </fieldset>

      {/* ============ 勤務条件 ============ */}
      <fieldset className="space-y-4 border-t border-border pt-5">
        <legend className={SECTION_TITLE_CLS}>勤務条件</legend>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="hpw" className={LABEL_CLS}>
              週の労働時間 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="hpw"
              type="number"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
              min={1}
              max={80}
              className={`mt-1.5 tabular ${FIELD_CLS}`}
              placeholder="35"
            />
          </div>
          <div>
            <label htmlFor="overtime" className={LABEL_CLS}>
              残業 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="overtime"
              type="text"
              value={overtime}
              onChange={(e) => setOvertime(e.target.value)}
              maxLength={160}
              className={`mt-1.5 ${FIELD_CLS}`}
              placeholder="月平均10時間程度"
            />
          </div>
          <div>
            <label htmlFor="holidays" className={LABEL_CLS}>
              休日 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="holidays"
              type="text"
              value={holidays}
              onChange={(e) => setHolidays(e.target.value)}
              maxLength={160}
              className={`mt-1.5 ${FIELD_CLS}`}
              placeholder="土日祝・有給25日＋RTT"
            />
          </div>
          <div>
            <label htmlFor="startDate" className={LABEL_CLS}>
              入社時期 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="startDate"
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              maxLength={120}
              className={`mt-1.5 ${FIELD_CLS}`}
              placeholder="2026年9月以降・相談可"
            />
          </div>
          <div>
            <label htmlFor="smokingPolicy" className={LABEL_CLS}>
              受動喫煙対策 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="smokingPolicy"
              type="text"
              value={smokingPolicy}
              onChange={(e) => setSmokingPolicy(e.target.value)}
              maxLength={120}
              className={`mt-1.5 ${FIELD_CLS}`}
              placeholder="屋内禁煙"
            />
          </div>
        </div>
      </fieldset>

      {/* ============ 求める人材 / 語学 ============ */}
      <fieldset className="space-y-4 border-t border-border pt-5">
        <legend className={SECTION_TITLE_CLS}>求める人材・語学</legend>

        <div>
          <label htmlFor="essentialSkills" className={LABEL_CLS}>
            応募資格（必須） <span className="font-normal text-foreground/55">（1 行に 1 項目）</span>
          </label>
          <textarea
            id="essentialSkills"
            value={essentialSkills}
            onChange={(e) => setEssentialSkills(e.target.value)}
            rows={4}
            className={`mt-1.5 leading-relaxed ${FIELD_CLS}`}
            placeholder={'日本語ネイティブレベル\nフランス語 中級以上\n基本的なPCスキル'}
          />
        </div>

        <div>
          <label htmlFor="preferredSkills" className={LABEL_CLS}>
            応募資格（歓迎） <span className="font-normal text-foreground/55">（1 行に 1 項目）</span>
          </label>
          <textarea
            id="preferredSkills"
            value={preferredSkills}
            onChange={(e) => setPreferredSkills(e.target.value)}
            rows={3}
            className={`mt-1.5 leading-relaxed ${FIELD_CLS}`}
            placeholder={'営業事務・貿易事務の経験\n英語でのコミュニケーション'}
          />
        </div>

        {/* 必要言語 */}
        <fieldset>
          <legend className={LABEL_CLS}>必要な言語</legend>
          <p className="mt-0.5 text-[11px] text-foreground/55">
            チェックで必要言語を指定。レベルを選ぶと詳細ページに 5 段階メーターを表示します。
          </p>
          <div className="mt-2 space-y-2">
            {(['ja', 'fr', 'en'] as Lang[]).map((l) => {
              const on = langs.includes(l);
              return (
                <div
                  key={l}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2"
                >
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-foreground/80">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleLang(l)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="w-16">{LANG_LABEL[l]}</span>
                  </label>
                  <select
                    value={langLevel[l]}
                    onChange={(e) =>
                      setLangLevel((prev) => ({
                        ...prev,
                        [l]: e.target.value as JobLanguageLevel | '',
                      }))
                    }
                    className="h-8 rounded-md border border-border bg-background px-2 text-[12px]"
                  >
                    <option value="">レベル未設定</option>
                    {JOB_LANGUAGE_LEVELS.map((lv) => (
                      <option key={lv} value={lv}>
                        {JOB_LANGUAGE_LEVEL_LABEL[lv]}
                      </option>
                    ))}
                  </select>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-foreground/70">
                    <input
                      type="checkbox"
                      checked={langRequired[l]}
                      onChange={(e) =>
                        setLangRequired((prev) => ({ ...prev, [l]: e.target.checked }))
                      }
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                    必須
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="japaneseOk" className={LABEL_CLS}>
              日本語の要否 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <select
              id="japaneseOk"
              value={japaneseOk}
              onChange={(e) => setJapaneseOk(e.target.value as JobJapaneseOk | '')}
              className={`mt-1.5 ${FIELD_CLS}`}
            >
              <option value="">選択しない</option>
              {(Object.keys(JOB_JAPANESE_OK_LABEL) as JobJapaneseOk[]).map((k) => (
                <option key={k} value={k}>
                  {JOB_JAPANESE_OK_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-foreground/80">
            <input
              type="checkbox"
              checked={visaSponsorship}
              onChange={(e) => setVisaSponsorship(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
            />
            ビザサポートあり
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-foreground/80">
            <input
              type="checkbox"
              checked={experienceRequired}
              onChange={(e) => setExperienceRequired(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
            />
            経験者優遇
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-foreground/80">
            <input
              type="checkbox"
              checked={remoteOk}
              onChange={(e) => setRemoteOk(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
            />
            リモート勤務可
          </label>
        </div>
      </fieldset>

      {/* ============ 待遇・福利厚生 ============ */}
      <fieldset className="space-y-3 border-t border-border pt-5">
        <legend className={SECTION_TITLE_CLS}>待遇・福利厚生</legend>
        <p className="text-[11px] text-foreground/55">該当する待遇にチェック</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {JOB_BENEFITS.map((b) => {
            const on = benefits.includes(b.key);
            return (
              <label
                key={b.key}
                className={
                  'flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-[12px] font-medium transition ' +
                  (on
                    ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                    : 'border-border bg-card text-foreground/70 hover:border-foreground/30')
                }
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleBenefit(b.key)}
                  className="sr-only"
                />
                {b.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ============ 業務 / 選考 ============ */}
      <fieldset className="space-y-4 border-t border-border pt-5">
        <legend className={SECTION_TITLE_CLS}>主な業務・選考</legend>

        <div>
          <label htmlFor="jobDuties" className={LABEL_CLS}>
            主な業務 <span className="font-normal text-foreground/55">（1 行に 1 項目）</span>
          </label>
          <textarea
            id="jobDuties"
            value={jobDuties}
            onChange={(e) => setJobDuties(e.target.value)}
            rows={4}
            className={`mt-1.5 leading-relaxed ${FIELD_CLS}`}
            placeholder={'受発注・見積書作成・納期調整\n日仏メール・電話対応\n請求・在庫データの入力と管理'}
          />
        </div>

        <div>
          <label htmlFor="selectionSteps" className={LABEL_CLS}>
            選考の流れ <span className="font-normal text-foreground/55">（1 行に 1 ステップ）</span>
          </label>
          <textarea
            id="selectionSteps"
            value={selectionSteps}
            onChange={(e) => setSelectionSteps(e.target.value)}
            rows={4}
            className={`mt-1.5 leading-relaxed ${FIELD_CLS}`}
            placeholder={'応募・書類選考\n一次面接（オンライン）\n二次面接（対面）\n内定・条件提示'}
          />
        </div>
      </fieldset>

      {/* ============ 募集・会社 ============ */}
      <fieldset className="space-y-4 border-t border-border pt-5">
        <legend className={SECTION_TITLE_CLS}>募集・会社</legend>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="openPositions" className={LABEL_CLS}>
              募集人数 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="openPositions"
              type="number"
              value={openPositions}
              onChange={(e) => setOpenPositions(e.target.value)}
              min={1}
              className={`mt-1.5 tabular ${FIELD_CLS}`}
              placeholder="1"
            />
          </div>
          <div>
            <label htmlFor="applicationDeadline" className={LABEL_CLS}>
              応募締切 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="applicationDeadline"
              type="date"
              value={applicationDeadline}
              onChange={(e) => setApplicationDeadline(e.target.value)}
              className={`mt-1.5 ${FIELD_CLS}`}
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex cursor-pointer items-center gap-2 pb-2 text-[12px] text-foreground/80">
              <input
                type="checkbox"
                checked={urgent}
                onChange={(e) => setUrgent(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
              />
              急募
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="companyName" className={LABEL_CLS}>
              会社名 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={120}
              className={`mt-1.5 ${FIELD_CLS}`}
              placeholder="Nakamura France S.A.S."
            />
          </div>
          <div>
            <label htmlFor="companySize" className={LABEL_CLS}>
              会社規模 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="companySize"
              type="text"
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              maxLength={80}
              className={`mt-1.5 ${FIELD_CLS}`}
              placeholder="従業員 7名"
            />
          </div>
          <div>
            <label htmlFor="companyFounded" className={LABEL_CLS}>
              設立 <span className="font-normal text-foreground/55">（任意）</span>
            </label>
            <input
              id="companyFounded"
              type="text"
              value={companyFounded}
              onChange={(e) => setCompanyFounded(e.target.value)}
              maxLength={40}
              className={`mt-1.5 ${FIELD_CLS}`}
              placeholder="2014年"
            />
          </div>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-foreground/80">
          <input
            type="checkbox"
            checked={japaneseStaff}
            onChange={(e) => setJapaneseStaff(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
          />
          日本人スタッフ在籍
        </label>
      </fieldset>

      {/* 本文の前の警告 */}
      <aside
        role="note"
        className="rounded-md border border-amber-500/40 bg-amber-50/60 p-3 text-[11px] leading-relaxed text-amber-900"
      >
        <p className="flex items-start gap-1.5 font-bold">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          差別的な条件設定は禁止です
        </p>
        <p className="mt-0.5 pl-5">
          国籍・性別・年齢・宗教・婚姻状況など、職務遂行に合理的関係のない属性による
          応募制限はフランス労働法・日本労働基準法ともに禁止されています。
          「日本語ネイティブ」のような業務上必要なスキル要件は問題ありませんが、
          「日本人のみ」「30 歳まで」等は記載しないでください。
        </p>
      </aside>

      {/* 個人連絡先警告 */}
      <ContactLeakWarning />

      {/* 本文 */}
      <div>
        <label htmlFor="body" className={LABEL_CLS}>
          本文 <span className="text-danger-500">*</span>
        </label>
        <p className="mt-0.5 text-[11px] text-foreground/55">
          仕事内容、職場の雰囲気などを丁寧に。詳細条件は上のフォームで指定できます。Markdown 記法も使えます。
        </p>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={8000}
          rows={12}
          required
          className={`mt-1.5 leading-relaxed ${FIELD_CLS}`}
          placeholder={
            '【業務内容】\n・受発注、請求書発行などの事務サポート\n\n【職場について】\n・チームは日本人3名・フランス人4名。社内の主要なやり取りは日本語でも進められます。'
          }
        />
        <p className="mt-0.5 text-right text-[10px] text-foreground/45">
          {body.length} / 8000
        </p>
      </div>

      {/* メモ */}
      <div>
        <label htmlFor="notes" className={LABEL_CLS}>
          会社紹介・補足メモ <span className="font-normal text-foreground/55">（任意）</span>
        </label>
        <p className="mt-0.5 text-[11px] text-foreground/55">
          詳細ページの会社カードに表示されます。職場の雰囲気、定着率、担当者からの一言など。
        </p>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={3}
          className={`mt-1.5 text-[13px] leading-relaxed ${FIELD_CLS}`}
        />
        <p className="mt-0.5 text-right text-[10px] text-foreground/45">
          {notes.length} / 500
        </p>
      </div>

      <ContactEmailField value={contactEmail} onChange={setContactEmail} />

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.push('/jobs')}
          className="rounded-full px-4 py-2 text-[12px] font-medium text-foreground/65 hover:bg-muted"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-primary-500 px-6 py-2.5 text-[13px] font-bold text-neutral-950 transition hover:bg-primary-300 disabled:opacity-50"
        >
          {isPending ? '公開中…' : '公開する'}
        </button>
      </div>
    </form>
  );
}

/** 個人連絡先を本文に書かないで注意（client 側で再利用するため自前で） */
function ContactLeakWarning() {
  return (
    <aside
      role="note"
      className="rounded-md border border-blue-500/30 bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-900"
    >
      <p className="font-bold">連絡は Locore メッセージで</p>
      <p className="mt-0.5">
        本文に電話番号・メールアドレス・LINE / WhatsApp 等の ID を書かないでください。
        応募者からの連絡は通知され、相手とやり取りした後にご自身の判断で個人連絡先を
        共有してください（個人情報の保護と詐欺被害の防止のため）。
      </p>
    </aside>
  );
}
