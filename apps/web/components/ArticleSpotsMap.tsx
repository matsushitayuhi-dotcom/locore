'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  InfoWindow,
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
 * クリック動作:
 *  - ピンをクリック → スポット名 / 住所を InfoWindow
 *  - 移動手段アイコンをクリック → 区間の移動手段詳細を InfoWindow
 */

type Point = { spot: Spot; label?: number };

type Segment = {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  fromName: string;
  toName: string;
  fromLabel?: number;
  toLabel?: number;
  mode: ArticleItineraryBlock['transportToNext'];
  transportNote?: string | null;
  minutes?: number | null;
};

const TRANSPORT_LABEL: Record<string, string> = {
  walk: '徒歩',
  metro: 'メトロ',
  bus: 'バス',
  train: '電車',
  taxi: 'タクシー',
  bike: '自転車',
  other: 'その他',
};

const PIN_COLOR = '#D4634A'; // primary-500 amber

function formatDuration(min: number | null | undefined): string {
  if (!min || min <= 0) return '';
  if (min < 60) return `${min}分`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

/** 「線（出発駅 → 到着駅）」形式の transportNote を分解 */
function parseTransitNote(note: string | null | undefined): {
  line: string;
  from: string;
  to: string;
} | null {
  if (!note) return null;
  const m = note.match(/^(.+?)（(.+?)\s*→\s*(.+?)）\s*$/);
  if (!m) return { line: note.trim(), from: '', to: '' };
  return {
    line: m[1]!.trim(),
    from: m[2]!.trim(),
    to: m[3]!.trim(),
  };
}

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

/** 移動手段アイコン（白丸 + Material Icons 風シルエット）*/
function transportIconSvg(
  mode: ArticleItineraryBlock['transportToNext'],
): string | null {
  const paths: Record<string, string> = {
    walk:
      'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7Z',
    bike:
      'M5 20.5C3.62 20.5 2.5 19.38 2.5 18S3.62 15.5 5 15.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM5 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm6.8-3l1.9-1.9.6.6C15.35 11.65 16.71 12.2 18.4 12.2V10.3c-1.18 0-2.05-.34-2.78-1.07l-1.5-1.5c-.55-.55-1.18-.62-1.6-.62s-1.05.07-1.6.62L7.5 10.3c-.39.39-.39 1.02 0 1.41l3.3 3.3v3.6h2v-5.1l-1-1zM10 5.5c.83 0 1.5-.67 1.5-1.5S10.83 2.5 10 2.5 8.5 3.17 8.5 4 9.17 5.5 10 5.5zM19 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    taxi:
      'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
    transit:
      'M12 2c-4.42 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zM11 11H6V6h5v5zm2 0V6h5v5h-5zm3.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    other:
      'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  };
  let key: string;
  if (mode === 'walk') key = 'walk';
  else if (mode === 'bike') key = 'bike';
  else if (mode === 'taxi') key = 'taxi';
  else if (mode === 'metro' || mode === 'bus' || mode === 'train')
    key = 'transit';
  else key = 'other';
  const inner = paths[key]!;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 28 28">` +
    `<defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feDropShadow dx="0" dy="0.5" stdDeviation="0.6" flood-opacity="0.4"/>` +
    `</filter></defs>` +
    `<circle cx="14" cy="14" r="13" fill="white" stroke="${PIN_COLOR}" stroke-width="1.6" filter="url(#s)"/>` +
    `<g transform="translate(2 2)" fill="${PIN_COLOR}">` +
    `<path d="${inner}"/>` +
    `</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function midpointOf(path: any[]): { lat: number; lng: number } | null {
  if (!path || path.length === 0) return null;
  const mid = path[Math.floor(path.length / 2)];
  if (!mid) return null;
  if (typeof mid.lat === 'function' && typeof mid.lng === 'function') {
    return { lat: mid.lat(), lng: mid.lng() };
  }
  if (typeof mid.lat === 'number' && typeof mid.lng === 'number') {
    return { lat: mid.lat, lng: mid.lng };
  }
  return null;
}

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

function MarkersLayer({
  points,
  numbered,
  onPointClick,
}: {
  points: Point[];
  numbered: boolean;
  onPointClick: (p: Point) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;
    const markersAndListeners = points.map((p) => {
      const url =
        numbered && typeof p.label === 'number'
          ? makeNumberedPinSvg(PIN_COLOR, p.label)
          : makePlainPinSvg(PIN_COLOR);
      const m = new G.Marker({
        position: { lat: p.spot.lat, lng: p.spot.lng },
        map,
        title: numbered && p.label ? `${p.label}. ${p.spot.name}` : p.spot.name,
        icon: {
          url,
          scaledSize: new G.Size(numbered ? 32 : 28, numbered ? 32 : 28),
          anchor: new G.Point(numbered ? 16 : 14, numbered ? 16 : 14),
        },
        zIndex: 2,
      });
      const listener = m.addListener('click', () => onPointClick(p));
      return { m, listener };
    });
    return () => {
      markersAndListeners.forEach(({ m, listener }) => {
        listener.remove?.();
        m.setMap(null);
      });
    };
  }, [map, points, numbered, onPointClick]);
  return null;
}

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
      strokeColor: PIN_COLOR,
      strokeOpacity: 0,
      icons: [
        {
          icon: {
            path: G.SymbolPath.CIRCLE,
            fillColor: PIN_COLOR,
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

function DirectionsPolylines({
  segments,
  onSegmentClick,
}: {
  segments: Segment[];
  onSegmentClick: (segIdx: number, mid: { lat: number; lng: number }) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || segments.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;

    const created: Array<{
      m?: { setMap: (m: unknown) => void };
      listener?: { remove?: () => void };
    }> = [];
    let cancelled = false;

    const service = new G.DirectionsService();

    const placeIcon = (
      idx: number,
      pos: { lat: number; lng: number },
      mode: ArticleItineraryBlock['transportToNext'],
    ) => {
      const url = transportIconSvg(mode);
      if (!url) return;
      const marker = new G.Marker({
        position: pos,
        map,
        clickable: true,
        zIndex: 5,
        cursor: 'pointer',
        icon: {
          url,
          scaledSize: new G.Size(36, 36),
          anchor: new G.Point(18, 18),
        },
      });
      const listener = marker.addListener('click', () =>
        onSegmentClick(idx, pos),
      );
      created.push({ m: marker, listener });
    };

    const dashedFallback = (seg: Segment, idx: number) => {
      const line = new G.Polyline({
        path: [seg.from, seg.to],
        geodesic: true,
        strokeColor: PIN_COLOR,
        strokeOpacity: 0,
        icons: [
          {
            icon: {
              path: G.SymbolPath.CIRCLE,
              fillColor: PIN_COLOR,
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
      created.push({ m: line });
      const midPos = {
        lat: (seg.from.lat + seg.to.lat) / 2,
        lng: (seg.from.lng + seg.to.lng) / 2,
      };
      placeIcon(idx, midPos, seg.mode);
    };

    segments.forEach((seg, idx) => {
      const mode = transportToTravelMode(seg.mode, G);
      if (!mode) {
        dashedFallback(seg, idx);
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
            dashedFallback(seg, idx);
            return;
          }
          const path = result.routes[0].overview_path;
          const line = new G.Polyline({
            path,
            geodesic: true,
            strokeColor: PIN_COLOR,
            strokeOpacity: 0.85,
            strokeWeight: 4,
            map,
          });
          created.push({ m: line });
          const mid = midpointOf(path);
          if (mid) placeIcon(idx, mid, seg.mode);
        },
      );
    });

    return () => {
      cancelled = true;
      for (const c of created) {
        c.listener?.remove?.();
        c.m?.setMap(null);
      }
    };
  }, [map, segments, onSegmentClick]);
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
  articleType: 'spot_guide' | 'itinerary' | 'expat_info' | 'photo_journal';
  itineraryBlocks?: ArticleItineraryBlock[] | null;
};

function ArticleSpotsMapBody({ spots, articleType, itineraryBlocks }: Props) {
  type Selected =
    | { kind: 'spot'; point: Point }
    | { kind: 'segment'; segment: Segment; mid: { lat: number; lng: number } }
    | null;
  const [selected, setSelected] = useState<Selected>(null);

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
      const segs: Segment[] = [];
      let prevSpot: Spot | null = null;
      let prevBlock: ArticleItineraryBlock | null = null;
      let prevLabel: number | undefined = undefined;
      let n = 1;
      for (const b of itineraryBlocks) {
        if (!b.spotId) continue;
        const s = byId.get(b.spotId);
        if (!s) continue;
        const currentLabel = n++;
        ordered.push({ spot: s, label: currentLabel });
        if (prevSpot && prevBlock) {
          segs.push({
            from: { lat: prevSpot.lat, lng: prevSpot.lng },
            to: { lat: s.lat, lng: s.lng },
            fromName: prevSpot.name,
            toName: s.name,
            fromLabel: prevLabel,
            toLabel: currentLabel,
            mode: prevBlock.transportToNext ?? null,
            transportNote: prevBlock.transportNote ?? null,
            minutes: prevBlock.travelMinutesAfter ?? null,
          });
        }
        prevSpot = s;
        prevBlock = b;
        prevLabel = currentLabel;
      }
      const usedIds = new Set(ordered.map((p) => p.spot.id));
      for (const s of valid) {
        if (!usedIds.has(s.id)) ordered.push({ spot: s });
      }
      return { points: ordered, segments: segs };
    }

    return {
      points: valid.map((s) => ({ spot: s })),
      segments: [] as Segment[],
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
      <div className="flex h-[320px] items-center justify-center rounded-lg bg-primary-500/10 text-[13px] text-primary-300 ring-1 ring-border">
        スポットの位置情報が登録されていません
      </div>
    );
  }

  return (
    <div
      className="locore-map-canvas overflow-hidden rounded-lg ring-1 ring-border"
      style={{ position: 'relative', height: 360 }}
    >
      <GoogleMap
        defaultCenter={center}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        styles={locoreMapStyles}
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelected(null)}
      >
        <FitBounds points={points} />
        {articleType === 'itinerary' && segments.length > 0 ? (
          <DirectionsPolylines
            segments={segments}
            onSegmentClick={(idx, mid) => {
              const segment = segments[idx];
              if (segment) setSelected({ kind: 'segment', segment, mid });
            }}
          />
        ) : articleType === 'itinerary' ? (
          <StraightPolyline points={points} />
        ) : null}
        <MarkersLayer
          points={points}
          numbered={articleType === 'itinerary'}
          onPointClick={(p) => setSelected({ kind: 'spot', point: p })}
        />

        {/* スポットの InfoWindow */}
        {selected?.kind === 'spot' ? (
          <InfoWindow
            position={{
              lat: selected.point.spot.lat,
              lng: selected.point.spot.lng,
            }}
            pixelOffset={[0, -18]}
            onCloseClick={() => setSelected(null)}
          >
            <div className="min-w-[200px] p-1 text-foreground">
              {typeof selected.point.label === 'number' ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary-700">
                  #{String(selected.point.label).padStart(2, '0')}
                </p>
              ) : null}
              <p className="mt-0.5 text-[14px] font-semibold leading-snug">
                {selected.point.spot.name}
              </p>
              {selected.point.spot.address ? (
                <p className="mt-1 text-[11px] leading-relaxed text-neutral-600">
                  {selected.point.spot.address}
                </p>
              ) : null}
            </div>
          </InfoWindow>
        ) : null}

        {/* 移動手段の InfoWindow */}
        {selected?.kind === 'segment' ? (
          <SegmentInfoWindow
            segment={selected.segment}
            position={selected.mid}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </GoogleMap>
    </div>
  );
}

function SegmentInfoWindow({
  segment,
  position,
  onClose,
}: {
  segment: Segment;
  position: { lat: number; lng: number };
  onClose: () => void;
}) {
  const modeKey = segment.mode ?? 'other';
  const isTransit =
    modeKey === 'metro' || modeKey === 'bus' || modeKey === 'train';
  const modeLabel = TRANSPORT_LABEL[modeKey] ?? 'その他';
  const transit = isTransit ? parseTransitNote(segment.transportNote) : null;
  const durationLabel = formatDuration(segment.minutes);

  return (
    <InfoWindow
      position={position}
      pixelOffset={[0, -18]}
      onCloseClick={onClose}
    >
      <div className="min-w-[220px] p-1 text-foreground">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary-700">
          {modeLabel}
        </p>
        {isTransit && transit ? (
          <div className="mt-1 space-y-0.5 text-[12px] leading-snug">
            {transit.line ? (
              <p className="font-semibold text-neutral-900">{transit.line}</p>
            ) : null}
            {transit.from || transit.to ? (
              <p className="text-neutral-600">
                {transit.from || '？'} → {transit.to || '？'}
              </p>
            ) : null}
            {durationLabel ? (
              <p className="text-neutral-500">所要 {durationLabel}</p>
            ) : null}
          </div>
        ) : (
          <div className="mt-1 space-y-0.5 text-[12px] leading-snug">
            <p className="text-neutral-700">
              {segment.fromName}
              {' → '}
              {segment.toName}
            </p>
            {durationLabel ? (
              <p className="font-semibold text-neutral-900">{durationLabel}</p>
            ) : (
              <p className="text-neutral-500 italic">所要時間未設定</p>
            )}
            {segment.transportNote ? (
              <p className="text-neutral-500">{segment.transportNote}</p>
            ) : null}
          </div>
        )}
      </div>
    </InfoWindow>
  );
}

export function ArticleSpotsMap({
  spots,
  articleType,
  itineraryBlocks,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
        <div className="flex h-[200px] items-center justify-center rounded-lg bg-primary-500/10 text-[12px] text-primary-300 ring-1 ring-border">
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
              ? '旅程の順序でルート表示 / ピン・アイコンをタップで詳細'
              : `${spots.length} 箇所 / ピンをタップで詳細`}
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
