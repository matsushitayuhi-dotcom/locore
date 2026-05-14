'use client';

import { Input } from '@locore/ui';

const PRICE_OPTIONS = [300, 500, 800, 1000, 1500, 2000, 3000, 5000] as const;

const DURATION_OPTIONS: { value: 'half_day' | 'full_day' | 'few_hours' | 'other'; label: string }[] = [
  { value: 'few_hours', label: '数時間' },
  { value: 'half_day', label: '半日' },
  { value: 'full_day', label: '終日' },
  { value: 'other', label: 'その他' },
];

const ARTICLE_TYPE_OPTIONS: {
  value: 'spot_guide' | 'itinerary' | 'expat_info' | 'photo_journal';
  label: string;
  description: string;
}[] = [
  { value: 'spot_guide', label: 'スポット紹介', description: '個別の場所を紹介する記事' },
  { value: 'itinerary', label: '旅程プラン', description: '時間軸ありのコース・モデルプラン' },
  {
    value: 'photo_journal',
    label: 'フォト日記',
    description: '写真 + キャプション + 場所のインスタ風縦スクロール記事',
  },
  {
    value: 'expat_info',
    label: '駐在者情報',
    description: '殺虫剤・医療・行政手続きなど、現地生活の実用情報',
  },
];

// クリエイターランクによる価格上限は廃止（2026-05 方針変更）。
// ランクの差は手数料率で扱う（writer_profiles.tier × commission_rate)。
// 全価格帯を全クリエイターが選べる。

/**
 * 記事のメタ情報（種別 / 価格 / 所要時間 / 都市 / タグ）。
 * タイトルと本文は別途 TitleBodySection で統合的に編集する。
 */
export type BasicInfoValue = {
  priceJpy: number;
  durationType: 'half_day' | 'full_day' | 'few_hours' | 'other' | '';
  articleType: 'spot_guide' | 'itinerary' | 'expat_info' | 'photo_journal';
  tagsText: string;
  cityId: string;
};

type Props = {
  value: BasicInfoValue;
  onChange: (next: BasicInfoValue) => void;
  cities: { id: string; nameJa: string }[];
  tier: 'S' | 'A' | 'B';
};

export function BasicInfoSection({ value, onChange, cities, tier: _tier }: Props) {
  // tier は将来「手数料率の表示」に使う想定。今は無視。
  const allowedPrices = PRICE_OPTIONS;

  const set = <K extends keyof BasicInfoValue>(k: K, v: BasicInfoValue[K]) => {
    onChange({ ...value, [k]: v });
  };

  return (
    <section
      className="space-y-5 rounded-md bg-card p-5 ring-1 ring-border sm:p-6"
      aria-labelledby="basic-section-title"
    >
      <h3 id="basic-section-title" className="text-[15px] font-semibold tracking-tight">
        メタ情報
      </h3>

      <fieldset>
        <legend className="mb-2 block text-[12px] font-medium text-foreground/70">
          記事の種別 <span className="text-danger-500">*</span>
        </legend>
        <div role="radiogroup" aria-label="記事の種別" className="grid gap-2 sm:grid-cols-2">
          {ARTICLE_TYPE_OPTIONS.map((opt) => {
            const selected = value.articleType === opt.value;
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
                  onChange={() => set('articleType', opt.value)}
                  className="mt-1"
                />
                <span className="flex flex-col leading-tight">
                  <span className="font-medium text-foreground">{opt.label}</span>
                  <span className="mt-0.5 text-[11px] text-foreground/60">{opt.description}</span>
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
            value={value.priceJpy}
            onChange={(e) => set('priceJpy', Number(e.target.value))}
            className="flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-md text-foreground focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
          >
            {allowedPrices.map((p) => (
              <option key={p} value={p}>
                ¥{p.toLocaleString('ja-JP')}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-foreground/50">
            価格は自由に設定できます。Tier の差は手数料率で扱います。
          </p>
        </div>

        <div>
          <label htmlFor="art-duration" className="mb-1 block text-[12px] font-medium text-foreground/70">
            所要時間
          </label>
          <select
            id="art-duration"
            value={value.durationType}
            onChange={(e) => set('durationType', e.target.value as BasicInfoValue['durationType'])}
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
          value={value.cityId}
          onChange={(e) => set('cityId', e.target.value)}
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
          value={value.tagsText}
          onChange={(e) => set('tagsText', e.target.value)}
          placeholder="朝食, ビストロ, 路地裏"
        />
        <p className="mt-1 text-[11px] text-foreground/50">
          カンマ区切りで入力してください（最大 20 件）。
        </p>
      </div>
    </section>
  );
}
