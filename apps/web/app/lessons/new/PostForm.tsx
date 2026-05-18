'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createCommunityPost } from '@/lib/community/actions';
import { ContactLeakWarning } from '@/components/community/CommunityDisclaimer';
import { ContactEmailField } from '@/components/community/ContactEmailField';
import { AudienceField } from '@/components/community/AudienceField';
import type { CommunityAudience } from '@/lib/community/constants';

type Side = 'teach' | 'learn';
type Format = 'in_person' | 'online' | 'both';
const FORMAT_LABEL: Record<Format, string> = {
  in_person: '対面',
  online: 'オンライン',
  both: '対面 / オンライン',
};
type Level = 'beginner' | 'intermediate' | 'advanced' | 'any';
const LEVEL_LABEL: Record<Level, string> = {
  any: 'レベル問わず',
  beginner: '初心者',
  intermediate: '中級',
  advanced: '上級',
};
type LessonCategory =
  | 'language'
  | 'music'
  | 'cooking'
  | 'art'
  | 'sport'
  | 'study_aid'
  | 'other';
const LESSON_CATEGORIES: LessonCategory[] = [
  'language',
  'music',
  'cooking',
  'art',
  'sport',
  'study_aid',
  'other',
];
const LESSON_CATEGORY_LABEL: Record<LessonCategory, string> = {
  language: '語学',
  music: '音楽',
  cooking: '料理',
  art: 'アート',
  sport: 'スポーツ',
  study_aid: '勉強サポート',
  other: 'その他',
};

type PriceUnit = 'per_session' | 'monthly' | 'hourly' | 'negotiable';
const PRICE_UNIT_LABEL: Record<PriceUnit, string> = {
  per_session: '1 回あたり',
  monthly: '月額',
  hourly: '時給',
  negotiable: '応相談',
};

