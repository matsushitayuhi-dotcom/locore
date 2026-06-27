'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createCommunityPost } from '@/lib/community/actions';
import { ContactLeakWarning } from '@/components/community/CommunityDisclaimer';
import { ContactEmailField } from '@/components/community/ContactEmailField';
import type { CommunityAudience } from '@/lib/community/constants';

type RequestType = 'offer' | 'need';
type Urgency = 'now' | 'this_week' | 'flexible';
const URGENCY_LABEL: Record<Urgency, string> = {
  now: '今すぐ',
  this_week: '今週中',
  flexible: '日程相談',
};
type Compensation = 'none' | 'small_thanks' | 'negotiable';
const COMPENSATION_LABEL: Record<Compensation, string> = {
  none: 'お礼不要',
  small_thanks: 'ちょっとしたお礼',
  negotiable: '相談',
};
type Category =
  | 'transport'
  | 'translation'
  | 'childcare'
  | 'pet_care'
  | 'admin_help'
  | 'moving_help'
  | 'other';
const CATEGORIES: Category[] = [
  'transport',
  'translation',
  'childcare',
  'pet_care',
  'admin_help',
  'moving_help',
  'other',
];
const CATEGORY_LABEL: Record<Category, string> = {
  transport: '送迎',
  translation: '翻訳',
  childcare: '子育て',
  pet_care: 'ペット',
  admin_help: '行政書類',
  moving_help: '引越し',
  other: 'その他',
};

export function PostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [requestType, setRequestType] = useState<RequestType>('need');
  const audience: CommunityAudience = 'both';
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('translation');
  const [urgency, setUrgency] = useState<Urgency>('flexible');
  const [compensation, setCompensation] = useState<Compensation>('small_thanks');
  const [locationText, setLocationText] = useState('');
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

    startTransition(async () => {
      const res = await createCommunityPost({
        kind: 'mutual_aid',
        title: t,
        body: b,
        locationText: locationText.trim() || null,
        priceAmount: null,
        priceCurrency: 'EUR',
        priceUnit: null,
        photos: [],
        contactEmail: contactEmail.trim() || undefined,
        metadata: {
          request_type: requestType,
          urgency,
          compensation,
          category,
          audience,
        },
      });
      if (res.ok && res.data) {
        toast.success('投稿しました');
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
          {(['need', 'offer'] as RequestType[]).map((t) => (
            <label
              key={t}
              className={
                'flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-[12px] font-medium transition ' +
                (requestType === t
                  ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                  : 'border-border bg-card text-foreground/70 hover:border-foreground/30')
              }
            >
              <input
                type="radio"
                name="request_type"
                value={t}
                checked={requestType === t}
                onChange={() => setRequestType(t)}
                className="sr-only"
              />
              {t === 'need' ? 'お願いしたい' : '申し出ます'}
            </label>
          ))}
        </div>
      </fieldset>


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
            requestType === 'need'
              ? 'CAF の書類フランス語翻訳をお願いしたい（A4 2 枚）'
              : '今週末、CDG 空港送迎します（無料）'
          }
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
          onChange={(e) => setCategory(e.target.value as Category)}
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      {/* urgency */}
      <fieldset>
        <legend className="text-[12px] font-bold text-foreground">緊急度</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {(['now', 'this_week', 'flexible'] as Urgency[]).map((u) => (
            <label
              key={u}
              className={
                'flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-[12px] font-medium transition ' +
                (urgency === u
                  ? u === 'now'
                    ? 'border-danger-500 bg-danger-500/10 text-danger-500'
                    : 'border-primary-500 bg-primary-500/10 text-primary-300'
                  : 'border-border bg-card text-foreground/70 hover:border-foreground/30')
              }
            >
              <input
                type="radio"
                name="urgency"
                value={u}
                checked={urgency === u}
                onChange={() => setUrgency(u)}
                className="sr-only"
              />
              {URGENCY_LABEL[u]}
            </label>
          ))}
        </div>
      </fieldset>

      {/* compensation */}
      <fieldset>
        <legend className="text-[12px] font-bold text-foreground">お礼</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {(['none', 'small_thanks', 'negotiable'] as Compensation[]).map((c) => (
            <label
              key={c}
              className={
                'flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-[12px] font-medium transition ' +
                (compensation === c
                  ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                  : 'border-border bg-card text-foreground/70 hover:border-foreground/30')
              }
            >
              <input
                type="radio"
                name="compensation"
                value={c}
                checked={compensation === c}
                onChange={() => setCompensation(c)}
                className="sr-only"
              />
              {COMPENSATION_LABEL[c]}
            </label>
          ))}
        </div>
      </fieldset>

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
          placeholder="13区 イタリー広場近辺"
        />
      </div>

      <ContactLeakWarning />

      <div>
        <label htmlFor="body" className="block text-[12px] font-bold text-foreground">
          詳細 <span className="text-danger-500">*</span>
        </label>
        <p className="mt-0.5 text-[11px] text-foreground/55">
          内容、希望日時、ご事情などを具体的に。Markdown 記法も使えます。
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
            requestType === 'need'
              ? '【内容】CAF からの書類（A4 2 枚）を日本語に翻訳いただきたいです\n【期限】今週末まで\n【お礼】カフェ代やちょっとした手土産程度を考えています'
              : '【内容】6/15（土）朝 9 時 CDG 空港着の方をお迎えに行きます\n【車】Renault Clio、スーツケース 2 個まで OK\n【場所】13 区方面なら帰宅ついでで OK'
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
          onClick={() => router.push('/help')}
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
