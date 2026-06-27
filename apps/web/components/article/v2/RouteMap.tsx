'use client';

import { useEffect, useMemo } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  useMap,
} from '@vis.gl/react-google-maps';
import { locoreMapStyles } from '../../map/locoreMapStyle';

/**
 * 記事 v2 の「無料概観マップ」用の本物の Google マップ（Maps JS API）。
 *
 * 既存 ArticleSpotsMap.tsx と同じローダ（@vis.gl/react-google-maps の APIProvider /
 * Map / useMap）・同じ API キー（NEXT_PUBLIC_GOOGLE_MAPS_API_KEY）を再利用する。
 * ブランドのライム配色で:
 *   - ルート線 = ライムのポリライン（mode='route' のとき・order 順に結ぶ）
 *   - マーカー = ライム塗りの番号ピン（写真は使わない・1..N の番号）
 *   - 全ピンが収まるよう fitBounds
 *
 * これは「ルート形状＋ピン位置」だけの無料概観で、有料情報（名称詳細・写真）は出さない。
 * 既存の詳細スポット地図 ArticleSpotsMap（解放時）は別物として現状維持。
 *
 * フォールバック: API キー未設定 / 有効な座標が無いときは null を返す（呼び出し側で
 * 「Google マップでルート」リンク等にグレースフルに退避）。クラッシュさせない。
 */

const LIME = '#A8E01C';
const LIME_DARK = '#3f5c08'; // 番号の視認用（ライム上で読める濃色）

export type RoutePoint = {
  lat: number;
  lng: number;
  name: string;
  /** 1 始まりの番号（route モードでは順番、pins モードでもピンに付与）。 */
  label: number;
};

/** ライム塗りの番号ピン（円 + 中央に濃色の番号）。写真は使わない。 */
function makeLimeNumberedPinSvg(label: number): string {
  const big = label >= 10;
  const fontSize = big ? 11 : 13;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">` +
    `<circle cx="15" cy="15" r="12" fill="${LIME}" stroke="#ffffff" stroke-width="2.5"/>` +
    `<text x="15" y="15" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="${LIME_DARK}">` +
    `${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function LimeMarkers({ points }: { points: RoutePoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;
    const markers = points.map((p) => {
      const url = makeLimeNumberedPinSvg(p.label);
      return new G.Marker({
        position: { lat: p.lat, lng: p.lng },
        map,
        title: `${p.label}. ${p.name}`,
        icon: {
          url,
          scaledSize: new G.Size(30, 30),
          anchor: new G.Point(15, 15),
        },
        zIndex: 2,
      });
    });
    return () => {
      markers.forEach((m) => m.setMap(null));
    };
  }, [map, points]);
  return null;
}

/** order 順に結ぶライムのポリライン（route モードのみ）。 */
function LimePolyline({ points }: { points: RoutePoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length < 2) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;
    const line = new G.Polyline({
      path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
      geodesic: true,
      strokeColor: LIME,
      strokeOpacity: 0.95,
      strokeWeight: 4,
      map,
    });
    return () => {
      line.setMap(null);
    };
  }, [map, points]);
  return null;
}

function FitBounds({ points }: { points: RoutePoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;
    if (points.length === 1) {
      map.setCenter({ lat: points[0]!.lat, lng: points[0]!.lng });
      map.setZoom(15);
      return;
    }
    const bounds = new G.LatLngBounds();
    points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 56);
  }, [map, points]);
  return null;
}

export type RouteMapProps = {
  points: RoutePoint[];
  /** 'route' = order 順のライム線で結ぶ / 'pins' = ピンのみ（順路なし）。 */
  mode: 'route' | 'pins';
  /** 地図コンテナの高さ（px）。既定 420。 */
  height?: number;
};

function RouteMapBody({ points, mode, height = 420 }: RouteMapProps) {
  const center = useMemo(() => {
    if (points.length === 0) return { lat: 48.8566, lng: 2.3522 };
    return {
      lat: points.reduce((a, p) => a + p.lat, 0) / points.length,
      lng: points.reduce((a, p) => a + p.lng, 0) / points.length,
    };
  }, [points]);

  return (
    <div
      className="locore-map-canvas"
      style={{ position: 'absolute', inset: 0, width: '100%', height }}
    >
      <GoogleMap
        defaultCenter={center}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        styles={locoreMapStyles}
        style={{ width: '100%', height: '100%' }}
      >
        <FitBounds points={points} />
        {mode === 'route' ? <LimePolyline points={points} /> : null}
        <LimeMarkers points={points} />
      </GoogleMap>
    </div>
  );
}

/**
 * 無料概観マップ。キー未設定 / 有効座標なしのときは null（呼び出し側でリンク退避）。
 */
export function RouteMap({ points, mode, height }: RouteMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  if (points.length === 0) return null;
  return (
    <APIProvider apiKey={apiKey}>
      <RouteMapBody points={points} mode={mode} height={height} />
    </APIProvider>
  );
}
