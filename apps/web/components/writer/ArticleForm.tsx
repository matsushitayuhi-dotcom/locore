'use client';

/**
 * @deprecated 単画面リニューアル後は `app/writer/articles/[id]/edit/components/BasicInfoSection.tsx` を使用。
 * 旧 4 タブ UI 用の互換コンポーネント。新規実装からは参照しないこと。
 */

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { updateArticle } from '@/app/writer/articles/[id]/edit/actions';

const PRICE_OPTIONS = [300, 500, 800, 1000, 1500, 2000, 3000, 5000] as const;

const DURATION_OPTIONS: { value: 'half_day' | 'full_day' | 'few_hours' | 'other'; label: string }[] = [
  { value: 'few_hours', label: '数時間' },
  { value: 'half_day', label: '半日' },
  { value: 'full_day', label: '終日' },
  { value: 'other', label: 'その他' },
];

const ARTICLE_TYPE_OPTIONS: {
  value: 'spot_guide' | 'itinerary';
  label: string;
  description: string;
}[] = [
  {
    value: 'spot_guide',
    label: 'スポット紹介',
    description: '個別の場所を紹介する記事',
  },
  {
    value: 'itinerary',
    label: '旅程プラン',
    description: '時間軸ありのコース・モデルプラン',
  },
];

export type ArticleFormInitial = {
  id: string;
  title: string;
  priceJpy: number;
  durationType: 'half_day' | 'full_day' | 'few_hours' | 'other' | null;
  articleType: 'spot_guide' | 'itinerary';
  tags: string[];
  cityId: string;
  coverImageUrl: string | null;
};

type Props = {
  initial: ArticleFormInitial;
  cities: { id: string; nameJa: string }[];
  tier: 'S' | 'A' | 'B';
  isPublished: boolean;
};

const TIER_PRICE_CAPS: Record<'S' | 'A' | 'B', number> = {
  S: 5000,
  A: 3000,
  B: 1000,
};

export function ArticleForm({ initial, cities, tier, isPublished }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [priceJpy, setPriceJpy] = useState(initial.priceJpy);
  const [durationType, setDurationType] = useState(initial.durationType ?? '');
  const [articleType, setArticleType] = useState<'spot_guide' | 'itinerary'>(
    initial.articleType ?? 'spot_guide',
  );
  const [tagsText, setTagsText] = useState((initial.tags ?? []).join(', '));
  const [cityId, setCityId] = useState(initial.cityId);
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl ?? '');
  const [isPending, startTransition] = useTransition();

  const cap = TIER_PRICE_CAPS[tier];
  const allowedPrices = PRICE_OPTIONS.filter((p) => p <= cap);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPublished) {
      const ok = window.confirm(
        '公開中の記事を編集すると変更が即時反映されます。続けますか？',
      );
      if (!ok) return;
    }

    const tags = tagsText
      .split(/[,、\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    startTransition(async () => {
      const res = await updateArticle({
        id: initial.id,
        title,
        priceJpy,
        durationType: durationType || undefined,
        articleType,
        tags,
        cityId,
        coverImageUrl: coverImageUrl || '',
      });
      if (res.ok) {
        toast.success('基本情報を保存しました');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-md border border-border bg-card p-5 sm:p-6">
      <div>
        <label htmlFor="art-title" className="mb-1 block text-[12px] font-medium text-foreground/70">
          タイトル <span className="text-danger-500">*</span>
        </label>
        <Input
          id="art-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />
        <p className="mt-1 text-[11px] text-foreground/50">{title.length} / 200</p>
      </div>

      <fieldset>
        <legend className="mb-2 block text-[12px] font-medium text-foreground/70">
          記事の種別 <span className="text-danger-500">*</span>
        </legend>
        <div
          role="radiogroup"
          aria-label="記事の種別"
          className="grid gap-2 sm:grid-cols-2"
        >
          {ARTICLE_TYPE_OPTIONS.map((opt) => {
            const selected = articleType === opt.value;
            return (
              <label
                key={opt.value}
                className={
                  'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2.5 text-[13px] transition ' +
                  (selected
                    ? 'border-primary-700 bg-primary-500/10'
                    : 'border-border bg-background hover:border-foreground/30')
                }
              >
                <input
                  type="radio"
                  name="article-type"
                  value={opt.value}
                  checked={selected}
                  onChange={() => setArticleType(opt.value)}
                  className="mt-1"
                />
                <span className="flex flex-col leading-tight">
                  <span className="font-medium text-foreground">{opt.label}</span>
                  <span className="mt-0.5 text-[11px] text-foreground/60">
                    {opt.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="art-price" className="mb-1 block text-[12px] font-medium text-foreground/70">
            価格 <span className="text-danger-500">*</span>
          </label>
          <select
            id="art-price"
            value={priceJpy}
            onChange={(e) => setPriceJpy(Number(e.target.value))}
            className="flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-md text-foreground focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          >
            {allowedPrices.map((p) => (
              <option key={p} value={p}>
                ¥{p.toLocaleString('ja-JP')}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-foreground/50">
            あなたの Tier ({tier}) の上限：¥{cap.toLocaleString('ja-JP')}
          </p>
        </div>

        <div>
          <label htmlFor="art-duration" className="mb-1 block text-[12px] font-medium text-foreground/70">
            所要時間
          </label>
          <select
            id="art-duration"
            value={durationType}
            onChange={(e) => setDurationType(e.target.value)}
            className="flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-md text-foreground focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          >
            <option value="">選択してください</option>
            {DURATION_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="art-city" className="mb-1 block text-[12px] font-medium text-foreground/70">
          都市 <span className="text-danger-500">*</span>
        </label>
        <select
          id="art-city"
          value={cityId}
          onChange={(e) => setCityId(e.target.value)}
          className="flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-md text-foreground focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
        >
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameJa}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="art-tags" className="mb-1 block text-[12px] font-medium text-foreground/70">
          テーマタグ
        </label>
        <Input
          id="art-tags"
          type="text"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="朝食, ビストロ, 路地裏"
        />
        <p className="mt-1 text-[11px] text-foreground/50">
          カンマ区切りで入力してください（最大 20 件）。
        </p>
      </div>

      <div>
        <label htmlFor="art-cover" className="mb-1 block text-[12px] font-medium text-foreground/70">
          カバー画像 URL
        </label>
        <Input
          id="art-cover"
          type="url"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="https://picsum.photos/seed/locore-foo/960/640"
        />
        <p className="mt-1 text-[11px] text-foreground/50">
          画像 URL を直接指定できます（直接アップロードは今後対応）。
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? '保存中…' : '基本情報を保存'}
        </Button>
      </div>
    </form>
  );
}
