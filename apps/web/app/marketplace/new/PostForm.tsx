'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createCommunityPost } from '@/lib/community/actions';
import { ContactEmailField } from '@/components/community/ContactEmailField';
import {
  MARKETPLACE_CONDITIONS,
  MARKETPLACE_CONDITION_LABEL,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CATEGORY_LABEL,
  type MarketplaceCondition,
  type MarketplaceCategory,
  type CommunityAudience,
} from '@/lib/community/constants';
import { ContactLeakWarning } from '@/components/community/CommunityDisclaimer';
import { PhotoUploader } from '@/components/community/PhotoUploader';

type Side = 'sell' | 'buy';

/** 売買投稿フォーム */
export function PostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [side, setSide] = useState<Side>('sell');
  const audience: CommunityAudience = 'both';
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory>('furniture');
  const [condition, setCondition] = useState<MarketplaceCondition>('good');
  const [locationText, setLocationText] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'JPY'>('EUR');
  const [negotiable, setNegotiable] = useState(false);
  const [pickupRequired, setPickupRequired] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
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
    // photos は PhotoUploader が Supabase Storage 経由でアップロード済の URL を持つ
    for (const url of photos) {
      try {
        new URL(url);
      } catch {
        toast.error(`写真 URL が不正です: ${url.slice(0, 40)}…`);
        return;
      }
    }
    const amountNum = amount.trim() ? Number(amount) : null;
    if (amountNum !== null && (!Number.isFinite(amountNum) || amountNum < 0)) {
      toast.error('価格は 0 以上の数値で入力してください');
      return;
    }

    startTransition(async () => {
      const res = await createCommunityPost({
        kind: 'marketplace',
        title: t,
        body: b,
        locationText: locationText.trim() || null,
        priceAmount: amountNum,
        priceCurrency: currency,
        priceUnit: negotiable ? 'negotiable' : amountNum !== null ? 'fixed' : 'negotiable',
        photos,
        contactEmail: contactEmail.trim() || undefined,
        metadata: {
          side,
          category,
          condition,
          pickup_required: pickupRequired,
          delivery_available: deliveryAvailable,
          audience,
        },
      });
      if (res.ok && res.data) {
        toast.success('出品しました');
        router.push(res.data.path);
        router.refresh();
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* side ラジオ */}
      <fieldset>
        <legend className="text-[12px] font-bold text-foreground">
          投稿の種類 <span className="text-danger-500">*</span>
        </legend>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {(['sell', 'buy'] as Side[]).map((s) => (
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
              {s === 'sell' ? '売ります' : '買います'}
            </label>
          ))}
        </div>
      </fieldset>


      {/* タイトル */}
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
          placeholder="IKEA ソファ（3 人掛け、ベージュ、2 年使用）"
        />
        <p className="mt-0.5 text-right text-[10px] text-foreground/45">
          {title.length} / 140
        </p>
      </div>

      {/* category & condition */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="category"
            className="block text-[12px] font-bold text-foreground"
          >
            カテゴリ <span className="text-danger-500">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as MarketplaceCategory)}
            className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          >
            {MARKETPLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {MARKETPLACE_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="condition"
            className="block text-[12px] font-bold text-foreground"
          >
            状態 <span className="text-danger-500">*</span>
          </label>
          <select
            id="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value as MarketplaceCondition)}
            className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          >
            {MARKETPLACE_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {MARKETPLACE_CONDITION_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 場所 */}
      <div>
        <label
          htmlFor="locationText"
          className="block text-[12px] font-bold text-foreground"
        >
          受け渡し場所 / 区 <span className="font-normal text-foreground/55">（任意）</span>
        </label>
        <input
          id="locationText"
          type="text"
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          maxLength={140}
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
          placeholder="15区 Convention 駅周辺"
        />
      </div>

      {/* 価格 */}
      <fieldset>
        <legend className="text-[12px] font-bold text-foreground">
          価格 <span className="text-danger-500">*</span>
        </legend>
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
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] tabular focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
              placeholder="150"
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
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 text-[12px] text-foreground/80">
            <input
              type="checkbox"
              checked={negotiable}
              onChange={(e) => setNegotiable(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
            />
            応相談
          </label>
        </div>
      </fieldset>

      {/* 配送オプション */}
      <div className="flex flex-wrap gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-foreground/80">
          <input
            type="checkbox"
            checked={pickupRequired}
            onChange={(e) => setPickupRequired(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
          />
          引き取りのみ
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-foreground/80">
          <input
            type="checkbox"
            checked={deliveryAvailable}
            onChange={(e) => setDeliveryAvailable(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
          />
          配達対応可（要相談）
        </label>
      </div>

      {/* 写真 */}
      <div>
        <label className="block text-[12px] font-bold text-foreground">写真</label>
        <p className="mb-2 mt-0.5 text-[11px] text-foreground/55">
          実物の状態がわかる写真を 1〜数枚（汚れや傷も正直に）
        </p>
        <PhotoUploader photos={photos} onChange={setPhotos} maxPhotos={8} />
      </div>

      <ContactLeakWarning />

      {/* 本文 */}
      <div>
        <label htmlFor="body" className="block text-[12px] font-bold text-foreground">
          詳細 <span className="text-danger-500">*</span>
        </label>
        <p className="mt-0.5 text-[11px] text-foreground/55">
          サイズ、購入時期、傷の有無、譲渡可能な日時など
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
            '【商品】IKEA EKTORP 3 人掛けソファ\n【サイズ】W218 × D88 × H88 cm\n【購入時期】2024 年 4 月\n【状態】カバー洗濯済み、目立った汚れなし\n【受け渡し】帰国に伴い 6 月末まで'
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
          onClick={() => router.push('/marketplace')}
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
