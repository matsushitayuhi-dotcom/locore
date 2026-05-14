'use client';

import { Button, Input } from '@locore/ui';
import { Plus, Trash2 } from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';
import type { SpotRow } from '@/components/writer/SpotList';
import { TransportPicker } from './TransportPicker';

/**
 * 旅程プラン記事の構造化エディタ。
 *
 * articleType === 'itinerary' のときに表示し、
 * 「時刻 / スポット / 移動手段（カテゴリ + 詳細） / 所要時間 / メモ」を
 * ブロック単位で記入する。
 *
 * 値は親 (EditorShell) で配列として保持し、autoSave のときに JSONB 列
 * `articles.itinerary_blocks` に書き込まれる。
 */

export type ItineraryBlock = {
  id: string;
  startTime: string;
  endTime?: string | null;
  spotId?: string | null;
  freeName?: string | null;
  notes?: string | null;
  transportToNext?:
    | 'walk'
    | 'metro'
    | 'bus'
    | 'taxi'
    | 'bike'
    | 'train'
    | 'other'
    | null;
  /**
   * 移動手段の補足テキスト（例: "12号線 République→Bastille"）。
   * 公共交通機関のとき Google Directions が自動で埋めてくれることもある。
   */
  transportNote?: string | null;
  travelMinutesAfter?: number | null;
};

type Props = {
  blocks: ItineraryBlock[];
  onChange: (next: ItineraryBlock[]) => void;
  /** 既存スポットのドロップダウン候補。articleType='itinerary' でも spots テーブルは活用する */
  spots: SpotRow[];
  /** Google Directions（公共交通機関の経路提案）に使う API キー */
  googleMapsApiKey?: string;
};

function newBlock(prev: ItineraryBlock | undefined): ItineraryBlock {
  // 直前ブロックの 1 時間後をデフォルトに
  const defaultStart = (() => {
    if (!prev?.startTime) return '09:00';
    const m = prev.startTime.match(/^(\d{2}):(\d{2})$/);
    if (!m) return '09:00';
    const h = (parseInt(m[1]!, 10) + 1) % 24;
    return `${String(h).padStart(2, '0')}:${m[2]!}`;
  })();
  return {
    id: 'tmp-' + Math.random().toString(36).slice(2),
    startTime: defaultStart,
  };
}

