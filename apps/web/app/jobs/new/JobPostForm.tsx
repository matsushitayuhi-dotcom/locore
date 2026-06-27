'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import { createCommunityPost } from '@/lib/community/actions';
import { ContactEmailField } from '@/components/community/ContactEmailField';
import {
  JOB_EMPLOYMENT_TYPES,
  JOB_EMPLOYMENT_TYPE_LABEL,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABEL,
  type JobEmploymentType,
  type JobCategory,
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

/** 求人投稿フォーム（募集者目線） */
export function JobPostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const audience: CommunityAudience = 'both';
  const [employmentType, setEmploymentType] =
    useState<JobEmploymentType>('part_time');
  const [category, setCategory] = useState<JobCategory>('office');
  const [locationText, setLocationText] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<'EUR' | 'JPY'>('EUR');
  const [salaryPeriod, setSalaryPeriod] = useState<SalaryPeriod>('monthly');
  const [hoursPerWeek, setHoursPerWeek] = useState<string>('');
  const [langs, setLangs] = useState<Lang[]>(['ja']);
  const [remoteOk, setRemoteOk] = useState(false);
  const [experienceRequired, setExperienceRequired] = useState(false);
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const toggleLang = (l: Lang) => {
    setLangs((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l],
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

    // 価格単位は salary_period にあわせる（応相談 → undefined）
    const priceUnit =
      salaryPeriod === 'negotiable'
        ? 'negotiable'
        : salaryPeriod === 'annual'
          ? 'annual'
          : salaryPeriod === 'monthly'
            ? 'monthly'
            : 'hourly';

    startTransition(async () => {
      const res = await createCommunityPost({
        kind: 'job',
        title: parsed.data.title,
        body: parsed.data.body,
        locationText: parsed.data.locationText ?? null,
        priceAmount: amountNum ?? null,
        priceCurrency: currency,
        priceUnit,
        photos: [],
        contactEmail: contactEmail.trim() || undefined,
        metadata: {
          employment_type: employmentType,
          category,
          salary_period: salaryPeriod,
          language_requirements: langs,
          remote_ok: remoteOk,
          hours_per_week: hpwNum,
          experience_required: experienceRequired,
          notes: parsed.data.notes,
          audience,
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
    <form onSubmit={onSubmit} className="space-y-5">
      {/* タイトル */}
      <div>
        <label htmlFor="title" className="block text-[12px] font-bold text-foreground">
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
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          placeholder="11区 République 駅徒歩 5 分、日系オフィスでの事務職"
        />
        <p className="mt-0.5 text-right text-[10px] text-foreground/45">
          {title.length} / 140
        </p>
      </div>


      {/* 雇用形態 */}
      <fieldset>
        <legend className="text-[12px] font-bold text-foreground">
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

      {/* 職種 */}
      <div>
        <label htmlFor="category" className="block text-[12px] font-bold text-foreground">
          職種カテゴリ <span className="text-danger-500">*</span>
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as JobCategory)}
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        >
          {JOB_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {JOB_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      {/* 勤務地 */}
      <div>
        <label
          htmlFor="locationText"
          className="block text-[12px] font-bold text-foreground"
        >
          勤務地 / 区
        </label>
        <input
          id="locationText"
          type="text"
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          maxLength={140}
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          placeholder="11区 République 駅徒歩 5 分"
        />
      </div>

      {/* 給与 */}
      <fieldset>
        <legend className="text-[12px] font-bold text-foreground">給与</legend>
        <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div>
            <label htmlFor="amount" className="block text-[10px] text-foreground/55">
              金額
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              step={salaryPeriod === 'hourly' ? 1 : 100}
              disabled={salaryPeriod === 'negotiable'}
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] tabular focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none disabled:opacity-50"
              placeholder={salaryPeriod === 'hourly' ? '15' : '35000'}
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
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
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
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
            >
              {(Object.keys(SALARY_PERIOD_LABEL) as SalaryPeriod[]).map((p) => (
                <option key={p} value={p}>
                  {SALARY_PERIOD_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* 週労働時間 */}
      <div>
        <label htmlFor="hpw" className="block text-[12px] font-bold text-foreground">
          週の労働時間 <span className="font-normal text-foreground/55">（任意）</span>
        </label>
        <input
          id="hpw"
          type="number"
          value={hoursPerWeek}
          onChange={(e) => setHoursPerWeek(e.target.value)}
          min={1}
          max={80}
          className="mt-1.5 w-32 rounded-md border border-border bg-card px-3 py-2 text-[14px] tabular focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          placeholder="35"
        />
      </div>

      {/* 必要言語 */}
      <fieldset>
        <legend className="text-[12px] font-bold text-foreground">必要な言語</legend>
        <p className="mt-0.5 text-[11px] text-foreground/55">
          応募に必要な言語スキルにチェック
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(['ja', 'fr', 'en'] as Lang[]).map((l) => {
            const on = langs.includes(l);
            return (
              <label
                key={l}
                className={
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition ' +
                  (on
                    ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                    : 'border-border bg-card text-foreground/70 hover:border-foreground/30')
                }
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleLang(l)}
                  className="sr-only"
                />
                {LANG_LABEL[l]}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* オプションのトグル */}
      <div className="flex flex-wrap gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-foreground/80">
          <input
            type="checkbox"
            checked={remoteOk}
            onChange={(e) => setRemoteOk(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
          />
          リモート勤務可
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
      </div>

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
        <label htmlFor="body" className="block text-[12px] font-bold text-foreground">
          本文 <span className="text-danger-500">*</span>
        </label>
        <p className="mt-0.5 text-[11px] text-foreground/55">
          仕事内容、勤務時間、応募条件などを丁寧に。Markdown 記法も使えます。
        </p>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={8000}
          rows={12}
          required
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] leading-relaxed focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          placeholder={
            '【業務内容】\n・受発注、請求書発行などの事務サポート\n\n【勤務条件】\n・週 3 日、9:00-17:00（応相談）\n\n【応募資格】\n・日本語ネイティブ、フランス語日常会話以上\n・在留資格をお持ちの方'
          }
        />
        <p className="mt-0.5 text-right text-[10px] text-foreground/45">
          {body.length} / 8000
        </p>
      </div>

      {/* メモ */}
      <div>
        <label htmlFor="notes" className="block text-[12px] font-bold text-foreground">
          追加メモ <span className="font-normal text-foreground/55">（任意）</span>
        </label>
        <p className="mt-0.5 text-[11px] text-foreground/55">
          在留資格サポート可、ビザスポンサー可、社員割引あり、など
        </p>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[13px] leading-relaxed focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
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
