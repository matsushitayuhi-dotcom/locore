'use client';

import { useEffect, useMemo } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import type { TripDay } from '../lib/mock';
import { getSpot } from '../lib/mock';
import { locoreMapStyles } from './map/locoreMapStyle';

/**
 * 旅程の1日のスポットを Google Maps 上に並べ、順序を Polyline で繋ぐコンポーネント。
 * Google Maps の標準 UI/POI を全て切り、Locore の独自スタイルだけを残す。
 */

type Point = { spot: NonNullable<ReturnType<typeof getSpot>>; label: number };

function PolylineLayer({ points }: { points: Point[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length < 2) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Polyline = (window as any).google?.maps?.Polyline;
    if (!Polyline) return;
    const line = new Polyline({
      path: points.map((p) => ({ lat: p.spot.lat, lng: p.spot.lng })),
      geodesic: true,
      strokeColor: '#14A37C',
      strokeOpacity: 0,
      icons: [
        {
          icon: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            path: (window as any).google.maps.SymbolPath.CIRCLE,
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

function TripDayMapBody({ day }: { day: TripDay }) {
  const points: Point[] = useMemo(
    () =>
      day.items
        .map((item, i) => {
          const s = item.spotId ? getSpot(item.spotId) : null;
          return s ? { spot: s, label: i + 1 } : null;
        })
        .filter((p): p is Point => Boolean(p)),
    [day],
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
    <GoogleMap
      defaultCenter={center}
      defaultZoom={13}
      gestureHandling="cooperative"
      disableDefaultUI
      clickableIcons={false}
      mapId="locore-trip-day-map"
      styles={locoreMapStyles}
      className="locore-map-canvas"
      style={{ width: '100%', height: '100%' }}
    >
      <PolylineLayer points={points} />
      {points.map((p) => (
        <AdvancedMarker
          key={p.spot.id}
          position={{ lat: p.spot.lat, lng: p.spot.lng }}
          title={p.spot.name}
        >
          <span
            className="locore-pin"
            style={{ background: '#14A37C' }}
            aria-label={`${p.label} ${p.spot.name}`}
          >
            {p.label}
          </span>
        </AdvancedMarker>
      ))}
    </GoogleMap>
  );
}

export function TripDayMap({ day }: { day: TripDay }) {
  // クライアントの env 経由で API キーを取得（Server から渡してもいいが
  // この component は Trip 詳細など複数所から呼ばれるので簡略化）
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
    <div style={{ height: 260 }}>
      <APIProvider apiKey={apiKey} libraries={['marker']}>
        <TripDayMapBody day={day} />
      </APIProvider>
    </div>
  );
}
