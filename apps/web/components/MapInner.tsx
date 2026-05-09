'use client';

import { useEffect, useMemo } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  useMap,
} from '@vis.gl/react-google-maps';
import type { Article, Spot } from '../lib/mock';
import { locoreMapStyles, pinColorForScore } from './map/locoreMapStyle';

const PARIS_CENTER = { lat: 48.8606, lng: 2.3376 };

/**
 * Google Maps をベースに、Google らしさ（POI / business / labels / 標準コントロール）を
 * 抑えた独自スタイルで描画するマップ。
 *
 * 設計メモ:
 *   - `mapId` を指定すると Google が JS の `styles` プロパティを無視するため、
 *     Locore の emerald 単色スタイルを保つために mapId は使わない。
 *   - mapId が無いと `AdvancedMarker` が描画できないため、native の
 *     `google.maps.Marker` を `useMap()` 経由で手動描画する。
 *   - ピンの形は SVG（円）を data URL にして渡す。色は local score 連動。
 *   - 観光客密度ヒートマップは半透明の Circle を自前で描画。
 */

interface MapInnerProps {
  spots: Spot[];
  articles: Article[];
  onPinClick?: (spot: Spot) => void;
  showHeatmap?: boolean;
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

function HeatmapCircles() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;
    const circles = ARRONDISSEMENT_DENSITY.map((d) => {
      const c = new G.Circle({
        center: d.center,
        radius: 350 + d.intensity * 200,
        map,
        strokeWeight: 0,
        // 観光客密度はやや暖色寄りにせず、warning 系のくすんだ橙でほのめかす程度
        fillColor: '#B8860B',
        fillOpacity: 0.1 + d.intensity * 0.12,
        clickable: false,
      });
      return c as { setMap: (m: unknown) => void };
    });
    return () => {
      circles.forEach((c) => c.setMap(null));
    };
  }, [map]);
  return null;
}

/** SVG の円ピンを data URL にして返す（color は HEX） */
function makePinSvg(color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">` +
    `<circle cx="14" cy="14" r="11" fill="${color}" stroke="white" stroke-width="2"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * native google.maps.Marker を React 経由で描画するレイヤー。
 * AdvancedMarker は mapId 必須のため避けて、こちらで実装。
 */
function MarkersLayer({
  spots,
  articleScore,
  onPinClick,
}: {
  spots: Spot[];
  articleScore: Record<string, number>;
  onPinClick?: (spot: Spot) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;
    const markers = spots.map((s) => {
      const score = articleScore[s.articleId] ?? 50;
      const color = pinColorForScore(score);
      const m = new G.Marker({
        position: { lat: s.lat, lng: s.lng },
        map,
        title: s.name,
        icon: {
          url: makePinSvg(color),
          scaledSize: new G.Size(28, 28),
          anchor: new G.Point(14, 14),
        },
      });
      const listener = m.addListener('click', () => onPinClick?.(s));
      return { m, listener };
    });
    return () => {
      markers.forEach(({ m, listener }) => {
        listener.remove?.();
        m.setMap(null);
      });
    };
  }, [map, spots, articleScore, onPinClick]);
  return null;
}

/**
 * `<Map>` を `position: absolute; inset: 0` の明示ラッパー内に置くことで
 * 親の高さがどうあれ確実にコンテナを埋めるようにする。
 * `style={{ height: '100%' }}` 単体だと親の `h-[calc(100vh-56px)]` が
 * （Next.js のレイアウト経由で）解決しないケースがあった。
 *
 * `styles` は `mapOptions` 経由で渡す。@vis.gl の実装/バージョンによって
 * トップレベル prop の `styles` が無視されることがあるため。
 */
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
    <div
      className="locore-map-canvas"
      style={{ position: 'absolute', inset: 0 }}
    >
      <GoogleMap
        defaultCenter={PARIS_CENTER}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        styles={locoreMapStyles}
        style={{ width: '100%', height: '100%' }}
      >
        {showHeatmap ? <HeatmapCircles /> : null}
        <MarkersLayer
          spots={spots}
          articleScore={articleScore}
          onPinClick={onPinClick}
        />
      </GoogleMap>
    </div>
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
    <APIProvider apiKey={apiKey}>
      <MapBody
        spots={spots}
        articles={articles}
        onPinClick={onPinClick}
        showHeatmap={showHeatmap}
      />
    </APIProvider>
  );
}
