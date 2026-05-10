'use client';

import { useState, useTransition } from 'react';
import { Input } from '@locore/ui';
import { toast } from 'sonner';

/**
 * 旅程ブロックの「次のスポットへの移動手段」を選ぶ UI。
 *
 * - アイコンボタン 5 つで主要カテゴリを選択（徒歩 / 自転車 / タクシー /
 *   公共交通機関 / その他）
 * - 選んだあと、所要時間（分）+ メモ（自由記述）を入力できる
 * - 公共交通機関のときだけ「Google で経路を取得」ボタンが出て、
 *   起終点の lat/lng が揃っていれば DirectionsService を呼んで
 *   メモ欄に Métro 12号線 / 8 分 のような結果を埋める
 */

const CATEGORIES = [
  { value: 'walk', label: '徒歩' },
  { value: 'bike', label: '自転車' },
  { value: 'taxi', label: 'タクシー' },
  { value: 'public_transit', label: '公共交通機関' },
  { value: 'other', label: 'その他' },
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

type Props = {
  /** 既に保存されてる transportToNext。'metro'/'bus'/'train' は public_transit に丸める */
  transportToNext?:
    | 'walk'
    | 'metro'
    | 'bus'
    | 'taxi'
    | 'bike'
    | 'train'
    | 'other'
    | null;
  transportNote?: string | null;
  travelMinutesAfter?: number | null;
  /** 起点・終点の座標（公共交通機関の自動経路取得用、なければ提案ボタン非表示） */
  fromLatLng?: { lat: number; lng: number } | null;
  toLatLng?: { lat: number; lng: number } | null;
  onChange: (next: {
    transportToNext:
      | 'walk'
      | 'metro'
      | 'bus'
      | 'taxi'
      | 'bike'
      | 'train'
      | 'other'
      | null;
    transportNote: string | null;
    travelMinutesAfter: number | null;
  }) => void;
};

/** 既存値をアイコン用カテゴリに正規化 */
function normalize(
  v: Props['transportToNext'],
): Category | null {
  if (!v) return null;
  if (v === 'metro' || v === 'bus' || v === 'train') return 'public_transit';
  if (v === 'walk' || v === 'bike' || v === 'taxi') return v;
  return 'other';
}

/** カテゴリ → DB 列の transportToNext */
function denormalize(
  c: Category | null,
):
  | 'walk'
  | 'metro'
  | 'bus'
  | 'taxi'
  | 'bike'
  | 'train'
  | 'other'
  | null {
  if (!c) return null;
  if (c === 'public_transit') return 'metro'; // 仮に metro 扱い（note で詳細）
  return c;
}

export function TransportPicker({
  transportToNext,
  transportNote,
  travelMinutesAfter,
  fromLatLng,
  toLatLng,
  onChange,
}: Props) {
  const [active, setActive] = useState<Category | null>(normalize(transportToNext));
  const [note, setNote] = useState(transportNote ?? '');
  const [minutes, setMinutes] = useState<number | ''>(
    travelMinutesAfter ?? '',
  );
  const [isFetching, startFetch] = useTransition();

  const update = (
    nextActive: Category | null,
    nextNote: string,
    nextMinutes: number | '',
  ) => {
    onChange({
      transportToNext: denormalize(nextActive),
      transportNote: nextNote || null,
      travelMinutesAfter: nextMinutes === '' ? null : Number(nextMinutes),
    });
  };

  const onPickCategory = (c: Category) => {
    const next = active === c ? null : c;
    setActive(next);
    update(next, note, minutes);
  };

  const onChangeNote = (v: string) => {
    setNote(v);
    update(active, v, minutes);
  };

  const onChangeMinutes = (v: string) => {
    const m = v === '' ? '' : Number(v);
    setMinutes(m);
    update(active, note, m);
  };

  const onFetchTransit = () => {
    if (!fromLatLng || !toLatLng) {
      toast.error('起点・終点のスポット情報が足りません');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) {
      toast.error('Google Maps SDK が読み込まれていません（地図ページを一度開くと読み込まれます）');
      return;
    }
    startFetch(() => {
      const service = new G.DirectionsService();
      service.route(
        {
          origin: fromLatLng,
          destination: toLatLng,
          travelMode: G.TravelMode.TRANSIT,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result: any, status: string) => {
          if (status !== 'OK' || !result.routes?.[0]) {
            toast.error('経路を取得できませんでした');
            return;
          }
          const leg = result.routes[0].legs?.[0];
          if (!leg) return;
          const transitSteps = (leg.steps as Array<Record<string, unknown>>)
            .filter((s) => s.travel_mode === 'TRANSIT')
            .map((s) => {
              const t = s.transit_details as
                | {
                    line?: { short_name?: string; name?: string };
                    departure_stop?: { name?: string };
                    arrival_stop?: { name?: string };
                  }
                | undefined;
              const lineName =
                t?.line?.short_name ?? t?.line?.name ?? 'Transit';
              const dep = t?.departure_stop?.name ?? '';
              const arr = t?.arrival_stop?.name ?? '';
              return `${lineName}（${dep} → ${arr}）`;
            });
          const noteText =
            transitSteps.length > 0 ? transitSteps.join(' → ') : leg.duration?.text ?? '';
          const durationMin = Math.round(
            (leg.duration?.value ?? 0) / 60,
          );
          setNote(noteText);
          if (durationMin > 0) setMinutes(durationMin);
          update(active, noteText, durationMin > 0 ? durationMin : minutes);
          toast.success('経路を取得しました');
        },
      );
    });
  };

  return (
    <div className="space-y-2">
      {/* カテゴリ選択 */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const isOn = active === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onPickCategory(c.value)}
              className={
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ' +
                (isOn
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'bg-white text-primary-700 ring-1 ring-primary-200 hover:bg-primary-50')
              }
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* 詳細入力（カテゴリ選択後） */}
      {active ? (
        <div className="grid gap-2 rounded-md bg-primary-50/40 p-2.5 sm:grid-cols-[100px_1fr_auto]">
          <Input
            type="number"
            value={minutes}
            onChange={(e) => onChangeMinutes(e.target.value)}
            placeholder="所要分"
            className="h-9"
            min={0}
          />
          <Input
            type="text"
            value={note}
            onChange={(e) => onChangeNote(e.target.value)}
            placeholder={
              active === 'public_transit'
                ? '例: Métro 12号線（République → Bastille）'
                : '補足メモ（任意）'
            }
            className="h-9"
          />
          {active === 'public_transit' ? (
            <button
              type="button"
              onClick={onFetchTransit}
              disabled={isFetching || !fromLatLng || !toLatLng}
              className="rounded-md bg-primary-700 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-primary-500 disabled:opacity-40"
            >
              {isFetching ? '取得中…' : 'Google で経路'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
