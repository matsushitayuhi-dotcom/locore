'use client';

import { useEffect, useMemo } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import type { Article, Spot } from '../lib/mock';
import {
  locoreMapStyles,
  pinModifierClass,
} from './map/locoreMapStyle';

const PARIS_CENTER = { lat: 48.8606, lng: 2.3376 };

/**
 * Google Maps をベースに、Google らしさ（POI / business / labels / 標準コントロール）を
 * 抑えた独自スタイルで描画するマップ。
 *
 * - APIProvider は MapInner 内に持たせる（ページ側のラップ忘れを避ける）
 * - スタイルは `components/map/locoreMapStyle.ts` の配列で集中管理
 * - マーカーは AdvancedMarker + HTML（locore-pin）で Locore のピンに統一
 * - 観光客密度ヒートマップは Google の HeatmapLayer を使わず、
 *   半透明の円（自前で <Circle> を描画）で Locore 風に維持
 */

interface MapInnerProps {
  spots: Spot[];
  articles: Article[];
  onPinClick?: (spot: Spot) => void;
  showHeatmap?: boolean;
  /** Google Maps API キー（NEXT_PUBLIC_GOOGLE_MAPS_API_KEY） */
  apiKey?: string;
}

const ARRONDISSEMENT_DENSITY: { center: { lat: number; lng: number }; intensity: number }[] = [
  { center: { lat: 48.8606, lng: 2.3376 }, intensity: 0.85 },
  { center: { lat: 48.8674, lng: 2.3617 }, intensity: 0.55 },
  { center: { lat: 48.852, lng: 2.3433 }, intensity: 0.65 },
  { center: { lat: 48.853, lng: 2.3325 }, intensity: 0.6 },
  { center: { lat: 48.8584, lng: 2.2945 }, intensity: 0.95 },
  { center: { lat: 48.8867, lng: 2.343 }, intensity: 0.75 },
  { center: { lat: 48.8718, lng: 2.3658 }, intensity: 0.35 },
  { center: { lat: 48.8639, lng: 2.3786 }, intensity: 0.25 },
  { center: { lat: 48.872, lng: 2.385 }, intensity: 0.2 },
  { center: { lat: 48.825, lng: 2.36 }, intensity: 0.3 },
];

/**
 * Google Maps の Circle は @vis.gl/react-google-maps から直接 export されてないので、
 * useMap() でインスタンスを掴んで native Circle を描く。
 */
function HeatmapCircles() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const circles = ARRONDISSEMENT_DENSITY.map((d) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Circle = (window as any).google?.maps?.Circle;
      if (!Circle) return null;
      const c = new Circle({
        center: d.center,
        radius: 350 + d.intensity * 200,
        map,
        strokeWeight: 0,
        fillColor: '#FF7A59',
        fillOpacity: 0.16 + d.intensity * 0.18,
        clickable: false,
      });
      return c as { setMap: (m: unknown) => void };
    }).filter(Boolean) as { setMap: (m: unknown) => void }[];
    return () => {
      circles.forEach((c) => c.setMap(null));
    };
  }, [map]);
  return null;
}

function MapBody({
  spots,
  articles,
  onPinClick,
  showHeatmap,
}: Omit<MapInnerProps, 'apiKey'>) {
  const articleScore = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of articles) out[a.id] = a.localScoreAverage;
    return out;
  }, [articles]);

  return (
    <GoogleMap
      defaultCenter={PARIS_CENTER}
      defaultZoom={13}
      gestureHandling="greedy"
      disableDefaultUI
      clickableIcons={false}
      mapId="locore-map"
      styles={locoreMapStyles}
      className="locore-map-canvas"
      style={{ width: '100%', height: '100%' }}
    >
      {showHeatmap ? <HeatmapCircles /> : null}
      {spots.map((s) => {
        const score = articleScore[s.articleId] ?? 50;
        const cls = pinModifierClass(score);
        return (
          <AdvancedMarker
            key={s.id}
            position={{ lat: s.lat, lng: s.lng }}
            onClick={() => onPinClick?.(s)}
            title={s.name}
          >
            <span className={`locore-pin ${cls}`} aria-label={s.name} />
          </AdvancedMarker>
        );
      })}
    </GoogleMap>
  );
}

export function MapInner({ spots, articles, onPinClick, showHeatmap, apiKey }: MapInnerProps) {
  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-primary-50/40 px-6 text-center">
        <div className="max-w-md">
          <p className="text-[14px] font-semibold text-primary-700">
            地図を表示するには Google Maps API キーが必要です
          </p>
          <p className="mt-2 text-[12px] text-foreground/60">
            <code className="rounded-sm bg-card px-1 py-0.5 text-[11px]">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            </code>{' '}
            を <code className="rounded-sm bg-card px-1 py-0.5 text-[11px]">.env.local</code>{' '}
            に設定して再起動すると、Locore 仕様の独自スタイルでマップが表示されます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['marker']}>
      <MapBody
        spots={spots}
        articles={articles}
        onPinClick={onPinClick}
        showHeatmap={showHeatmap}
      />
    </APIProvider>
  );
}
