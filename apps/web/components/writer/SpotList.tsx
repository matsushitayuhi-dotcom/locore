'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { ChevronDown, Plus } from '@locore/ui/icons';
import { ChevronUp } from 'lucide-react';
import { SpotEditor, type SpotEditorValue } from './SpotEditor';
import { reorderSpots } from '@/app/writer/articles/[id]/edit/actions';

export type SpotRow = {
  id: string;
  articleId: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category: 'food' | 'sight' | 'shopping' | 'lodging' | 'other' | null;
  priceEstimate: string | null;
  openingHoursText: string;
  tags: string[];
  position: number;
  googlePlaceId?: string | null;
  googlePhotoUrls?: string[] | null;
};

type Props = {
  articleId: string;
  initial: SpotRow[];
  googleMapsApiKey?: string;
  /** 行が変化したときに親へ最新のリストを通知（旅程ブロックのドロップダウン候補等で使う） */
  onRowsChange?: (rows: SpotRow[]) => void;
};

const CATEGORY_LABEL: Record<string, string> = {
  food: '食事',
  sight: '景観',
  shopping: '買い物',
  lodging: '宿泊',
  other: 'その他',
};

function rowToValue(row: SpotRow): SpotEditorValue {
  return {
    id: row.id,
    articleId: row.articleId,
    name: row.name,
    address: row.address ?? '',
    lat: row.lat,
    lng: row.lng,
    category: row.category ?? '',
    priceEstimate: row.priceEstimate ?? '',
    openingHoursText: row.openingHoursText,
    tagsText: (row.tags ?? []).join(', '),
    position: row.position,
    googlePlaceId: row.googlePlaceId ?? null,
    googlePhotoUrls: row.googlePhotoUrls ?? null,
  };
}

/** SpotEditor から戻る `value` を一覧表示用 SpotRow に変換 */
function valueToRow(v: SpotEditorValue): SpotRow {
  return {
    id: v.id!,
    articleId: v.articleId,
    name: v.name,
    address: v.address || null,
    lat: typeof v.lat === 'number' ? v.lat : Number(v.lat) || 0,
    lng: typeof v.lng === 'number' ? v.lng : Number(v.lng) || 0,
    category: (v.category || null) as SpotRow['category'],
    priceEstimate: v.priceEstimate || null,
    openingHoursText: v.openingHoursText,
    tags: v.tagsText
      .split(/[,、\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0),
    position: v.position,
    googlePlaceId: v.googlePlaceId ?? null,
    googlePhotoUrls: v.googlePhotoUrls ?? null,
  };
}

export function SpotList({
  articleId,
  initial,
  googleMapsApiKey,
  onRowsChange,
}: Props) {
  const [rows, setRows] = useState<SpotRow[]>(
    [...initial].sort((a, b) => a.position - b.position),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [, startTransition] = useTransition();

  // 親に行の変化を通知
  useEffect(() => {
    onRowsChange?.(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...rows];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    const renumbered = next.map((r, i) => ({ ...r, position: i }));
    setRows(renumbered);
    startTransition(async () => {
      const res = await reorderSpots({
        articleId,
        ordered: renumbered.map((r) => ({ id: r.id, position: r.position })),
      });
      if (!res.ok) toast.error(res.error);
    });
  };

  const newPosition = rows.length;

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {rows.map((row, idx) => (
          <li key={row.id} className="rounded-md border border-border bg-card">
            {editingId === row.id ? (
              <div className="p-2">
                <SpotEditor
                  initial={rowToValue(row)}
                  googleMapsApiKey={googleMapsApiKey}
                  onSaved={(value) => {
                    setEditingId(null);
                    // 既存行を保存後の値で上書き（revalidate を待たずに即時反映）
                    setRows((prev) =>
                      prev.map((r) =>
                        r.id === value.id ? valueToRow(value) : r,
                      ),
                    );
                  }}
                  onDeleted={() => {
                    setEditingId(null);
                    setRows((prev) => prev.filter((r) => r.id !== row.id));
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    aria-label="上に移動"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="rounded-sm p-1 text-foreground/50 hover:bg-neutral-50 hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="下に移動"
                    onClick={() => move(idx, 1)}
                    disabled={idx === rows.length - 1}
                    className="rounded-sm p-1 text-foreground/50 hover:bg-neutral-50 hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-foreground">
                    {idx + 1}. {row.name}
                    {row.category ? (
                      <span className="ml-2 text-[11px] text-foreground/50">
                        {CATEGORY_LABEL[row.category]}
                      </span>
                    ) : null}
                  </p>
                  {row.address ? (
                    <p className="truncate text-[11px] text-foreground/50">{row.address}</p>
                  ) : null}
                  <p className="text-[11px] text-foreground/40">
                    ({row.lat.toFixed(4)}, {row.lng.toFixed(4)})
                    {row.priceEstimate ? ` ・ ${row.priceEstimate}` : ''}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(row.id)}>
                  編集
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {showNew ? (
        <SpotEditor
          initial={{
            articleId,
            name: '',
            address: '',
            lat: '',
            lng: '',
            category: '',
            priceEstimate: '',
            openingHoursText: '',
            tagsText: '',
            position: newPosition,
            googlePlaceId: null,
          }}
          googleMapsApiKey={googleMapsApiKey}
          onSaved={(value) => {
            setShowNew(false);
            // 新規行を末尾に追加して累積表示（revalidate を待たない）
            setRows((prev) => [...prev, valueToRow(value)]);
          }}
          onDeleted={() => setShowNew(false)}
          onCancel={() => setShowNew(false)}
        />
      ) : (
        <Button type="button" variant="outline" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" />
          スポットを追加
        </Button>
      )}

      {rows.length > 0 ? (
        <p className="text-[11px] text-foreground/50">
          現在 {rows.length} 件のスポットが登録されています。
        </p>
      ) : null}
    </div>
  );
}
