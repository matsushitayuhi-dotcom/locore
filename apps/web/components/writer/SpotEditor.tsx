'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@locore/ui';
import { upsertSpot, deleteSpot } from '@/app/writer/articles/[id]/edit/actions';

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
};

const CATEGORY_OPTIONS: { value: SpotEditorValue['category']; label: string }[] = [
  { value: 'food', label: '食事・ドリンク' },
  { value: 'sight', label: '観光・景観' },
  { value: 'shopping', label: '買い物' },
  { value: 'lodging', label: '宿泊' },
  { value: 'other', label: 'その他' },
];

type Props = {
  initial: SpotEditorValue;
  onSaved: (id: string) => void;
  onDeleted: () => void;
  onCancel?: () => void;
};

export function SpotEditor({ initial, onSaved, onDeleted, onCancel }: Props) {
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
      });
      if (res.ok) {
        toast.success(v.id ? 'スポットを更新しました' : 'スポットを追加しました');
        onSaved(res.data!.id);
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

  return (
    <div className="space-y-4 rounded-md border border-border bg-card p-4">
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
            className="flex h-10 w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 text-body-md text-neutral-900 focus:border-2 focus:border-primary-700 focus:px-[11px] focus:outline-none"
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
          className="text-primary-700 underline-offset-4 hover:underline"
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
          className="flex w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 py-2 text-body-md text-neutral-900 placeholder:text-neutral-400 focus:border-2 focus:border-primary-700 focus:px-[11px] focus:py-[7px] focus:outline-none"
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
