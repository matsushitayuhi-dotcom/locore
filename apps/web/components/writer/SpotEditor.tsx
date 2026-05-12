'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { upsertSpot, deleteSpot } from '@/app/writer/articles/[id]/edit/actions';
import { SpotPlacesPicker, type PickedPlace } from './SpotPlacesPicker';

export type SpotEditorValue = {
  id?: string;
  articleId: string;
  name: string;
  address: string;
  lat: number | '';
  lng: number | '';
  category: 'food' | 'sight' | 'shopping' | 'lodging' | 'other' | '';
  priceEstimate: string;
  openingHoursText: string;
  tagsText: string;
  position: number;
  googlePlaceId?: string | null;
  // Google Places 詳細（picker 経由で流入）
  phoneNumber?: string | null;
  website?: string | null;
  googleRating?: number | null;
  googleUserRatingsTotal?: number | null;
  googlePriceLevel?: number | null;
  googleTypes?: string[] | null;
  /** Google Places から拾った写真 URL の配列（最大 5 枚） */
  googlePhotoUrls?: string[] | null;
};

/**
 * Google Places の types[] から Locore のカテゴリを推定する。
 * 例: ['cafe', 'food'] → 'food'
 *     ['museum', 'tourist_attraction'] → 'sight'
 */
function inferCategoryFromTypes(
  types: string[],
): 'food' | 'sight' | 'shopping' | 'lodging' | 'other' | '' {
  const t = new Set(types);
  if (t.has('lodging')) return 'lodging';
  if (
    t.has('restaurant') ||
    t.has('cafe') ||
    t.has('bar') ||
    t.has('bakery') ||
    t.has('food') ||
    t.has('meal_takeaway')
  )
    return 'food';
  if (
    t.has('store') ||
    t.has('shopping_mall') ||
    t.has('clothing_store') ||
    t.has('book_store')
  )
    return 'shopping';
  if (
    t.has('museum') ||
    t.has('tourist_attraction') ||
    t.has('park') ||
    t.has('art_gallery') ||
    t.has('point_of_interest')
  )
    return 'sight';
  return '';
}

const CATEGORY_OPTIONS: { value: SpotEditorValue['category']; label: string }[] = [
  { value: 'food', label: '食事・ドリンク' },
  { value: 'sight', label: '観光・景観' },
  { value: 'shopping', label: '買い物' },
  { value: 'lodging', label: '宿泊' },
  { value: 'other', label: 'その他' },
];

type Props = {
  initial: SpotEditorValue;
  /**
   * 保存成功時に呼ばれる。`value` は保存後のフォーム値（id 付き）。
   * 親側（SpotList）はこれを使って一覧を即座に更新する（revalidate を待たない）。
   */
  onSaved: (value: SpotEditorValue) => void;
  onDeleted: () => void;
  onCancel?: () => void;
  /** Google Maps API キー（無い場合は SpotPlacesPicker がフォールバック表示） */
  googleMapsApiKey?: string;
};

