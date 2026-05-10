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

/**
 * 公共交通機関の note は `路線（出発駅 → 到着駅）` 形式で保存している。
 * 既存値を 3 つのフィールドに分解する。マッチしない場合は line にそのまま入れる。
 */
function parseTransitNote(note: string | null | undefined): {
  line: string;
  fromStation: string;
  toStation: string;
} {
  if (!note) return { line: '', fromStation: '', toStation: '' };
  // "Métro 12号線（République → Bastille）" のように：路線（出発 → 到着）
  const m = note.match(/^(.+?)（(.+?)\s*→\s*(.+?)）\s*$/);
  if (m) {
    return {
      line: m[1]!.trim(),
      fromStation: m[2]!.trim(),
      toStation: m[3]!.trim(),
    };
  }
  return { line: note.trim(), fromStation: '', toStation: '' };
}

function buildTransitNote(parts: {
  line: string;
  fromStation: string;
  toStation: string;
}): string {
  const line = parts.line.trim();
  const from = parts.fromStation.trim();
  const to = parts.toStation.trim();
  if (!line && !from && !to) return '';
  if (from || to) return `${line}（${from} → ${to}）`;
  return line;
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
  // 公共交通機関用の構造化フィールド
  const initialTransit = parseTransitNote(transportNote);
  const [transitLine, setTransitLine] = useState(initialTransit.line);
  const [transitFrom, setTransitFrom] = useState(initialTransit.fromStation);
  const [transitTo, setTransitTo] = useState(initialTransit.toStation);
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

  /** 公共交通機関 3 フィールドのいずれかが変わったら note を再構築して保存 */
  const onChangeTransitField = (
    next: { line: string; fromStation: string; toStation: string },
  ) => {
    setTransitLine(next.line);
    setTransitFrom(next.fromStation);
    setTransitTo(next.toStation);
    const composed = buildTransitNote(next);
    setNote(composed);
    update(active, composed, minutes);
  };

  /** 選択中のカテゴリに応じた Google DirectionsService の travelMode を返す */
  const googleTravelMode = (
    cat: Category | null,
    G: { TravelMode: Record<string, string> } | null,
  ): string | null => {
    if (!cat || !G) return null;
    if (cat === 'walk') return G.TravelMode.WALKING ?? null;
    if (cat === 'bike') return G.TravelMode.BICYCLING ?? null;
    if (cat === 'taxi') return G.TravelMode.DRIVING ?? null;
    if (cat === 'public_transit') return G.TravelMode.TRANSIT ?? null;
    return null;
  };

  const onFetchRoute = () => {
    if (!fromLatLng || !toLatLng) {
      toast.error('起点・終点のスポット情報が足りません');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) {
      toast.error(
        'Google Maps SDK が読み込まれていません（地図ページを一度開くと読み込まれます）',
      );
      return;
    }
    const mode = googleTravelMode(active, G);
    if (!mode) {
      toast.error('このカテゴリでは自動取得できません');
      return;
    }
    startFetch(() => {
      const service = new G.DirectionsService();
      service.route(
        {
          origin: fromLatLng,
          destination: toLatLng,
          travelMode: mode,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result: any, status: string) => {
          if (status !== 'OK' || !result.routes?.[0]) {
            toast.error('経路を取得できませんでした');
            return;
          }
          const leg = result.routes[0].legs?.[0];
          if (!leg) return;

          let noteText = '';
          if (active === 'public_transit') {
            // TRANSIT step を全部収集して、最初の TRANSIT 区間を 3 フィールドに分解
            const transitDetails = (leg.steps as Array<Record<string, unknown>>)
              .filter((s) => s.travel_mode === 'TRANSIT')
              .map((s) => {
                const t = s.transit_details as
                  | {
                      line?: { short_name?: string; name?: string };
                      departure_stop?: { name?: string };
                      arrival_stop?: { name?: string };
                    }
                  | undefined;
                return {
                  lineName: t?.line?.short_name ?? t?.line?.name ?? '',
                  dep: t?.departure_stop?.name ?? '',
                  arr: t?.arrival_stop?.name ?? '',
                };
              });

            const first = transitDetails[0];
            // 複数 TRANSIT 区間のときは「線A → 線B」のように繋ぐ。基本は最初の区間で
            // 構造化フィールドを埋めて、残りは note 末尾に「+ 線B...」の形で残す。
            const composedLine = transitDetails
              .map((d) => d.lineName || 'Transit')
              .join(' → ');
            const newLine = composedLine || 'Transit';
            const newFrom = first?.dep ?? '';
            const newTo =
              transitDetails[transitDetails.length - 1]?.arr ?? '';

            // 構造化フィールドにも反映（複数線のときは合成名がそのまま入る）
            setTransitLine(newLine);
            setTransitFrom(newFrom);
            setTransitTo(newTo);

            noteText = buildTransitNote({
              line: newLine,
              fromStation: newFrom,
              toStation: newTo,
            });
            if (!noteText) noteText = leg.duration?.text ?? '';
          } else {
            // walk / bike / taxi: 距離 + duration を載せる
            const dist = leg.distance?.text ?? '';
            const dur = leg.duration?.text ?? '';
            noteText = [dist, dur].filter(Boolean).join(' / ');
          }

          const durationMin = Math.round((leg.duration?.value ?? 0) / 60);
          setNote(noteText);
          if (durationMin > 0) setMinutes(durationMin);
          update(active, noteText, durationMin > 0 ? durationMin : minutes);
          toast.success('Google から経路情報を取得しました');
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
      {active === 'public_transit' ? (
        <div className="space-y-2 rounded-md bg-primary-50/40 p-2.5">
          <div className="flex items-end gap-2">
            <div className="w-[100px]">
              <label className="mb-0.5 block text-[10px] font-medium text-foreground/60">
                所要分
              </label>
              <Input
                type="number"
                value={minutes}
                onChange={(e) => onChangeMinutes(e.target.value)}
                className="h-9"
                min={0}
              />
            </div>
            <button
              type="button"
              onClick={onFetchRoute}
              disabled={isFetching || !fromLatLng || !toLatLng}
              title={
                !fromLatLng || !toLatLng
                  ? '起点・終点の両方にスポットを紐付けると自動取得できます'
                  : 'Google から路線・出発駅・到着駅・時間を取得'
              }
              className="ml-auto rounded-md bg-primary-700 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-primary-500 disabled:opacity-40"
            >
              {isFetching ? '取得中…' : 'Google で経路取得'}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-0.5 block text-[10px] font-medium text-foreground/60">
                線（路線名）
              </label>
              <Input
                type="text"
                value={transitLine}
                onChange={(e) =>
                  onChangeTransitField({
                    line: e.target.value,
                    fromStation: transitFrom,
                    toStation: transitTo,
                  })
                }
                placeholder="例：Métro 12 号線"
                className="h-9"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] font-medium text-foreground/60">
                出発駅
              </label>
              <Input
                type="text"
                value={transitFrom}
                onChange={(e) =>
                  onChangeTransitField({
                    line: transitLine,
                    fromStation: e.target.value,
                    toStation: transitTo,
                  })
                }
                placeholder="例：République"
                className="h-9"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] font-medium text-foreground/60">
                到着駅
              </label>
              <Input
                type="text"
                value={transitTo}
                onChange={(e) =>
                  onChangeTransitField({
                    line: transitLine,
                    fromStation: transitFrom,
                    toStation: e.target.value,
                  })
                }
                placeholder="例：Bastille"
                className="h-9"
              />
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-foreground/50">
            起終点のスポットに位置情報が入っていれば、「Google で経路取得」で
            線・出発駅・到着駅・所要分をまとめて自動入力できます。
          </p>
        </div>
      ) : active ? (
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
            placeholder="補足メモ（任意）"
            className="h-9"
          />
          {active === 'walk' || active === 'bike' || active === 'taxi' ? (
            <button
              type="button"
              onClick={onFetchRoute}
              disabled={isFetching || !fromLatLng || !toLatLng}
              title={
                !fromLatLng || !toLatLng
                  ? '起点・終点の両方にスポットを紐付けると自動取得できます'
                  : 'Google から所要時間を取得'
              }
              className="rounded-md bg-primary-700 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-primary-500 disabled:opacity-40"
            >
              {isFetching ? '取得中…' : 'Google で時間取得'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
