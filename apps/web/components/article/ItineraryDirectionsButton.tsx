'use client';

import { ExternalLink } from '@locore/ui/icons';
import type { Spot, ArticleItineraryBlock } from '../../lib/mock';
import {
  buildItineraryDirectionsUrl,
  pickDominantTravelMode,
} from '@/lib/maps/googleMapsUrls';

/**
 * 旅程記事用の「Google マップでルートを開く」ボタン。
 *
 * itineraryBlocks を順番に並べ、各ブロックの spotId から Spot を引いて
 * Google Maps Directions URL を組み立てる:
 *  - 出発 = 最初のスポット、到着 = 最後のスポット、中間 = waypoints
 *  - 各 stop は Place ID 優先 (`place_id:...`)、無ければ `lat,lng` fallback
 *  - travelmode は transportToNext の最頻値（walking / transit / driving / bicycling）
 *
 * 購入後にしか表示しないため呼び出し側で出し分け前提。
 * ルート計算に必要な stop が 2 件未満の時は何も描画しない。
 */

type Props = {
  blocks: ArticleItineraryBlock[];
  spots: Spot[];
};

const MODE_LABEL: Record<string, string> = {
  walking: '徒歩',
  transit: '公共交通',
  driving: '車・タクシー',
  bicycling: '自転車',
};

export function ItineraryDirectionsButton({ blocks, spots }: Props) {
  const spotById = new Map(spots.map((s) => [s.id, s]));

  // itineraryBlocks の順序通りに、spotId で引ける有効スポットだけ抽出
  const stops = blocks
    .map((b) => (b.spotId ? spotById.get(b.spotId) : null))
    .filter((s): s is Spot => Boolean(s));

  if (stops.length < 2) return null;

  const travelMode = pickDominantTravelMode(blocks.map((b) => b.transportToNext));
  const url = buildItineraryDirectionsUrl(
    stops.map((s) => ({ placeId: s.googlePlaceId, lat: s.lat, lng: s.lng })),
    travelMode,
  );
  if (!url) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-[12px]">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md bg-primary-500 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-primary-700"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Google マップでルートを開く
      </a>
      <span className="text-foreground/55">
        {stops.length} スポットを {MODE_LABEL[travelMode] ?? travelMode} で巡る
      </span>
    </div>
  );
}
