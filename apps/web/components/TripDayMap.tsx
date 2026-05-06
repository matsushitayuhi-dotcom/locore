'use client';

import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useMemo } from 'react';
import type { TripDay } from '../lib/mock';
import { getSpot } from '../lib/mock';

function makeIcon(label: string) {
  return L.divIcon({
    className: 'locore-pin-wrapper',
    html: `<span class="locore-pin locore-pin--mid" style="background:#3d4f8c">${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function TripDayMap({ day }: { day: TripDay }) {
  const points = useMemo(
    () =>
      day.items
        .map((item, i) => {
          const s = item.spotId ? getSpot(item.spotId) : null;
          return s ? { spot: s, label: i + 1 } : null;
        })
        .filter(Boolean) as { spot: ReturnType<typeof getSpot>; label: number }[],
    [day],
  );

  if (points.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center bg-muted text-[13px] text-foreground/50">
        この日のスポット情報なし
      </div>
    );
  }

  const center: [number, number] = [
    points.reduce((a, p) => a + p.spot!.lat, 0) / points.length,
    points.reduce((a, p) => a + p.spot!.lng, 0) / points.length,
  ];

  const polyline: [number, number][] = points.map((p) => [
    p.spot!.lat,
    p.spot!.lng,
  ]);

  return (
    <div style={{ height: 260 }}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Polyline
          positions={polyline}
          pathOptions={{ color: '#3d4f8c', weight: 3, opacity: 0.7, dashArray: '6 6' }}
        />
        {points.map((p) => (
          <Marker
            key={p.spot!.id}
            position={[p.spot!.lat, p.spot!.lng]}
            icon={makeIcon(String(p.label))}
          />
        ))}
      </MapContainer>
    </div>
  );
}
