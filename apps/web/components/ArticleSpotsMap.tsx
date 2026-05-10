'use client';

import { useEffect, useMemo } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  useMap,
} from '@vis.gl/react-google-maps';
import type { Spot, ArticleItineraryBlock } from '../lib/mock';
import { locoreMapStyles } from './map/locoreMapStyle';

/**
 * 記事の最下部に表示する、その記事のスポットをまとめてマッピングする地図。
 *
 * - articleType === 'spot_guide' → 番号なしピンを並べるだけ（順序に意味なし）
 * - articleType === 'itinerary'  → 旅程ブロックの順序に従って番号付きピン + ルート線
 *
 * Google Maps の標準 UI/POI を全て切り、Locore 独自スタイルだけを残す。
 * mapId を使うと styles が無視されるため、styles 経由で指定する。
 */

type Point = { spot: Spot; label?: number };

function makePlainPinSvg(color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">` +
    `<circle cx="14" cy="14" r="11" fill="${color}" stroke="white" stroke-width="2"/>` +
    `<circle cx="14" cy="14" r="4" fill="white"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeNumberedPinSvg(color: string, label: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
    `<circle cx="16" cy="16" r="13" fill="${color}" stroke="white" stroke-width="2"/>` +
    `<text x="16" y="20" text-anchor="middle" ` +
    `font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="white">` +
    `${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function MarkersLayer({
  points,
  numbered,
}: {
  points: Point[];
  numbered: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;
    const markers = points.map((p) => {
      const url =
        numbered && typeof p.label === 'number'
          ? makeNumberedPinSvg('#0D7A5C', p.label)
          : makePlainPinSvg('#0D7A5C');
      return new G.Marker({
        position: { lat: p.spot.lat, lng: p.spot.lng },
        map,
        title: numbered && p.label ? `${p.label}. ${p.spot.name}` : p.spot.name,
        icon: {
          url,
          scaledSize: new G.Size(numbered ? 32 : 28, numbered ? 32 : 28),
          anchor: new G.Point(numbered ? 16 : 14, numbered ? 16 : 14),
        },
      });
    });
    return () => {
      markers.forEach((m) => m.setMap(null));
    };
  }, [map, points, numbered]);
  return null;
}

/**
 * 直線（フォールバック用）。Directions が取れないときに使う。
 */
function StraightPolyline({ points }: { points: Point[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length < 2) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;
    const line = new G.Polyline({
      path: points.map((p) => ({ lat: p.spot.lat, lng: p.spot.lng })),
      geodesic: true,
      strokeColor: '#14A37C',
      strokeOpacity: 0,
      icons: [
        {
          icon: {
            path: G.SymbolPath.CIRCLE,
            fillColor: '#14A37C',
            fillOpacity: 1,
            strokeOpacity: 0,
            scale: 3,
          },
          offset: '0',
          repeat: '14px',
        },
      ],
      map,
    });
    return () => {
      line.setMap(null);
    };
  }, [map, points]);
  return null;
}

/**
 * itinerary block の transportToNext から Google DirectionsService の travelMode を返す。
 * 'other' / null は null（直線フォールバック）。
 */
