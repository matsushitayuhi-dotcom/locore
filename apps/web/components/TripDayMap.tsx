'use client';

import { useEffect, useMemo } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  useMap,
} from '@vis.gl/react-google-maps';
import type { TripDay, Spot } from '../lib/mock';
import { locoreMapStyles } from './map/locoreMapStyle';

/**
 * 旅程の1日のスポットを Google Maps 上に並べ、順序を Polyline で繋ぐコンポーネント。
 * Google Maps の標準 UI/POI を全て切り、Locore の独自スタイルだけを残す。
 *
 * mapId は使わない（指定すると JS の styles が無視されるため）。
 * その代わり Marker と Polyline は useMap() 経由で native API を直接叩く。
 */

type Point = { spot: Spot; label: number };

/** 番号入りの emerald ピン SVG を data URL で返す */
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

function NumberedMarkers({ points }: { points: Point[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;
    const markers = points.map((p) => {
      const m = new G.Marker({
        position: { lat: p.spot.lat, lng: p.spot.lng },
        map,
        title: `${p.label}. ${p.spot.name}`,
        icon: {
          url: makeNumberedPinSvg('#0D7A5C', p.label),
          scaledSize: new G.Size(32, 32),
          anchor: new G.Point(16, 16),
        },
      });
      return m;
    });
    return () => {
      markers.forEach((m) => m.setMap(null));
    };
  }, [map, points]);
  return null;
}

function PolylineLayer({ points }: { points: Point[] }) {
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

function TripDayMapBody({
  day,
  spotsById,
}: {
  day: TripDay;
  spotsById: Map<string, Spot>;
}) {
  const points: Point[] = useMemo(
    () =>
      day.items
        .map((item, i) => {
          const s = item.spotId ? spotsById.get(item.spotId) : null;
          return s ? { spot: s, label: i + 1 } : null;
        })
        .filter((p): p is Point => Boolean(p)),
    [day, spotsById],
  );

  const center = useMemo(() => {
    if (points.length === 0) return { lat: 48.8566, lng: 2.3522 };
    return {
      lat: points.reduce((a, p) => a + p.spot.lat, 0) / points.length,
      lng: points.reduce((a, p) => a + p.spot.lng, 0) / points.length,
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center bg-primary-50/40 text-[13px] text-primary-700">
        この日のスポット情報なし
      </div>
    );
  }

  return (
    <div
      className="locore-map-canvas"
      style={{ position: 'absolute', inset: 0 }}
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
        <PolylineLayer points={points} />
        <NumberedMarkers points={points} />
      </GoogleMap>
    </div>
  );
}

export function TripDayMap({
  day,
  spotsById,
}: {
  day: TripDay;
  spotsById: Map<string, Spot>;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div
        className="flex items-center justify-center bg-primary-50/40 text-[12px] text-primary-700"
        style={{ height: 260 }}
      >
        Google Maps API キーが未設定です（NEXT_PUBLIC_GOOGLE_MAPS_API_KEY）
      </div>
    );
  }

  return (
    <div style={{ height: 260, position: 'relative' }}>
      <APIProvider apiKey={apiKey}>
        <TripDayMapBody day={day} spotsById={spotsById} />
      </APIProvider>
    </div>
  );
}