export function SpotEditor({ initial, onSaved, onDeleted, onCancel, googleMapsApiKey }: Props) {
  const [v, setV] = useState<SpotEditorValue>(initial);
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof SpotEditorValue>(key: K, value: SpotEditorValue[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = () => {
    if (!v.name.trim() || !v.address.trim()) {
      toast.error('店舗名と住所は必須です');
      return;
    }
    if (v.lat === '' || v.lng === '') {
      toast.error('緯度と経度を入力してください');
      return;
    }

    let openingHours: unknown = undefined;
    if (v.openingHoursText.trim().length > 0) {
      try {
        openingHours = JSON.parse(v.openingHoursText);
      } catch {
        // JSON でなければ note として保存
        openingHours = { note: v.openingHoursText.trim() };
      }
    }

    const tags = v.tagsText
      .split(/[,、\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    startTransition(async () => {
      const res = await upsertSpot({
        id: v.id,
        articleId: v.articleId,
        name: v.name.trim(),
        address: v.address.trim(),
        location: { lat: Number(v.lat), lng: Number(v.lng) },
        category: v.category || undefined,
        priceEstimate: v.priceEstimate.trim() || undefined,
        openingHours,
        tags,
        position: v.position,
        googlePlaceId: v.googlePlaceId ?? undefined,
        phoneNumber: v.phoneNumber ?? undefined,
        website: v.website ?? undefined,
        googleRating: v.googleRating ?? undefined,
        googleUserRatingsTotal: v.googleUserRatingsTotal ?? undefined,
        googlePriceLevel: v.googlePriceLevel ?? undefined,
        googleTypes: v.googleTypes ?? undefined,
        googlePhotoUrls: v.googlePhotoUrls ?? undefined,
      });
      if (res.ok) {
        toast.success(v.id ? 'スポットを更新しました' : 'スポットを追加しました');
        onSaved({ ...v, id: res.data!.id });
      } else {
        toast.error(res.error);
      }
    });
  };

  const onDelete = () => {
    if (!v.id) {
      onCancel?.();
      return;
    }
    if (!window.confirm('このスポットを削除します。よろしいですか？')) return;
    startTransition(async () => {
      const res = await deleteSpot({ articleId: v.articleId, spotId: v.id! });
      if (res.ok) {
        toast.success('スポットを削除しました');
        onDeleted();
      } else {
        toast.error(res.error);
      }
    });
  };

  // パリ範囲チェック（ラフ警告のみ）
  const lat = typeof v.lat === 'number' ? v.lat : Number(v.lat);
  const lng = typeof v.lng === 'number' ? v.lng : Number(v.lng);
  const inParis =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 48.7 &&
    lat <= 48.95 &&
    lng >= 2.2 &&
    lng <= 2.5;
  const showParisWarn =
    typeof v.lat === 'number' && typeof v.lng === 'number' && !inParis;

  const handlePick = (p: PickedPlace) => {
    setV((prev) => ({
      ...prev,
      name: p.name || prev.name,
      address: p.address || prev.address,
      lat: p.lat || prev.lat,
      lng: p.lng || prev.lng,
      googlePlaceId: p.placeId || prev.googlePlaceId,
      // 営業時間：weekday_text を openingHours.note として保存
      openingHoursText:
        p.openingHoursText && p.openingHoursText.trim().length > 0
          ? p.openingHoursText
          : prev.openingHoursText,
      // カテゴリ：未選択なら types から推定
      category:
        prev.category ||
        (p.types && p.types.length > 0
          ? inferCategoryFromTypes(p.types)
          : prev.category),
      // Google 拡張データ
      phoneNumber: p.phoneNumber,
      website: p.website,
      googleRating: p.rating,
      googleUserRatingsTotal: p.userRatingsTotal,
      googlePriceLevel: p.priceLevel,
      googleTypes: p.types,
      googlePhotoUrls:
        p.photoUrls && p.photoUrls.length > 0
          ? p.photoUrls
          : prev.googlePhotoUrls,
    }));
    toast.success(
      p.openingHoursText
        ? 'Google から営業時間まで取得して反映しました'
        : '店舗情報を反映しました',
    );
  };

  // Google から拾った情報のサマリ（picker → 自動充填の確認用）
  const placeSummary = v.googlePlaceId
    ? [
        v.googleRating != null
          ? `★ ${v.googleRating.toFixed(1)}${
              v.googleUserRatingsTotal
                ? `（${v.googleUserRatingsTotal.toLocaleString('ja-JP')} 件）`
                : ''
            }`
          : null,
        v.phoneNumber ? `📞 ${v.phoneNumber}` : null,
        v.website ? '🌐 公式サイト' : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-4 rounded-md border border-border bg-card p-4">
      <SpotPlacesPicker apiKey={googleMapsApiKey} onPick={handlePick} />

      {v.googlePlaceId ? (
        <div className="space-y-2 rounded-md bg-primary-500/10 px-3 py-2 text-[12px] text-primary-300 ring-1 ring-border">
          <p className="font-semibold">Google から自動取得済み</p>
          {placeSummary.length > 0 ? (
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-foreground/80">
              {placeSummary.map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </p>
          ) : null}
          {v.googlePhotoUrls && v.googlePhotoUrls.length > 0 ? (
            <div>
              <p className="mb-1 text-[11px] font-medium text-foreground/70">
                取得した写真（{v.googlePhotoUrls.length} 枚） ・
                変な写真は ✕ で外してください
              </p>
              <div className="flex gap-2 overflow-x-auto">
                {v.googlePhotoUrls.map((url, i) => (
                  <div key={i} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="h-16 w-24 rounded-sm object-cover ring-1 ring-border"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          'googlePhotoUrls',
                          (v.googlePhotoUrls ?? []).filter(
                            (_, idx) => idx !== i,
                          ),
                        )
                      }
                      aria-label="この写真を外す"
                      className="absolute right-0 top-0 -translate-y-1 translate-x-1 rounded-full bg-card/95 px-1.5 py-0.5 text-[11px] font-bold text-danger-500 shadow-sm ring-1 ring-border hover:bg-card"
                    >
                      ✕
                    </button>
                    {i === 0 ? (
                      <span className="absolute bottom-0 left-0 rounded-tr-sm bg-primary-700/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        代表
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <p className="text-[11px] text-foreground/60">
            place_id: <code className="font-mono">{v.googlePlaceId}</code>
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            店舗名 <span className="text-danger-500">*</span>
          </label>
          <Input
            type="text"
            value={v.name}
            onChange={(e) => set('name', e.target.value)}
            maxLength={120}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            カテゴリ
          </label>
          <select
            value={v.category}
            onChange={(e) => set('category', e.target.value as SpotEditorValue['category'])}
            className="flex h-10 w-full rounded-sm border border-border bg-card px-3 text-body-md text-foreground focus:border-2 focus:border-primary-700 focus:px-[11px] focus:outline-none"
          >
            <option value="">選択してください</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          住所 <span className="text-danger-500">*</span>
        </label>
        <Input
          type="text"
          value={v.address}
          onChange={(e) => set('address', e.target.value)}
          maxLength={300}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            緯度 (lat) <span className="text-danger-500">*</span>
          </label>
          <Input
            type="number"
            step="0.0001"
            value={v.lat}
            onChange={(e) =>
              set('lat', e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder="48.8566"
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            経度 (lng) <span className="text-danger-500">*</span>
          </label>
          <Input
            type="number"
            step="0.0001"
            value={v.lng}
            onChange={(e) =>
              set('lng', e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder="2.3522"
          />
        </div>
      </div>
      <p className="text-[11px] text-foreground/50">
        座標は{' '}
        <a
          href="https://www.google.com/maps"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-300 underline-offset-4 hover:underline"
        >
          Google Maps
        </a>
        で店舗を右クリック → 表示される座標をコピーして貼り付けてください。
      </p>
      {showParisWarn ? (
        <p className="text-[11px] text-warning-700">
          パリ市内（48.7〜48.95, 2.2〜2.5）の範囲外です。座標を確認してください。
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            料金目安
          </label>
          <Input
            type="text"
            value={v.priceEstimate}
            onChange={(e) => set('priceEstimate', e.target.value)}
            placeholder="€8.50 / コーヒー €1.50"
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground/70">
            タグ
          </label>
          <Input
            type="text"
            value={v.tagsText}
            onChange={(e) => set('tagsText', e.target.value)}
            placeholder="朝食, テラス席"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-foreground/70">
          営業時間（任意）
        </label>
        <textarea
          value={v.openingHoursText}
          onChange={(e) => set('openingHoursText', e.target.value)}
          rows={3}
          className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-body-md text-foreground placeholder:text-neutral-400 focus:border-2 focus:border-primary-700 focus:px-[11px] focus:py-[7px] focus:outline-none"
          placeholder='例：月-金 9:00-18:00、日曜定休 — JSON でも可：{"mon":["09:00-18:00"]}'
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {v.id ? (
          <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={isPending}>
            削除
          </Button>
        ) : onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
            キャンセル
          </Button>
        ) : null}
        <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={isPending}>
          {isPending ? '保存中…' : v.id ? '更新' : 'スポットを追加'}
        </Button>
      </div>
    </div>
  );
}