export function ItineraryBlocksEditor({
  blocks,
  onChange,
  spots,
  googleMapsApiKey,
}: Props) {
  const update = <K extends keyof ItineraryBlock>(
    idx: number,
    key: K,
    value: ItineraryBlock[K],
  ) => {
    onChange(
      blocks.map((b, i) => (i === idx ? { ...b, [key]: value } : b)),
    );
  };

  const remove = (idx: number) => {
    onChange(blocks.filter((_, i) => i !== idx));
  };

  const add = () => {
    onChange([...blocks, newBlock(blocks[blocks.length - 1])]);
  };

  const spotById = new Map(spots.map((s) => [s.id, s]));
  const blockLatLng = (b: ItineraryBlock) => {
    if (!b.spotId) return null;
    const s = spotById.get(b.spotId);
    return s ? { lat: s.lat, lng: s.lng } : null;
  };

  const inner = (
    <section
      className="space-y-3 rounded-md bg-card p-5 ring-1 ring-border sm:p-6"
      aria-labelledby="itinerary-blocks-title"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3
            id="itinerary-blocks-title"
            className="text-[15px] font-semibold tracking-tight"
          >
            旅程ブロック ／ 移動手段
          </h3>
          <p className="mt-1 text-[12px] text-foreground/60">
            上のスポットをこの順番に巡る前提で、時刻と「次のスポットへの移動手段」を入れていきます。徒歩 / 自転車 / タクシー / 公共交通機関は Google から所要時間を自動取得できます。
          </p>
        </div>
        {spots.length >= 2 && blocks.length === 0 ? (
          <button
            type="button"
            onClick={() => {
              // スポットを順番に旅程ブロックへ流し込む
              const next = spots.map((s, i) => ({
                id: 'tmp-' + Math.random().toString(36).slice(2),
                startTime:
                  String(9 + i).padStart(2, '0') + ':00', // 9:00 から 1h 刻みのデフォルト
                spotId: s.id,
              }));
              onChange(next);
            }}
            className="rounded-full bg-primary-500/10 px-3 py-1.5 text-[11px] font-bold text-primary-300 ring-1 ring-border hover:bg-primary-500/15"
          >
            上のスポットから自動生成
          </button>
        ) : null}
      </header>

      {blocks.length === 0 ? (
        <p className="rounded-md bg-primary-500/10 px-3 py-3 text-[12px] text-primary-300">
          まだ旅程ブロックがありません。「ブロックを追加」から最初の予定を入れましょう。
        </p>
      ) : null}
      {blocks.length === 1 ? (
        <p className="rounded-md bg-primary-500/10 px-3 py-2 text-[12px] text-primary-300">
          もう 1 ブロック追加すると、間に「次のスポットへの移動手段」が設定できます。
        </p>
      ) : null}

      <ol className="space-y-3">
        {blocks.map((b, idx) => {
          const isLast = idx === blocks.length - 1;
          return (
            <li key={b.id} className="space-y-2">
              {/* 1 ブロック — スマホでは時刻 2 つを 1 行に並べ、場所は 2 行目に */}
              <div className="rounded-md bg-card p-3 ring-1 ring-border">
                <div className="flex items-start justify-between gap-2">
                  {/* 時刻 2 つ — モバイルでも横並び（小さく） */}
                  <div className="flex flex-1 gap-2">
                    <div className="min-w-0 flex-1">
                      <label className="mb-0.5 block text-[10px] font-medium text-foreground/60">
                        開始
                      </label>
                      <input
                        type="time"
                        value={b.startTime}
                        onChange={(e) =>
                          update(idx, 'startTime', e.target.value)
                        }
                        className="h-9 w-full min-w-0 rounded-sm border border-border bg-background px-2 text-[13px] tabular focus:border-2 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="mb-0.5 block text-[10px] font-medium text-foreground/60">
                        終了
                      </label>
                      <input
                        type="time"
                        value={b.endTime ?? ''}
                        onChange={(e) =>
                          update(idx, 'endTime', e.target.value || undefined)
                        }
                        className="h-9 w-full min-w-0 rounded-sm border border-border bg-background px-2 text-[13px] tabular focus:border-2 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="このブロックを削除"
                    onClick={() => remove(idx)}
                    className="mt-4 shrink-0 rounded-sm p-1.5 text-foreground/50 transition hover:bg-muted hover:text-danger-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* 場所 — 時刻の下に独立行で */}
                <div className="mt-2">
                  <label className="mb-0.5 block text-[10px] font-medium text-foreground/60">
                    場所
                  </label>
                  {spots.length > 0 ? (
                    <select
                      value={b.spotId ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange(
                          blocks.map((bb, i) =>
                            i === idx
                              ? {
                                  ...bb,
                                  spotId: v || undefined,
                                  freeName: v ? undefined : bb.freeName,
                                }
                              : bb,
                          ),
                        );
                      }}
                      className="h-9 w-full rounded-sm border border-border bg-background px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none"
                    >
                      <option value="">— スポット未選択（自由記述）—</option>
                      {spots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="rounded-sm bg-primary-500/10 px-2 py-1.5 text-[11px] text-primary-300">
                      下のスポット欄でスポットを追加すると、ここから選べます。
                    </p>
                  )}
                  {!b.spotId ? (
                    <input
                      type="text"
                      value={b.freeName ?? ''}
                      onChange={(e) =>
                        update(idx, 'freeName', e.target.value || undefined)
                      }
                      placeholder="スポット名（フリー入力）"
                      className="mt-2 h-9 w-full rounded-sm border border-border bg-background px-2 text-[13px] focus:border-2 focus:border-primary-500 focus:outline-none"
                    />
                  ) : null}
                </div>

                {/* 補足：メモ */}
                <div className="sm:col-span-4">
                  <label className="mb-0.5 block text-[10px] font-medium text-foreground/60">
                    メモ（食べたもの / 体験 / 注意点）
                  </label>
                  <textarea
                    value={b.notes ?? ''}
                    onChange={(e) =>
                      update(idx, 'notes', e.target.value || undefined)
                    }
                    rows={2}
                    placeholder="例: モーニングセット €9.50 を頼む。テラス席は早朝が空いてる"
                    className="flex w-full rounded-sm border border-border bg-card px-3 py-2 text-[13px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
                  />
                </div>
              </div>

              {/* 移動手段（最後のブロック以外で表示） */}
              {!isLast ? (
                <div className="ml-2 space-y-2 border-l-2 border-dashed border-primary-500/40 pl-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-300/70">
                    次のスポットへの移動
                  </p>
                  <TransportPicker
                    transportToNext={b.transportToNext}
                    transportNote={b.transportNote}
                    travelMinutesAfter={b.travelMinutesAfter}
                    fromLatLng={blockLatLng(b)}
                    toLatLng={blockLatLng(blocks[idx + 1]!)}
                    onChange={(next) => {
                      onChange(
                        blocks.map((bb, i) =>
                          i === idx
                            ? {
                                ...bb,
                                transportToNext: next.transportToNext,
                                transportNote: next.transportNote,
                                travelMinutesAfter: next.travelMinutesAfter,
                              }
                            : bb,
                        ),
                      );
                    }}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" />
        ブロックを追加
      </Button>
    </section>
  );

  // 公共交通機関の経路取得用に Google Maps SDK をロード（API キーがあれば）
  if (googleMapsApiKey) {
    return <APIProvider apiKey={googleMapsApiKey}>{inner}</APIProvider>;
  }
  return inner;
}
