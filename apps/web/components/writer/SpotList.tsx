'use client';

import { useState, useTransition } from 'react';
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
};

type Props = {
  articleId: string;
  initial: SpotRow[];
  googleMapsApiKey?: string;
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
  };
}

export function SpotList({ articleId, initial, googleMapsApiKey }: Props) {
  const [rows, setRows] = useState<SpotRow[]>(
    [...initial].sort((a, b) => a.position - b.position),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [, startTransition] = useTransition();

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
                  onSaved={() => {
                    setEditingId(null);
                    // 親で完全な再フェッチは編集ページの revalidate に任せる
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
          onSaved={() => {
            setShowNew(false);
            // revalidate 経由で再描画されることを期待
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
    </div>
  );
}
