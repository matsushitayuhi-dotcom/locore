/**
 * Google Maps の deep-link URL を組み立てる小さなヘルパ群。
 *
 * これまで各コンポーネントで散発的に組み立てていた URL を 1 箇所に集約することで、
 * 「Google Maps で開いたときに、緯度経度のピンではなく **店として** 開く」を
 * 確実に実現する。
 *
 * 主な URL 仕様:
 *  - 場所として開く: `/maps/search/?api=1&query=<lat>,<lng>&query_place_id=<placeId>`
 *      query は本来 fallback だが、query_place_id がついていれば Maps はその place を開く。
 *      ref: https://developers.google.com/maps/documentation/urls/get-started#search-action
 *  - ルートを引く:   `/maps/dir/?api=1&origin=<>&destination=<>&waypoints=<|...>&travelmode=<>`
 *      stop 1 つあたり `place_id:<placeId>` か `<lat>,<lng>` が使える。
 *      ref: https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */

export type DirStop = {
  /** Google Places の place_id。あれば最優先で使う */
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type DirTravelMode = 'walking' | 'driving' | 'transit' | 'bicycling';

/** スポット 1 件を Google Maps で「場所」として開く URL */
export function buildSpotGoogleMapsUrl(opts: {
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Place ID も座標も無い時の最終 fallback（店名 + 住所） */
  fallbackQuery?: string;
}): string {
  const { placeId, lat, lng, fallbackQuery } = opts;
  const hasCoords =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);
  if (placeId && hasCoords) {
    return (
      'https://www.google.com/maps/search/?api=1' +
      `&query=${lat},${lng}` +
      `&query_place_id=${encodeURIComponent(placeId)}`
    );
  }
  if (placeId) {
    // 座標が無い → query にも placeId を流し込み、query_place_id でロックする
    return (
      'https://www.google.com/maps/search/?api=1' +
      `&query=${encodeURIComponent('place_id:' + placeId)}` +
      `&query_place_id=${encodeURIComponent(placeId)}`
    );
  }
  if (hasCoords) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return (
    'https://www.google.com/maps/search/?api=1' +
    `&query=${encodeURIComponent(fallbackQuery ?? '')}`
  );
}

/** Directions URL の 1 stop を Maps が解釈できる文字列にする */
function stopToParam(stop: DirStop): string | null {
  if (stop.placeId) return `place_id:${stop.placeId}`;
  if (
    typeof stop.lat === 'number' &&
    typeof stop.lng === 'number' &&
    Number.isFinite(stop.lat) &&
    Number.isFinite(stop.lng)
  ) {
    return `${stop.lat},${stop.lng}`;
  }
  return null;
}

/**
 * 旅程プランの「Google マップでルートを開く」URL。
 * stops は順序通りに渡す（先頭 = 出発、末尾 = 到着、中間 = waypoints）。
 *
 * stop 数が 0 / 1 のときは null を返す（ルートが描けないため）。
 *
 * waypoints は Google Maps の制約により最大 9 個まで（URL API の上限は不明だが
 * 実用上はこれで足りる）。
 */
export function buildItineraryDirectionsUrl(
  stops: DirStop[],
  travelMode: DirTravelMode = 'walking',
): string | null {
  const params = stops.map(stopToParam).filter((s): s is string => Boolean(s));
  if (params.length < 2) return null;
  const origin = params[0]!;
  const destination = params[params.length - 1]!;
  const waypoints = params.slice(1, -1);

  const usp = new URLSearchParams();
  usp.set('api', '1');
  usp.set('origin', origin);
  usp.set('destination', destination);
  if (waypoints.length > 0) {
    // URLSearchParams は "|" を %7C にエンコードするが Maps はどちらも解釈する
    usp.set('waypoints', waypoints.join('|'));
  }
  usp.set('travelmode', travelMode);
  return `https://www.google.com/maps/dir/?${usp.toString()}`;
}

/**
 * itineraryBlocks の transportToNext を集計して、URL で渡す travelmode を決める。
 * walking / transit / driving / bicycling の 4 種に正規化する。
 *
 * - 区間ごとに違う場合は最頻値を採用
 * - 全く指定が無い場合は 'walking' を返す（最も汎用）
 */
export function pickDominantTravelMode(
  modes: Array<
    | 'walk'
    | 'metro'
    | 'bus'
    | 'taxi'
    | 'bike'
    | 'train'
    | 'other'
    | null
    | undefined
  >,
): DirTravelMode {
  const counts: Record<DirTravelMode, number> = {
    walking: 0,
    driving: 0,
    transit: 0,
    bicycling: 0,
  };
  for (const m of modes) {
    if (!m) continue;
    if (m === 'walk') counts.walking += 1;
    else if (m === 'taxi') counts.driving += 1;
    else if (m === 'bike') counts.bicycling += 1;
    else if (m === 'metro' || m === 'bus' || m === 'train')
      counts.transit += 1;
    // 'other' / null は無視
  }
  let best: DirTravelMode = 'walking';
  let bestN = -1;
  // 同点時は walking > transit > driving > bicycling の優先順位（観光ユース）
  const order: DirTravelMode[] = ['walking', 'transit', 'driving', 'bicycling'];
  for (const k of order) {
    if (counts[k] > bestN) {
      bestN = counts[k];
      best = k;
    }
  }
  return best;
}
