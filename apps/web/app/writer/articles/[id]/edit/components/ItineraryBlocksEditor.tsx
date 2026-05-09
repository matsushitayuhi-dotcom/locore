'use client';

import { Button, Input } from '@locore/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { SpotRow } from '@/components/writer/SpotList';

/**
 * 旅程プラン記事の構造化エディタ。
 *
 * articleType === 'itinerary' のときに表示し、
 * 「時刻 / スポット / 移動手段 / 所要時間 / メモ」をブロック単位で記入する。
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
  travelMinutesAfter?: number | null;
};

const TRANSPORT_OPTIONS: { value: NonNullable<ItineraryBlock['transportToNext']>; label: string }[] = [
  { value: 'walk', label: '徒歩' },
  { value: 'metro', label: 'メトロ' },
  { value: 'bus', label: 'バス' },
  { value: 'train', label: '電車' },
  { value: 'taxi', label: 'タクシー' },
  { value: 'bike', label: '自転車' },
  { value: 'other', label: 'その他' },
];

type Props = {
  blocks: ItineraryBlock[];
  onChange: (next: ItineraryBlock[]) => void;
  /** 既存スポットのドロップダウン候補。articleType='itinerary' でも spots テーブルは活用する */
  spots: SpotRow[];
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

export function ItineraryBlocksEditor({ blocks, onChange, spots }: Props) {
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

  return (
    <section
      className="space-y-3 rounded-md bg-card p-5 ring-1 ring-primary-100 sm:p-6"
      aria-labelledby="itinerary-blocks-title"
    >
      <header>
        <h3
          id="itinerary-blocks-title"
          className="text-[15px] font-semibold tracking-tight"
        >
          旅程ブロック
        </h3>
        <p className="mt-1 text-[12px] text-foreground/60">
          時刻 → スポット → 移動手段 → 次の場所の順で並べると、読者は当日のタイムラインとしてそのまま使えます。
        </p>
      </header>

      {blocks.length === 0 ? (
        <p className="rounded-md bg-primary-50/40 px-3 py-3 text-[12px] text-primary-700">
          まだ旅程ブロックがありません。「ブロックを追加」から最初の予定を入れましょう。
        </p>
      ) : null}

      <ol className="space-y-3">
        {blocks.map((b, idx) => {
          const isLast = idx === blocks.length - 1;
          return (
            <li key={b.id} className="space-y-2">
              {/* 1 ブロック */}
              <div className="grid gap-2 rounded-md bg-white p-3 ring-1 ring-border sm:grid-cols-[80px_80px_1fr_auto]">
                <div>
                  <label className="mb-0.5 block text-[10px] font-medium text-foreground/60">
                    開始
                  </label>
                  <Input
                    type="time"
                    value={b.startTime}
                    onChange={(e) => update(idx, 'startTime', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] font-medium text-foreground/60">
                    終了
                  </label>
                  <Input
                    type="time"
                    value={b.endTime ?? ''}
                    onChange={(e) =>
                      update(idx, 'endTime', e.target.value || undefined)
                    }
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] font-medium text-foreground/60">
                    場所
                  </label>
                  {spots.length > 0 ? (
                    <select
                      value={b.spotId ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        update(idx, 'spotId', v || undefined);
                        if (v) update(idx, 'freeName', undefined);
                      }}
                      className="flex h-10 w-full rounded-sm border border-neutral-200 bg-white px-3 text-body-md focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
                    >
                      <option value="">— スポット未選択（自由記述）—</option>
                      {spots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="rounded-sm bg-primary-50/40 px-2 py-2 text-[11px] text-primary-700">
                      下のスポット欄でスポットを追加すると、ここから選べるようになります。
                    </p>
                  )}
                  {!b.spotId ? (
                    <Input
                      type="text"
                      value={b.freeName ?? ''}
                      onChange={(e) =>
                        update(idx, 'freeName', e.target.value || undefined)
                      }
                      placeholder="スポット名（フリー入力）"
                      className="mt-2"
                    />
                  ) : null}
                </div>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    aria-label="このブロックを削除"
                    onClick={() => remove(idx)}
                    className="rounded-sm p-2 text-foreground/50 transition hover:bg-neutral-50 hover:text-danger-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
                    className="flex w-full rounded-sm border border-neutral-200 bg-white px-3 py-2 text-[13px] focus:border-2 focus:border-primary-500 focus:px-[11px] focus:py-[7px] focus:outline-none"
                  />
                </div>
              </div>

              {/* 移動手段（最後のブロック以外で表示） */}
              {!isLast ? (
                <div className="flex items-center gap-2 pl-2">
                  <span className="text-[18px] leading-none text-primary-300">↓</span>
                  <select
                    value={b.transportToNext ?? ''}
                    onChange={(e) =>
                      update(
                        idx,
                        'transportToNext',
                        (e.target.value || undefined) as ItineraryBlock['transportToNext'],
                      )
                    }
                    className="h-8 rounded-full border border-primary-200 bg-white px-3 text-[12px] font-medium text-primary-700 focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
                  >
                    <option value="">移動手段</option>
                    {TRANSPORT_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    value={b.travelMinutesAfter ?? ''}
                    onChange={(e) =>
                      update(
                        idx,
                        'travelMinutesAfter',
                        e.target.value === ''
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
                    placeholder="所要分"
                    className="h-8 max-w-[100px]"
                    min={0}
                  />
                  <span className="text-[12px] text-foreground/60">分</span>
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
}
