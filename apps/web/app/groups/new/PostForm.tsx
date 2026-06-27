'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createCommunityPost } from '@/lib/community/actions';
import { ContactEmailField } from '@/components/community/ContactEmailField';
import { ContactLeakWarning } from '@/components/community/CommunityDisclaimer';
import type { CommunityAudience } from '@/lib/community/constants';

type GroupCategory =
  | 'sport'
  | 'study'
  | 'hobby'
  | 'parenting'
  | 'language'
  | 'other';
const GROUP_CATEGORIES: GroupCategory[] = [
  'sport',
  'study',
  'hobby',
  'parenting',
  'language',
  'other',
];
const GROUP_CATEGORY_LABEL: Record<GroupCategory, string> = {
  sport: 'スポーツ',
  study: '勉強会',
  hobby: '趣味',
  parenting: '子育て',
  language: '言語交換',
  other: 'その他',
};

type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'one_off' | 'flexible';
const FREQUENCIES: Frequency[] = ['weekly', 'biweekly', 'monthly', 'one_off', 'flexible'];
const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: '毎週',
  biweekly: '隔週',
  monthly: '月 1 回',
  one_off: '単発',
  flexible: '随時',
};

type Level = 'beginner' | 'intermediate' | 'advanced' | 'any';
const LEVELS: Level[] = ['any', 'beginner', 'intermediate', 'advanced'];
const LEVEL_LABEL: Record<Level, string> = {
  any: 'レベル問わず',
  beginner: '初心者',
  intermediate: '中級',
  advanced: '上級',
};

export function PostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const audience: CommunityAudience = 'both';
  const [category, setCategory] = useState<GroupCategory>('hobby');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [skillLevel, setSkillLevel] = useState<Level>('any');
  const [groupSize, setGroupSize] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [locationText, setLocationText] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [body, setBody] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (t.length < 4) {
      toast.error('タイトルは 2 文字以上にしてください');
      return;
    }
    if (b.length < 20) {
      toast.error('本文は 10 文字以上にしてください');
      return;
    }
    const sizeNum = groupSize ? Number(groupSize) : null;
    if (sizeNum !== null && (!Number.isFinite(sizeNum) || sizeNum < 1 || sizeNum > 500)) {
      toast.error('規模は 1〜500 の数値で入力してください');
      return;
    }
    const feeNum = feeAmount ? Number(feeAmount) : null;
    if (feeNum !== null && (!Number.isFinite(feeNum) || feeNum < 0)) {
      toast.error('会費は 0 以上の数値で入力してください');
      return;
    }

    startTransition(async () => {
      const res = await createCommunityPost({
        kind: 'group',
        title: t,
        body: b,
        locationText: locationText.trim() || null,
        priceAmount: feeNum,
        priceCurrency: 'EUR',
        priceUnit: feeNum !== null ? 'monthly' : null,
        photos: [],
        contactEmail: contactEmail.trim() || undefined,
        metadata: {
          category,
          meeting_frequency: frequency,
          skill_level: skillLevel,
          group_size: sizeNum ?? undefined,
          age_range: ageRange.trim() || undefined,
          audience,
        },
      });
      if (res.ok && res.data) {
        toast.success('募集を公開しました');
        router.push(res.data.path);
        router.refresh();
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">

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
          placeholder="ブローニュの森で朝ラン仲間募集（土曜 8 時）"
        />
        <p className="mt-0.5 text-right text-[10px] text-foreground/45">
          {title.length} / 140
        </p>
      </div>

      <div>
        <label htmlFor="category" className="block text-[12px] font-bold text-foreground">
          カテゴリ <span className="text-danger-500">*</span>
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as GroupCategory)}
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        >
          {GROUP_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {GROUP_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="frequency"
            className="block text-[12px] font-bold text-foreground"
          >
            活動頻度
          </label>
          <select
            id="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
            className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABEL[f]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="level" className="block text-[12px] font-bold text-foreground">
            レベル
          </label>
          <select
            id="level"
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value as Level)}
            className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="size" className="block text-[12px] font-bold text-foreground">
            想定規模 <span className="font-normal text-foreground/55">（任意）</span>
          </label>
          <input
            id="size"
            type="number"
            value={groupSize}
            onChange={(e) => setGroupSize(e.target.value)}
            min={1}
            max={500}
            className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] tabular focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
            placeholder="6"
          />
        </div>
        <div>
          <label htmlFor="age" className="block text-[12px] font-bold text-foreground">
            対象年齢層 <span className="font-normal text-foreground/55">（任意）</span>
          </label>
          <input
            id="age"
            type="text"
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            maxLength={60}
            className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
            placeholder="30〜40 代 / 未就学児ママ など"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="locationText"
          className="block text-[12px] font-bold text-foreground"
        >
          活動場所 / 区 <span className="font-normal text-foreground/55">（任意）</span>
        </label>
        <input
          id="locationText"
          type="text"
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          maxLength={140}
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          placeholder="16区 ブローニュの森周辺"
        />
      </div>

      <div>
        <label htmlFor="fee" className="block text-[12px] font-bold text-foreground">
          会費（月額・€） <span className="font-normal text-foreground/55">（任意）</span>
        </label>
        <input
          id="fee"
          type="number"
          value={feeAmount}
          onChange={(e) => setFeeAmount(e.target.value)}
          min={0}
          step={1}
          className="mt-1.5 w-32 rounded-md border border-border bg-card px-3 py-2 text-[14px] tabular focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          placeholder="0"
        />
      </div>

      <ContactLeakWarning />

      <div>
        <label htmlFor="body" className="block text-[12px] font-bold text-foreground">
          活動内容 <span className="text-danger-500">*</span>
        </label>
        <p className="mt-0.5 text-[11px] text-foreground/55">
          活動の流れ、雰囲気、求める仲間像など。Markdown 記法も使えます。
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
            '【活動内容】\n土曜朝 8:00 から、ブローニュの森を 5〜8 km 走ります。\n\n【ペース】キロ 6〜7 分の会話できるペース。\n\n【こんな方歓迎】\n・ゆるくランを続けたい方\n・ブランチ後の散歩でもOK'
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
          onClick={() => router.push('/groups')}
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
