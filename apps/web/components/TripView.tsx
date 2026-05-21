'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Button, Badge } from '@locore/ui';
import { Share2, ExternalLink, Sparkles, Users, Clock } from '@locore/ui/icons';
import type { Trip, Spot, TripDay, TripItem } from '../lib/mock';

const TripDayMap = dynamic(
  () => import('./TripDayMap').then((m) => m.TripDayMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[260px] items-center justify-center bg-muted text-[13px] text-foreground/50">
        地図を読み込み中…
      </div>
    ),
  },
);

interface TripViewProps {
  trip: Trip;
  /**
   * spot.id → Spot のマップ。サーバ側で DB から解決して渡す。
   * 渡されない場合は item.freeSpotName 等のフォールバック表示のみ。
   */
  spotsById?: Map<string, Spot>;
}

function distanceKm(a: Spot, b: Spot) {
  // simple equirectangular for short distances
  const r = 6371;
  const x =
    ((b.lng - a.lng) * Math.PI * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180))) /
    180;
  const y = ((b.lat - a.lat) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * r;
}

function shuffleAndSort(
  items: TripItem[],
  getSpot: (id: string) => Spot | undefined,
): TripItem[] {
  const placed = items.filter((i) => i.spotId);
  const free = items.filter((i) => !i.spotId);
  if (placed.length <= 1) return items;

  const shuffled = [...placed]
    .map((x) => ({ x, k: Math.random() }))
    .sort((a, b) => a.k - b.k)
    .map((p) => p.x);

  const first = shuffled[0]!;
  const remaining = shuffled.slice(1);
  const ordered: TripItem[] = [first];
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1]!;
    const lastSpot = last.spotId ? getSpot(last.spotId) : undefined;
    if (!lastSpot) {
      const next = remaining.shift();
      if (next) ordered.push(next);
      continue;
    }
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const r = remaining[i]!;
      const rs = r.spotId ? getSpot(r.spotId) : undefined;
      if (!rs) continue;
      const d = distanceKm(lastSpot, rs);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const picked = remaining.splice(bestIdx, 1)[0];
    if (picked) ordered.push(picked);
  }
  return [...ordered, ...free];
}

