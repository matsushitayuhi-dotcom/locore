'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  APIProvider,
  Map as GoogleMap,
  useMap,
} from '@vis.gl/react-google-maps';
import { ExternalLink, X } from '@locore/ui/icons';
import type { Spot, ArticleItineraryBlock, PhotoEntry } from '../lib/mock';
import { locoreMapStyles } from './map/locoreMapStyle';
import { buildSpotGoogleMapsUrl } from '@/lib/maps/googleMapsUrls';

/**
 * 記事末尾に出すスポット地図。Prism Japan 風のミニマル表現:
 *   - 見出し / 副題 / 凡例 / 移動手段アイコンは廃止
 *   - 地図のみ。高さ 420 / rounded-xl
 *   - ピンはモノクロ ink (#18181b)。写真があれば円形写真、無ければ黒丸 + 白枠
 *   - タップしたスポットは画面下のボトムシート (sticky 風カード) に表示
 *   - 旅程の場合は番号付きピン + 細い黒ポリライン（移動手段アイコンは出さない）
 */

type Point = { spot: Spot; label?: number; photoUrl?: string | null };

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

const INK = '#18181B'; // zinc-900 / 墨黒
const PIN_STROKE = '#FFFFFF';

/** 写真の無いスポット用の標準ピン。直径 11 の黒丸 + 白枠 */
function makePlainPinSvg(): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">` +
    `<circle cx="11" cy="11" r="5.5" fill="${INK}" stroke="${PIN_STROKE}" stroke-width="2"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 番号付きピン。直径 30 程度、中央に白文字 */
function makeNumberedPinSvg(label: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">` +
    `<circle cx="15" cy="15" r="12" fill="${INK}" stroke="${PIN_STROKE}" stroke-width="2"/>` +
    `<text x="15" y="19" text-anchor="middle" ` +
    `font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="white">` +
    `${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 円形写真マーカーを `<canvas>` で合成して PNG data URL を返す。
 * 詳細は元実装と同じ。border 色を ink にしたモノクロ版。
 */
function makePhotoMarkerPng(opts: {
  photoUrl: string;
  label?: number;
}): Promise<string | null> {
  const { photoUrl, label } = opts;
  const borderColor = INK;
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      resolve(null);
    };
    const timer = window.setTimeout(fail, 5000);
    img.onerror = () => {
      window.clearTimeout(timer);
      fail();
    };
    img.onload = () => {
      window.clearTimeout(timer);
      if (settled) return;
      try {
        const canvas = document.createElement('canvas');
        const SIZE = 52;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = SIZE * dpr;
        canvas.height = SIZE * dpr;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          fail();
          return;
        }
        ctx.scale(dpr, dpr);

        // ドロップシャドウ付きの白い土台
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.30)';
        ctx.shadowBlur = 2.4;
        ctx.shadowOffsetY = 1;
        ctx.beginPath();
        ctx.arc(26, 26, 24, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        // 円形クリップで写真を描画 (cover フィット)
        ctx.save();
        ctx.beginPath();
        ctx.arc(26, 26, 22, 0, Math.PI * 2);
        ctx.clip();
        const ar = img.width / img.height;
        let drawW = 44;
        let drawH = 44;
        if (ar > 1) drawW = 44 * ar;
        else if (ar < 1) drawH = 44 / ar;
        const dx = 26 - drawW / 2;
        const dy = 26 - drawH / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
        ctx.restore();

        // ink リング
        ctx.beginPath();
        ctx.arc(26, 26, 22, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = borderColor;
        ctx.stroke();

        // 番号バッジ
        if (typeof label === 'number') {
          ctx.beginPath();
          ctx.arc(42, 42, 9, 0, Math.PI * 2);
          ctx.fillStyle = borderColor;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px Arial, Helvetica, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(label), 42, 42.5);
        }

        const url = canvas.toDataURL('image/png');
        settled = true;
        resolve(url);
      } catch {
        fail();
      }
    };
    img.src = photoUrl;
  });
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

    let cancelled = false;
    const markersAndListeners = points.map((p) => {
      const numberedLabel =
        numbered && typeof p.label === 'number' ? p.label : undefined;
      const fallbackUrl =
        typeof numberedLabel === 'number'
          ? makeNumberedPinSvg(numberedLabel)
          : makePlainPinSvg();
      const fallbackSize = typeof numberedLabel === 'number' ? 30 : 22;
      const m = new G.Marker({
        position: { lat: p.spot.lat, lng: p.spot.lng },
        map,
        title:
          numbered && p.label ? `${p.label}. ${p.spot.name}` : p.spot.name,
        icon: {
          url: fallbackUrl,
          scaledSize: new G.Size(fallbackSize, fallbackSize),
          anchor: new G.Point(fallbackSize / 2, fallbackSize / 2),
        },
        zIndex: 2,
      });
      const listener = m.addListener('click', () => onPointClick(p));

      if (p.photoUrl) {
        makePhotoMarkerPng({
          photoUrl: p.photoUrl,
          label: numberedLabel,
        }).then((url) => {
          if (cancelled || !url) return;
          m.setIcon({
            url,
            scaledSize: new G.Size(52, 52),
            anchor: new G.Point(26, 26),
          });
          m.setZIndex(3);
        });
      }

      return { m, listener };
    });
    return () => {
      cancelled = true;
      markersAndListeners.forEach(({ m, listener }) => {
        listener.remove?.();
        m.setMap(null);
      });
    };
  }, [map, points, numbered, onPointClick]);
  return null;
}

/** 旅程プランの polyline。Prism 風に細い黒の実線のみ（移動手段アイコンなし） */
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
      strokeColor: INK,
      strokeOpacity: 0.85,
      strokeWeight: 1.5,
      map,
    });
    return () => {
      line.setMap(null);
    };
  }, [map, points]);
  return null;
}

/**
 * Google Directions が使える場合は実ルートを細い黒線で描画。
 * 移動手段アイコンはタイムライン側で十分なので、ここでは出さない。
 */
function DirectionsPolylines({ segments }: { segments: Segment[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || segments.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;

    const created: Array<{
      m?: { setMap: (m: unknown) => void };
    }> = [];
    let cancelled = false;

    const service = new G.DirectionsService();

    const drawStraight = (seg: Segment) => {
      const line = new G.Polyline({
        path: [seg.from, seg.to],
        geodesic: true,
        strokeColor: INK,
        strokeOpacity: 0.85,
        strokeWeight: 1.5,
        map,
      });
      created.push({ m: line });
    };

    segments.forEach((seg) => {
      const mode = transportToTravelMode(seg.mode, G);
      if (!mode) {
        drawStraight(seg);
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
            drawStraight(seg);
            return;
          }
          const path = result.routes[0].overview_path;
          const line = new G.Polyline({
            path,
            geodesic: true,
            strokeColor: INK,
            strokeOpacity: 0.85,
            strokeWeight: 2,
            map,
          });
          created.push({ m: line });
        },
      );
    });

    return () => {
      cancelled = true;
      for (const c of created) {
        c.m?.setMap(null);
      }
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
  articleType: 'spot_guide' | 'itinerary' | 'expat_info' | 'photo_journal';
  itineraryBlocks?: ArticleItineraryBlock[] | null;
  photoEntries?: PhotoEntry[] | null;
  unlocked?: boolean;
};

function ArticleSpotsMapBody({
  spots,
  articleType,
  itineraryBlocks,
  photoEntries,
  unlocked = true,
}: Props) {
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

  const photoBySpotId = useMemo(() => {
    const map = new Map<string, string>();
    if (!unlocked) return map;
    for (const s of spots) {
      const fromGoogle =
        Array.isArray(s.photoUrls) && s.photoUrls.length > 0
          ? s.photoUrls[0]
          : null;
      const fromEntries =
        photoEntries?.find((p) => p.spotId === s.id)?.imageUrl ?? null;
      const fromCover =
        (s as unknown as { coverImageUrl?: string | null }).coverImageUrl ??
        null;
      const chosen = fromGoogle || fromEntries || fromCover;
      if (chosen) map.set(s.id, chosen);
    }
    return map;
  }, [spots, photoEntries, unlocked]);

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

    const photoFor = (s: Spot): string | null => photoBySpotId.get(s.id) ?? null;

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
        ordered.push({ spot: s, label: currentLabel, photoUrl: photoFor(s) });
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
        if (!usedIds.has(s.id))
          ordered.push({ spot: s, photoUrl: photoFor(s) });
      }
      return { points: ordered, segments: segs };
    }

    return {
      points: valid.map((s) => ({ spot: s, photoUrl: photoFor(s) })),
      segments: [] as Segment[],
    };
  }, [spots, articleType, itineraryBlocks, photoBySpotId]);

  const center = useMemo(() => {
    if (points.length === 0) return { lat: 48.8566, lng: 2.3522 };
    return {
      lat: points.reduce((a, p) => a + p.spot.lat, 0) / points.length,
      lng: points.reduce((a, p) => a + p.spot.lng, 0) / points.length,
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl bg-primary-500/5 text-[13px] text-primary-300 ring-1 ring-border">
        スポットの位置情報が登録されていません
      </div>
    );
  }

  return (
    <div
      className="locore-map-canvas overflow-hidden rounded-xl ring-1 ring-border"
      style={{ position: 'relative', height: 420 }}
    >
      <GoogleMap
        defaultCenter={center}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        styles={locoreMapStyles}
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelectedPoint(null)}
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
          onPointClick={(p) => setSelectedPoint(p)}
        />
      </GoogleMap>

      {/* Prism 風ボトムシート: タップしたスポットの 1 枚カード */}
      {selectedPoint ? (
        <SpotBottomSheet
          point={selectedPoint}
          onClose={() => setSelectedPoint(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * 地図の下部に貼り付く 1 枚カード。
 * - 左に正方形 60px の写真 / 右に名前 + 住所 + Google マップリンク
 * - 右上に ✕ ボタン
 * - 地図コンテナの内側に absolute で配置するので、BottomNav とは別レイヤー
 */
function SpotBottomSheet({
  point,
  onClose,
}: {
  point: Point;
  onClose: () => void;
}) {
  const { spot, photoUrl, label } = point;
  const mapsUrl = buildSpotGoogleMapsUrl({
    placeId: spot.googlePlaceId,
    lat: spot.lat,
    lng: spot.lng,
    fallbackQuery: spot.name + ' ' + (spot.address ?? ''),
  });
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-[5] sm:inset-x-3 sm:bottom-3">
      <div className="pointer-events-auto relative flex items-stretch gap-3 rounded-xl bg-card/95 p-3 shadow-lg ring-1 ring-border backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-foreground/50 hover:bg-primary-500/10 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-lg bg-primary-500/10">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={spot.name}
              fill
              sizes="60px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-foreground/40">
              No photo
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 pr-6">
          {typeof label === 'number' ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/50">
              #{String(label).padStart(2, '0')}
            </p>
          ) : null}
          <p className="truncate text-[14px] font-semibold leading-snug text-foreground">
            {spot.name}
          </p>
          {spot.address ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] leading-relaxed text-foreground/60">
              {spot.address}
            </p>
          ) : null}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/70 underline-offset-4 hover:text-foreground hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Google マップで開く →
          </a>
        </div>
      </div>
    </div>
  );
}

export function ArticleSpotsMap({
  spots,
  articleType,
  itineraryBlocks,
  photoEntries,
  unlocked = true,
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
    // 見出し無しのまま、Map キー未設定だけ静かに知らせる
    return (
      <div className="flex h-[200px] items-center justify-center rounded-xl bg-primary-500/5 text-[12px] text-primary-300 ring-1 ring-border">
        Google Maps API キーが未設定です（NEXT_PUBLIC_GOOGLE_MAPS_API_KEY）
      </div>
    );
  }

  // 見出し / 副題は廃止。地図のみ。
  return (
    <APIProvider apiKey={apiKey}>
      <ArticleSpotsMapBody
        spots={spots}
        articleType={articleType}
        itineraryBlocks={itineraryBlocks}
        photoEntries={photoEntries}
        unlocked={unlocked}
      />
    </APIProvider>
  );
}
