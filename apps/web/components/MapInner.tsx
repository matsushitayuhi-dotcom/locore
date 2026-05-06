'use client';

import { MapContainer, TileLayer, Marker, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { useMemo } from 'react';
import { localScoreColor } from '@locore/ui';
import type { Article, Spot } from '../lib/mock';

const PARIS_CENTER: [number, number] = [48.8606, 2.3376];

interface MapInnerProps {
  spots: Spot[];
  articles: Article[];
  onPinClick?: (spot: Spot) => void;
  showHeatmap?: boolean;
}

function buildIcon(color: string) {
  return L.divIcon({
    className: 'locore-pin-wrapper',
    html: `<span class="locore-pin" style="background:${color}"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const ARRONDISSEMENT_DENSITY: { center: [number, number]; intensity: number }[] = [
  { center: [48.8606, 2.3376], intensity: 0.85 },
  { center: [48.8674, 2.3617], intensity: 0.55 },
  { center: [48.852, 2.3433], intensity: 0.65 },
  { center: [48.853, 2.3325], intensity: 0.6 },
  { center: [48.8584, 2.2945], intensity: 0.95 },
  { center: [48.8867, 2.343], intensity: 0.75 },
  { center: [48.8718, 2.3658], intensity: 0.35 },
  { center: [48.8639, 2.3786], intensity: 0.25 },
  { center: [48.872, 2.385], intensity: 0.2 },
  { center: [48.825, 2.36], intensity: 0.3 },
];

export function MapInner({
  spots,
  articles,
  onPinClick,
  showHeatmap,
}: MapInnerProps) {
  const articleColor = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of articles) {
      map.set(a.id, localScoreColor(a.localScoreAverage));
    }
    return map;
  }, [articles]);

  return (
    <MapContainer
      center={PARIS_CENTER}
      zoom={13}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {showHeatmap
        ? ARRONDISSEMENT_DENSITY.map((d, i) => (
            <CircleMarker
              key={`heat-${i}`}
              center={d.center}
              radius={45 + d.intensity * 20}
              pathOptions={{
                color: '#b8623f',
                weight: 0,
                fillColor: '#b8623f',
                fillOpacity: 0.18 + d.intensity * 0.18,
              }}
            />
          ))
        : null}
      {spots.map((s) => {
        const color = articleColor.get(s.articleId) ?? '#6b5b8a';
        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={buildIcon(color)}
            eventHandlers={{
              click: () => onPinClick?.(s),
            }}
          />
        );
      })}
    </MapContainer>
  );
}