export function PostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [side, setSide] = useState<Side>('teach');
  const [audience, setAudience] = useState<CommunityAudience>('resident');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<LessonCategory>('language');
  const [format, setFormat] = useState<Format>('in_person');
  const [level, setLevel] = useState<Level>('any');
  const [trialAvailable, setTrialAvailable] = useState(false);
  const [maxStudents, setMaxStudents] = useState('');
  const [locationText, setLocationText] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'JPY'>('EUR');
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('per_session');
  const [body, setBody] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (t.length < 4) {
      toast.error('タイトルは 4 文字以上にしてください');
      return;
    }
    if (b.length < 20) {
      toast.error('本文は 20 文字以上にしてください');
      return;
    }
    const amountNum = amount.trim() ? Number(amount) : null;
    if (amountNum !== null && (!Number.isFinite(amountNum) || amountNum < 0)) {
      toast.error('料金は 0 以上の数値で入力してください');
      return;
    }
    const maxStudentsNum = maxStudents ? Number(maxStudents) : null;
    if (
      maxStudentsNum !== null &&
      (!Number.isFinite(maxStudentsNum) || maxStudentsNum < 1 || maxStudentsNum > 50)
    ) {
      toast.error('最大人数は 1〜50 の数値で入力してください');
      return;
    }

    startTransition(async () => {
      const res = await createCommunityPost({
        kind: 'lesson',
        title: t,
        body: b,
        locationText: locationText.trim() || null,
        priceAmount: amountNum,
        priceCurrency: currency,
        priceUnit: priceUnit,
        photos: [],
        contactEmail: contactEmail.trim() || undefined,
        metadata: {
          side,
          category,
          format,
          level,
          trial_available: trialAvailable,
          max_students: maxStudentsNum ?? undefined,
          audience,
        },
      });
      if (res.ok && res.data) {
        toast.success('レッスンを公開しました');
        router.push(res.data.path);
        router.refresh();
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset>
        <legend className="text-[12px] font-bold text-foreground">
          投稿の種類 <span className="text-danger-500">*</span>
        </legend>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {(['teach', 'learn'] as Side[]).map((s) => (
            <label
              key={s}
              className={
                'flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-[12px] font-medium transition ' +
                (side === s
                  ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                  : 'border-border bg-card text-foreground/70 hover:border-foreground/30')
              }
            >
              <input
                type="radio"
                name="side"
                value={s}
                checked={side === s}
                onChange={() => setSide(s)}
                className="sr-only"
              />
              {s === 'teach' ? '教えます' : '習いたい'}
            </label>
          ))}
        </div>
      </fieldset>

      <AudienceField value={audience} onChange={setAudience} />

      <div>
        <label htmlFor="title" className="block text-[12px] font-bold text-foreground">
          タイトル <span className="text-danger-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          required
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          placeholder={
            side === 'teach'
              ? '子供向けかな・漢字レッスン（5〜10 歳）'
              : 'フランス語家庭教師を探しています（中級者）'
          }
        />
        <p className="mt-0.5 text-right text-[10px] text-foreground/45">
          {title.length} / 140
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="category"
            className="block text-[12px] font-bold text-foreground"
          >
            ジャンル <span className="text-danger-500">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as LessonCategory)}
            className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          >
            {LESSON_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {LESSON_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="format" className="block text-[12px] font-bold text-foreground">
            レッスン形式
          </label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value as Format)}
            className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          >
            {(['in_person', 'online', 'both'] as Format[]).map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABEL[f]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="level" className="block text-[12px] font-bold text-foreground">
            対象レベル
          </label>
          <select
            id="level"
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          >
            {(['any', 'beginner', 'intermediate', 'advanced'] as Level[]).map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="max" className="block text-[12px] font-bold text-foreground">
            最大人数 <span className="font-normal text-foreground/55">（任意）</span>
          </label>
          <input
            id="max"
            type="number"
            value={maxStudents}
            onChange={(e) => setMaxStudents(e.target.value)}
            min={1}
            max={50}
            className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] tabular focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
            placeholder="1"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="locationText"
          className="block text-[12px] font-bold text-foreground"
        >
          場所 / 区 <span className="font-normal text-foreground/55">（任意）</span>
        </label>
        <input
          id="locationText"
          type="text"
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          maxLength={140}
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          placeholder="15区 自宅 / Zoom など"
        />
      </div>

      <fieldset>
        <legend className="text-[12px] font-bold text-foreground">料金</legend>
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
              step={1}
              disabled={priceUnit === 'negotiable'}
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] tabular focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none disabled:opacity-50"
              placeholder="30"
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
            <label htmlFor="unit" className="block text-[10px] text-foreground/55">
              単位
            </label>
            <select
              id="unit"
              value={priceUnit}
              onChange={(e) => setPriceUnit(e.target.value as PriceUnit)}
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
            >
              {(Object.keys(PRICE_UNIT_LABEL) as PriceUnit[]).map((u) => (
                <option key={u} value={u}>
                  {PRICE_UNIT_LABEL[u]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-foreground/80">
        <input
          type="checkbox"
          checked={trialAvailable}
          onChange={(e) => setTrialAvailable(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
        />
        体験レッスンあり
      </label>

      <ContactLeakWarning />

      <div>
        <label htmlFor="body" className="block text-[12px] font-bold text-foreground">
          内容 <span className="text-danger-500">*</span>
        </label>
        <p className="mt-0.5 text-[11px] text-foreground/55">
          レッスンの流れ、使用教材、こんな方におすすめなど。Markdown 記法も使えます。
        </p>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={8000}
          rows={10}
          required
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] leading-relaxed focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          placeholder={
            side === 'teach'
              ? '【内容】ひらがな・カタカナ・初級漢字\n【教材】こちらで用意（基本料金に含む）\n【場所】15区の自宅 or オンライン\n【こんな方に】小学校低学年の漢字に取り組みたいお子さま'
              : '【希望内容】DELF B2 対策\n【現状】B1 取得済み、口頭表現を伸ばしたい\n【頻度】週 1 回、1 時間\n【希望】カフェ or Zoom、フランス人 / バイリンガル先生'
          }
        />
        <p className="mt-0.5 text-right text-[10px] text-foreground/45">
          {body.length} / 8000
        </p>
      </div>

      <ContactEmailField value={contactEmail} onChange={setContactEmail} />

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.push('/lessons')}
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
