'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import type { Article, Spot } from '../lib/mock';
import { locoreMapStyles, pinColorForScore } from './map/locoreMapStyle';

const PARIS_CENTER = { lat: 48.8606, lng: 2.3376 };

/**
 * Google Maps をベースに、Google らしさを抑えた独自スタイルで描画するマップ。
 *
 * - 同じ Google Place（または同じ座標）に紐づく spots はマーカー1本に集約
 * - マーカークリックで InfoWindow を上に出し、その場所に紐づく記事を
 *   公開日降順で並べる
 */

interface MapInnerProps {
  spots: Spot[];
  articles: Article[];
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

/**
 * 「同じスポット」を表すグループ。Google Place ID があれば最優先、無ければ
 * 緯度経度を 5 桁丸めた値で集約（半径 ≈ 1m）。
 */
type SpotGroup = {
  key: string;
  name: string;
  position: { lat: number; lng: number };
  topScore: number; // 含まれる記事の最大ローカル度（ピン色用）
  articles: Article[]; // 公開日降順
  placeId: string | null;
};

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

function makePinSvg(color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">` +
    `<circle cx="14" cy="14" r="11" fill="${color}" stroke="white" stroke-width="2"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** spots を groupKey で集約して、マーカー描画 / InfoWindow 用のグループに変換 */
function buildGroups(spots: Spot[], articles: Article[]): SpotGroup[] {
  const articleById = new Map(articles.map((a) => [a.id, a]));
  const groups = new Map<string, SpotGroup>();

  for (const s of spots) {
    const article = articleById.get(s.articleId);
    if (!article) continue;
    // mock の Spot 型は googlePlaceId を持たないので、安全に optional として読む
    const placeId =
      (s as unknown as { googlePlaceId?: string | null }).googlePlaceId ?? null;
    // Place ID 優先、なければ緯度経度を 5 桁で丸めて key に
    const key = placeId ?? `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`;

    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        name: s.name,
        position: { lat: s.lat, lng: s.lng },
        topScore: article.localScoreAverage,
        articles: [],
        placeId,
      };
      groups.set(key, g);
    } else if (article.localScoreAverage > g.topScore) {
      g.topScore = article.localScoreAverage;
    }
    g.articles.push(article);
  }

  // 各グループの記事を「公開日降順」で並べる（最近公開された順 ≈ 最近書き手が出した記事順）
  for (const g of groups.values()) {
    g.articles.sort((a, b) => {
      const ta = new Date(b.publishedAt).getTime();
      const tb = new Date(a.publishedAt).getTime();
      return ta - tb;
    });
  }
  return Array.from(groups.values());
}

function MarkersLayer({
  groups,
  onPinClick,
}: {
  groups: SpotGroup[];
  onPinClick: (g: SpotGroup) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;
    const markers = groups.map((g) => {
      const color = pinColorForScore(g.topScore);
      const m = new G.Marker({
        position: g.position,
        map,
        title: g.name,
        icon: {
          url: makePinSvg(color),
          scaledSize: new G.Size(28, 28),
          anchor: new G.Point(14, 14),
        },
      });
      const listener = m.addListener('click', () => onPinClick(g));
      return { m, listener };
    });
    return () => {
      markers.forEach(({ m, listener }) => {
        listener.remove?.();
        m.setMap(null);
      });
    };
  }, [map, groups, onPinClick]);
  return null;
}

function MapBody({
  spots,
  articles,
  showHeatmap,
}: Omit<MapInnerProps, 'apiKey'>) {
  const groups = useMemo(() => buildGroups(spots, articles), [spots, articles]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const activeGroup = activeKey
    ? groups.find((g) => g.key === activeKey) ?? null
    : null;

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
        onClick={() => setActiveKey(null)}
      >
        {showHeatmap ? <HeatmapCircles /> : null}
        <MarkersLayer
          groups={groups}
          onPinClick={(g) => setActiveKey(g.key)}
        />
        {activeGroup ? (
          <InfoWindow
            position={activeGroup.position}
            pixelOffset={[0, -18]}
            onCloseClick={() => setActiveKey(null)}
          >
            <div className="min-w-[260px] max-w-[320px] p-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary-700">
                スポット
              </p>
              <h4 className="mt-0.5 text-[15px] font-bold leading-snug text-neutral-900">
                {activeGroup.name}
              </h4>
              {activeGroup.placeId ? (
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${activeGroup.placeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[11px] text-primary-700 underline-offset-4 hover:underline"
                >
                  Google マップで見る →
                </a>
              ) : null}

              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/50">
                この場所に紐づく記事（{activeGroup.articles.length}）
              </p>
              <ul className="mt-1 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                {activeGroup.articles.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/articles/${a.id}`}
                      className="flex gap-2 rounded-md p-1.5 transition hover:bg-primary-50"
                    >
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-primary-50">
                        <Image
                          src={a.coverImageUrl}
                          alt={a.title}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-neutral-900">
                          {a.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-2 text-[10px] text-foreground/60">
                          <span className="tabular">
                            ¥{a.priceJpy.toLocaleString('ja-JP')}
                          </span>
                          <span>·</span>
                          <span>
                            ローカル度{' '}
                            <strong className="tabular">{a.localScoreAverage}</strong>
                          </span>
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </InfoWindow>
        ) : null}
      </GoogleMap>
    </div>
  );
}

export function MapInner({ spots, articles, showHeatmap, apiKey }: MapInnerProps) {
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
            を Vercel の環境変数に追加して再デプロイしてください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <MapBody spots={spots} articles={articles} showHeatmap={showHeatmap} />
    </APIProvider>
  );
}
