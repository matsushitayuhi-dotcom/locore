'use client';

import { useEffect, useState } from 'react';
import { Clock, MapPin, Lock } from '@locore/ui/icons';
import type { ArticleItineraryBlock, Spot } from '../lib/mock';
import { Purchases } from '../lib/storage/local';

const TRANSPORT_LABEL: Record<string, string> = {
  walk: '徒歩',
  metro: 'メトロ',
  bus: 'バス',
  train: '電車',
  taxi: 'タクシー',
  bike: '自転車',
  other: 'その他',
};

/** 分を「X時間Y分」形式に。60 分未満は「Y分」のみ。0/負は空文字。 */
function formatDuration(min: number | null | undefined): string {
  if (!min || min <= 0) return '';
  if (min < 60) return `${min}分`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

type Props = {
  articleId: string;
  blocks: ArticleItineraryBlock[];
  /** 該当 spotId を解決するためのスポット配列 */
  spots: Spot[];
  /** サーバ側で判定済みの購入状態（DB の purchases 由来）。未ログインなら false */
  defaultUnlocked: boolean;
};

/**
 * 旅程プラン記事の構造化タイムライン。
 *
 * 「09:00 → カフェ → 徒歩 10 分 → 10:30 美術館 → ...」のように、
 * ブロックの間に移動手段ピルを挟んで時系列に並べる。
 */
export function ItineraryTimeline({
  articleId,
  blocks,
  spots,
  defaultUnlocked,
}: Props) {
  const [unlocked, setUnlocked] = useState(defaultUnlocked);
  useEffect(() => {
    if (defaultUnlocked) return;
    if (Purchases.has(articleId)) setUnlocked(true);
  }, [articleId, defaultUnlocked]);

  const spotsById = new Map(spots.map((s) => [s.id, s]));

  if (blocks.length === 0) return null;

  return (
    <section className="rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
            1日の流れ
          </p>
          <h3 className="mt-2 text-[20px] font-bold tracking-tight">旅程タイムライン</h3>
        </div>
        {!unlocked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">
            <Lock className="h-3 w-3" />
            記事購入で解放
          </span>
        ) : null}
      </div>

      <ol className="space-y-3">
        {blocks.map((b, idx) => {
          const isLast = idx === blocks.length - 1;
          const spot = b.spotId ? spotsById.get(b.spotId) : undefined;
          const placeName = unlocked
            ? (spot?.name ?? b.freeName ?? 'スポット未設定')
            : '?????????';
          const address = spot?.address;

          return (
            <li key={b.id ?? idx}>
              <div className="flex gap-3">
                {/* 時刻列 */}
                <div className="w-16 shrink-0 text-right">
                  <p className="text-[13px] font-bold tabular text-primary-300">
                    {b.startTime}
                  </p>
                  {b.endTime ? (
                    <p className="text-[10px] tabular text-foreground/50">
                      〜 {b.endTime}
                    </p>
                  ) : null}
                </div>
                {/* 縦線アンカー */}
                <div className="relative flex flex-col items-center">
                  <span className="block h-3 w-3 rounded-full bg-primary-500 ring-4 ring-border" />
                  {!isLast ? (
                    <span
                      aria-hidden
                      className="mt-1 flex-1 border-l-2 border-dashed border-primary-500/40"
                    />
                  ) : null}
                </div>
                {/* 内容列 */}
                <div className="flex-1 pb-4">
                  <p
                    className={
                      unlocked
                        ? 'text-[15px] font-bold leading-snug text-foreground'
                        : 'inline-flex items-center gap-1.5 text-[15px] font-semibold text-foreground/40'
                    }
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary-500" />
                    {placeName}
                  </p>
                  {unlocked && address ? (
                    <p className="mt-0.5 text-[11px] text-foreground/60">
                      {address}
                    </p>
                  ) : null}
                  {b.notes ? (
                    <p
                      className={
                        'mt-1 whitespace-pre-line text-[13px] leading-relaxed ' +
                        (unlocked ? 'text-foreground/80' : 'text-foreground/30')
                      }
                    >
                      {unlocked ? b.notes : 'メモは購入後に表示されます'}
                    </p>
                  ) : null}
                </div>
              </div>
              {/* 次への移動手段 */}
              {!isLast && (b.transportToNext || b.travelMinutesAfter || b.transportNote) ? (
                <div className="ml-[76px] flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-semibold text-primary-300">
                    <Clock className="h-3 w-3" />
                    {b.transportToNext
                      ? TRANSPORT_LABEL[b.transportToNext] ?? b.transportToNext
                      : '移動'}
                    {b.travelMinutesAfter
                      ? ` ${formatDuration(b.travelMinutesAfter)}`
                      : ''}
                  </span>
                  {b.transportNote ? (
                    <span className="text-[11px] text-foreground/70">
                      {b.transportNote}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