function transportToTravelMode(
  v: ArticleItineraryBlock['transportToNext'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  G: any,
): string | null {
  if (!v) return null;
  if (v === 'walk') return G.TravelMode.WALKING;
  if (v === 'bike') return G.TravelMode.BICYCLING;
  if (v === 'taxi') return G.TravelMode.DRIVING;
  if (v === 'metro' || v === 'bus' || v === 'train') return G.TravelMode.TRANSIT;
  return null;
}

/**
 * 旅程記事用：itineraryBlocks の連続するペアごとに DirectionsService.route を呼んで
 * 実際に辿るルートを Polyline で描く。block.transportToNext が null / 'other' の
 * 区間だけ直線（点線）に落とす。
 */
function DirectionsPolylines({
  segments,
}: {
  segments: Array<{
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
    mode: ArticleItineraryBlock['transportToNext'];
  }>;
}) {
  const map = useMap();
  // 経路ごとに描画したインスタンスを ref ではなく state でも closure でも追跡できる
  // ようにするため、useEffect の cleanup で逐次破棄。
  useEffect(() => {
    if (!map || segments.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;

    const created: Array<{ setMap: (m: unknown) => void }> = [];
    let cancelled = false;

    const service = new G.DirectionsService();

    segments.forEach((seg) => {
      const mode = transportToTravelMode(seg.mode, G);
      if (!mode) {
        // 移動手段なし → 直線（点線）で結ぶ
        const line = new G.Polyline({
          path: [seg.from, seg.to],
          geodesic: true,
          strokeColor: '#14A37C',
          strokeOpacity: 0,
          icons: [
            {
              icon: {
                path: G.SymbolPath.CIRCLE,
                fillColor: '#14A37C',
                fillOpacity: 1,
                strokeOpacity: 0,
                scale: 3,
              },
              offset: '0',
              repeat: '14px',
            },
          ],
          map,
        });
        created.push(line);
        return;
      }

      service.route(
        {
          origin: seg.from,
          destination: seg.to,
          travelMode: mode,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result: any, status: string) => {
          if (cancelled) return;
          if (status !== 'OK' || !result?.routes?.[0]?.overview_path) {
            // 取得できなかった区間は直線フォールバック
            const fallback = new G.Polyline({
              path: [seg.from, seg.to],
              geodesic: true,
              strokeColor: '#14A37C',
              strokeOpacity: 0,
              icons: [
                {
                  icon: {
                    path: G.SymbolPath.CIRCLE,
                    fillColor: '#14A37C',
                    fillOpacity: 1,
                    strokeOpacity: 0,
                    scale: 3,
                  },
                  offset: '0',
                  repeat: '14px',
                },
              ],
              map,
            });
            created.push(fallback);
            return;
          }
          const line = new G.Polyline({
            path: result.routes[0].overview_path,
            geodesic: true,
            strokeColor: '#0D7A5C',
            strokeOpacity: 0.85,
            strokeWeight: 4,
            map,
          });
          created.push(line);
        },
      );
    });

    return () => {
      cancelled = true;
      for (const l of created) l.setMap(null);
    };
  }, [map, segments]);
  return null;
}

function FitBounds({ points }: { points: Point[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;
    if (points.length === 1) {
      map.setCenter({ lat: points[0]!.spot.lat, lng: points[0]!.spot.lng });
      map.setZoom(15);
      return;
    }
    const bounds = new G.LatLngBounds();
    points.forEach((p) => bounds.extend({ lat: p.spot.lat, lng: p.spot.lng }));
    map.fitBounds(bounds, 48);
  }, [map, points]);
  return null;
}

type Props = {
  spots: Spot[];
  articleType: 'spot_guide' | 'itinerary';
  itineraryBlocks?: ArticleItineraryBlock[] | null;
};

function ArticleSpotsMapBody({ spots, articleType, itineraryBlocks }: Props) {
  // 旅程記事のときは itineraryBlocks の順序にしたがって番号付きで並べる。
  // それ以外（spot_guide）はスポット配列の順序で番号なしピンを表示。
  const { points, segments } = useMemo(() => {
    const valid = spots.filter(
      (s): s is Spot =>
        Boolean(s) &&
        typeof s.lat === 'number' &&
        typeof s.lng === 'number' &&
        Number.isFinite(s.lat) &&
        Number.isFinite(s.lng),
    );
    const byId = new Map(valid.map((s) => [s.id, s]));

    if (articleType === 'itinerary' && itineraryBlocks?.length) {
      const ordered: Point[] = [];
      const segs: Array<{
        from: { lat: number; lng: number };
        to: { lat: number; lng: number };
        mode: ArticleItineraryBlock['transportToNext'];
      }> = [];
      let prevSpot: Spot | null = null;
      let prevBlock: ArticleItineraryBlock | null = null;
      let n = 1;
      for (const b of itineraryBlocks) {
        if (!b.spotId) continue;
        const s = byId.get(b.spotId);
        if (!s) continue;
        ordered.push({ spot: s, label: n++ });
        if (prevSpot && prevBlock) {
          segs.push({
            from: { lat: prevSpot.lat, lng: prevSpot.lng },
            to: { lat: s.lat, lng: s.lng },
            // 直前ブロックの transportToNext = 「その地点から次の地点へ」の手段
            mode: prevBlock.transportToNext ?? null,
          });
        }
        prevSpot = s;
        prevBlock = b;
      }
      // itinerary に出てこないスポットも一応番号なしで残す（接続線は引かない）
      const usedIds = new Set(ordered.map((p) => p.spot.id));
      for (const s of valid) {
        if (!usedIds.has(s.id)) ordered.push({ spot: s });
      }
      return { points: ordered, segments: segs };
    }

    return {
      points: valid.map((s) => ({ spot: s })),
      segments: [] as Array<{
        from: { lat: number; lng: number };
        to: { lat: number; lng: number };
        mode: ArticleItineraryBlock['transportToNext'];
      }>,
    };
  }, [spots, articleType, itineraryBlocks]);

  const center = useMemo(() => {
    if (points.length === 0) return { lat: 48.8566, lng: 2.3522 };
    return {
      lat: points.reduce((a, p) => a + p.spot.lat, 0) / points.length,
      lng: points.reduce((a, p) => a + p.spot.lng, 0) / points.length,
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg bg-primary-50/40 text-[13px] text-primary-700 ring-1 ring-primary-100">
        スポットの位置情報が登録されていません
      </div>
    );
  }

  return (
    <div
      className="locore-map-canvas overflow-hidden rounded-lg ring-1 ring-primary-100"
      style={{ position: 'relative', height: 360 }}
    >
      <GoogleMap
        defaultCenter={center}
        defaultZoom={13}
        gestureHandling="cooperative"
        disableDefaultUI
        clickableIcons={false}
        styles={locoreMapStyles}
        style={{ width: '100%', height: '100%' }}
      >
        <FitBounds points={points} />
        {articleType === 'itinerary' && segments.length > 0 ? (
          <DirectionsPolylines segments={segments} />
        ) : articleType === 'itinerary' ? (
          <StraightPolyline points={points} />
        ) : null}
        <MarkersLayer
          points={points}
          numbered={articleType === 'itinerary'}
        />
      </GoogleMap>
    </div>
  );
}

export function ArticleSpotsMap({
  spots,
  articleType,
  itineraryBlocks,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // 位置情報を持つスポットが 1 つもない場合は何も出さない（記事下部のノイズ削減）
  const hasAny = spots.some(
    (s) =>
      typeof s?.lat === 'number' &&
      typeof s?.lng === 'number' &&
      Number.isFinite(s.lat) &&
      Number.isFinite(s.lng),
  );
  if (!hasAny) return null;

  if (!apiKey) {
    return (
      <section>
        <h3 className="mb-3 text-[16px] font-bold tracking-tight">
          スポット地図
        </h3>
        <div className="flex h-[200px] items-center justify-center rounded-lg bg-primary-50/40 text-[12px] text-primary-700 ring-1 ring-primary-100">
          Google Maps API キーが未設定です（NEXT_PUBLIC_GOOGLE_MAPS_API_KEY）
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-[16px] font-bold tracking-tight">
          スポット地図
          <span className="ml-2 text-[12px] font-medium text-foreground/50">
            {articleType === 'itinerary'
              ? '旅程の順序でルート表示'
              : `${spots.length} 箇所`}
          </span>
        </h3>
      </div>
      <APIProvider apiKey={apiKey}>
        <ArticleSpotsMapBody
          spots={spots}
          articleType={articleType}
          itineraryBlocks={itineraryBlocks}
        />
      </APIProvider>
    </section>
  );
}