export function TripView({ trip: initialTrip, spotsById }: TripViewProps) {
  const [trip, setTrip] = useState(initialTrip);
  const [activeDayId, setActiveDayId] = useState<string>(
    trip.days[0]?.id ?? '',
  );
  const [shareOpen, setShareOpen] = useState(false);

  // ローカル getSpot：渡された spotsById から解決（無ければ undefined）
  const getSpot = (id: string): Spot | undefined => spotsById?.get(id);

  const activeDay = (trip.days.find((d) => d.id === activeDayId) ??
    trip.days[0])!;
  const totalBudget = useMemo(
    () =>
      trip.days.reduce(
        (acc, d) => acc + d.items.reduce((a, i) => a + (i.budgetJpy ?? 0), 0),
        0,
      ),
    [trip],
  );

  const onReorder = () => {
    setTrip((t) => ({
      ...t,
      days: t.days.map((d) =>
        d.id === activeDay.id
          ? { ...d, items: shuffleAndSort(d.items, getSpot) }
          : d,
      ),
    }));
    toast.success('最短順に並べ替えました', {
      description: '近接スポットから貪欲に選んでいます（モック）',
    });
  };

  const onCopyDirections = () => {
    const ids = activeDay.items
      .map((i) => (i.spotId ? getSpot(i.spotId) : null))
      .filter(Boolean);
    if (ids.length === 0) {
      toast('スポットがないので URL を生成できません');
      return;
    }
    const url = `https://www.google.com/maps/dir/${ids
      .map((s) => `${s!.lat},${s!.lng}`)
      .join('/')}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () =>
          toast.success('Google Maps の URL をコピーしました', {
            description: 'クリップボードに保存（実際の遷移はしません）',
          }),
        () => toast.error('クリップボードへのコピーに失敗しました'),
      );
    }
  };

  const shareUrl = `https://locore.app/trip/${trip.id}?share=${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
          旅程
        </p>
        <h1
          className="mt-1 text-[28px] font-semibold tracking-tight sm:text-[36px]"
        >
          {trip.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-foreground/60">
          <span className="tabular">
            {trip.startDate} – {trip.endDate}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> {trip.travelers} 名
          </span>
          <span className="tabular">
            合計予算 ¥{totalBudget.toLocaleString('ja-JP')}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="mr-1 h-3.5 w-3.5" /> 同行者と共有
          </Button>
          <Button variant="outline" size="sm" onClick={onCopyDirections}>
            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Google Maps で開く
          </Button>
          <Button variant="ghost" size="sm" onClick={onReorder}>
            <Sparkles className="mr-1 h-3.5 w-3.5" /> 最短順に並べ替え
          </Button>
        </div>
      </header>

      {/* Day tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {trip.days.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActiveDayId(d.id)}
            className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition ${
              d.id === activeDay.id
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-foreground/70 hover:border-foreground/30'
            }`}
          >
            {d.label}
            <span className="ml-2 text-[11px] opacity-60 tabular">
              {d.date.slice(5)}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <Timeline day={activeDay} spotsById={spotsById} />
        <div className="space-y-4">
          <div className="overflow-hidden rounded-md border border-border">
            <TripDayMap day={activeDay} spotsById={spotsById ?? new Map()} />
          </div>
          <DayBudget day={activeDay} />
        </div>
      </div>

      {shareOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/40 px-4"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
              共有
            </p>
            <h3
              className="mt-1 text-[20px] font-semibold leading-snug"
            >
              同行者にこのリンクを送ると編集できます
            </h3>
            <div className="mt-4 break-all rounded-md border border-border bg-muted px-3 py-2 text-[12px] tabular text-foreground/80">
              {shareUrl}
            </div>
            <p className="mt-2 text-[11px] text-foreground/50">
              ※ プロト版のため、実際にリンク先で旅程を共有することはできません。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShareOpen(false)}>
                閉じる
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  navigator.clipboard?.writeText(shareUrl);
                  toast.success('リンクをコピーしました');
                  setShareOpen(false);
                }}
              >
                リンクをコピー
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Timeline({
  day,
  spotsById,
}: {
  day: TripDay;
  spotsById?: Map<string, Spot>;
}) {
  return (
    <ol className="relative space-y-3 border-l border-dashed border-border pl-6">
      {day.items.map((item, idx) => {
        const spot = item.spotId ? spotsById?.get(item.spotId) ?? null : null;
        return (
          <li key={item.id} className="relative">
            <span className="absolute -left-[28px] top-2 inline-flex h-3 w-3 rounded-full border-2 border-background bg-primary-700" />
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[12px] font-semibold tracking-wide tabular text-foreground/80">
                  {item.startTime} – {item.endTime}
                </p>
                <span className="text-[11px] tabular text-foreground/50">
                  #{String(idx + 1).padStart(2, '0')}
                </span>
              </div>
              <p
                className="mt-1.5 text-[16px] font-semibold leading-snug"
              >
                {spot?.name ?? item.freeSpotName ?? '自由スポット'}
              </p>
              {spot ? (
                <p className="mt-1 text-[12px] text-foreground/60">
                  {spot.address}
                </p>
              ) : null}
              {item.notes ? (
                <p className="mt-2 text-[13px] leading-relaxed text-foreground/70">
                  {item.notes}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-foreground/60">
                {spot ? (
                  <Badge variant="outline" className="text-[10px]">
                    {spot.category}
                  </Badge>
                ) : null}
                {item.budgetJpy ? (
                  <span className="tabular">
                    ¥{item.budgetJpy.toLocaleString('ja-JP')}
                  </span>
                ) : null}
                {item.travelMinutesAfter ? (
                  <span className="inline-flex items-center gap-0.5 tabular text-foreground/40">
                    <Clock className="h-3 w-3" />
                    次まで {item.travelMinutesAfter} 分
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DayBudget({ day }: { day: TripDay }) {
  const total = day.items.reduce((a, i) => a + (i.budgetJpy ?? 0), 0);
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
        この日の予算
      </p>
      <p className="mt-1 text-[24px] font-semibold tabular">
        ¥{total.toLocaleString('ja-JP')}
      </p>
      <p className="text-[12px] text-foreground/60">
        {day.items.length} スポット
      </p>
    </div>
  );
}
