'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  useMap,
} from '@vis.gl/react-google-maps';
import { latLngToCell, cellToBoundary, cellToLatLng } from 'h3-js';
import { Lock, X } from '@locore/ui/icons';
import type { Article, Spot } from '../lib/mock';
import { Purchases } from '../lib/storage/local';
import { locoreMapStyles, pinColorForScore } from './map/locoreMapStyle';

/**
 * Prism Japan 風 /map の中身。
 *
 *   - 地図全面 + モノクロスタイル
 *   - 上部 UI は無し。
 *   - 下部はデフォルト空（薄い hint バーのみ）。
 *     ピンをタップすると bottom-sheet 風の詳細パネルがせり上がる。
 *   - 「同じ Google Place / 同じ座標」のスポットはマーカー 1 本に集約
 *   - locked グループは H3 ヘキサに集約して位置を匿名化（既存仕様）
 */

const H3_RESOLUTION = 7;
const PARIS_CENTER = { lat: 48.8606, lng: 2.3376 };

const INK = '#18181B'; // zinc-900

interface MapInnerProps {
  spots: Spot[];
  articles: Article[];
  apiKey?: string;
  purchasedArticleIds?: string[];
  myArticleIds?: string[];
}

type SpotGroup = {
  key: string;
  name: string;
  position: { lat: number; lng: number };
  topScore: number;
  articles: Article[];
  placeId: string | null;
};

function makePinSvg(color: string, pulse = false): string {
  const r = pulse ? 8 : 5.5;
  const stroke = pulse ? 2.5 : 2;
  const size = pulse ? 26 : 22;
  const c = size / 2;
  const ring = pulse
    ? `<circle cx="${c}" cy="${c}" r="${r + 4}" fill="${color}" fill-opacity="0.15"/>`
    : '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    ring +
    `<circle cx="${c}" cy="${c}" r="${r}" fill="${color}" stroke="white" stroke-width="${stroke}"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 円形写真マーカーを <canvas> で合成して PNG data URL を返す。
 * ArticleSpotsMap.tsx の同名関数と同じ実装。
 *
 * 画像のロード失敗 / CORS NG / 5 秒以上かかる場合は null を返し、
 * 呼び出し側で従来のカラーピンにフォールバックする。
 */
function makePhotoMarkerPng(opts: {
  photoUrl: string;
  borderColor?: string;
}): Promise<string | null> {
  const { photoUrl, borderColor = INK } = opts;
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
        const SIZE = 44;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = SIZE * dpr;
        canvas.height = SIZE * dpr;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          fail();
          return;
        }
        ctx.scale(dpr, dpr);
        // 白い土台 + シャドウ
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.30)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetY = 1;
        ctx.beginPath();
        ctx.arc(22, 22, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
        // 円形クリップして写真を cover フィット
        ctx.save();
        ctx.beginPath();
        ctx.arc(22, 22, 18, 0, Math.PI * 2);
        ctx.clip();
        const ar = img.width / img.height;
        let drawW = 36;
        let drawH = 36;
        if (ar > 1) drawW = 36 * ar;
        else if (ar < 1) drawH = 36 / ar;
        const dx = 22 - drawW / 2;
        const dy = 22 - drawH / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
        ctx.restore();
        // 外周リング
        ctx.beginPath();
        ctx.arc(22, 22, 18, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = borderColor;
        ctx.stroke();
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

/** 自分の投稿用ピン: 中央に小さな白いドット入りの ink 丸 */
function makeOwnPinSvg(): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">` +
    `<circle cx="13" cy="13" r="9" fill="${INK}" stroke="white" stroke-width="2.5"/>` +
    `<circle cx="13" cy="13" r="2.4" fill="white"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** ヘキサ中央のロックバッジ（モノクロ）*/
function makeHexCountSvg(count: number): string {
  const label = String(count);
  const w = label.length === 1 ? 32 : label.length === 2 ? 38 : 44;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="32" viewBox="0 0 ${w} 32">` +
    `<rect x="1" y="1" width="${w - 2}" height="30" rx="15" ` +
    `fill="#FFFFFF" stroke="${INK}" stroke-width="1.2" opacity="0.95"/>` +
    `<path d="M11 14V12a3 3 0 0 1 6 0v2M9 14h10v8H9z" ` +
    `fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" ` +
    `transform="scale(0.55) translate(7 6)"/>` +
    `<text x="${w - 9}" y="20" text-anchor="end" ` +
    `font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="${INK}">` +
    `${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function seededRandom01(seedStr: string): number {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000000) / 1000000;
}

function obfuscatePosition(
  pos: { lat: number; lng: number },
  seedKey: string,
): { lat: number; lng: number } {
  const r1 = seededRandom01(seedKey);
  const r2 = seededRandom01(seedKey + ':angle');
  const radiusM = 150 + r1 * 100;
  const angle = r2 * Math.PI * 2;
  const dLat = (Math.cos(angle) * radiusM) / 111_000;
  const dLng =
    (Math.sin(angle) * radiusM) /
    (111_000 * Math.cos((pos.lat * Math.PI) / 180));
  return { lat: pos.lat + dLat, lng: pos.lng + dLng };
}

function buildGroups(spots: Spot[], articles: Article[]): SpotGroup[] {
  const articleById = new Map(articles.map((a) => [a.id, a]));
  const groups = new Map<string, SpotGroup>();

  for (const s of spots) {
    const article = articleById.get(s.articleId);
    if (!article) continue;
    const placeId =
      (s as unknown as { googlePlaceId?: string | null }).googlePlaceId ?? null;
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

  for (const g of groups.values()) {
    g.articles.sort((a, b) => {
      const ta = new Date(b.publishedAt).getTime();
      const tb = new Date(a.publishedAt).getTime();
      return ta - tb;
    });
  }
  return Array.from(groups.values());
}

type GroupWithUnlock = SpotGroup & {
  unlocked: boolean;
  isOwn: boolean;
  displayPosition: { lat: number; lng: number };
};

type HexAggregate = {
  cellId: string;
  center: { lat: number; lng: number };
  boundary: Array<{ lat: number; lng: number }>;
  groups: GroupWithUnlock[];
  articles: Article[];
};

function buildHexAggregates(lockedGroups: GroupWithUnlock[]): HexAggregate[] {
  const byCell = new Map<string, GroupWithUnlock[]>();
  for (const g of lockedGroups) {
    const cellId = latLngToCell(g.position.lat, g.position.lng, H3_RESOLUTION);
    const arr = byCell.get(cellId) ?? [];
    arr.push(g);
    byCell.set(cellId, arr);
  }
  return Array.from(byCell.entries()).map(([cellId, groups]) => {
    const [centerLat, centerLng] = cellToLatLng(cellId);
    const boundary = cellToBoundary(cellId).map(([lat, lng]) => ({
      lat,
      lng,
    }));
    const articleMap = new Map<string, Article>();
    for (const g of groups) {
      for (const a of g.articles) {
        articleMap.set(a.id, a);
      }
    }
    return {
      cellId,
      center: { lat: centerLat, lng: centerLng },
      boundary,
      groups,
      articles: Array.from(articleMap.values()).sort((a, b) => {
        const ta = new Date(b.publishedAt).getTime();
        const tb = new Date(a.publishedAt).getTime();
        return ta - tb;
      }),
    };
  });
}

function HexagonLayer({
  hexes,
  onHexClick,
}: {
  hexes: HexAggregate[];
  onHexClick: (cellId: string) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;

    const created: Array<{
      m?: { setMap: (m: unknown) => void };
      poly?: { setMap: (m: unknown) => void };
      listener?: { remove?: () => void };
    }> = [];

    hexes.forEach((h) => {
      const polygon = new G.Polygon({
        paths: h.boundary,
        strokeColor: INK,
        strokeOpacity: 0.35,
        strokeWeight: 1,
        fillColor: INK,
        fillOpacity: 0.06,
        clickable: false,
        zIndex: 1,
        map,
      });
      created.push({ poly: polygon });

      const badge = new G.Marker({
        position: h.center,
        map,
        title: `このエリアに ${h.articles.length} 件のロック中の記事`,
        icon: {
          url: makeHexCountSvg(h.articles.length),
          scaledSize: new G.Size(
            h.articles.length < 10 ? 32 : h.articles.length < 100 ? 38 : 44,
            32,
          ),
          anchor: new G.Point(
            h.articles.length < 10 ? 16 : h.articles.length < 100 ? 19 : 22,
            16,
          ),
        },
        opacity: 0.95,
        zIndex: 3,
      });
      const listener = badge.addListener('click', () => onHexClick(h.cellId));
      created.push({ m: badge, listener });
    });

    return () => {
      created.forEach((x) => {
        x.listener?.remove?.();
        x.m?.setMap(null);
        x.poly?.setMap(null);
      });
    };
  }, [map, hexes, onHexClick]);
  return null;
}

/**
 * 通常ピンレイヤー（unlocked / own のみ）。
 * activeKey が指すグループだけ pulse 表示する。
 */
function MarkersLayer({
  groups,
  activeKey,
  onPinClick,
}: {
  groups: GroupWithUnlock[];
  activeKey: string | null;
  onPinClick: (g: GroupWithUnlock) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G) return;

    const created: Array<{
      m?: { setMap: (m: unknown) => void };
      listener?: { remove?: () => void };
    }> = [];

    groups.forEach((g) => {
      const isActive = g.key === activeKey;
      if (g.isOwn) {
        const m = new G.Marker({
          position: g.position,
          map,
          title: `あなたの投稿: ${g.name}`,
          icon: {
            url: makeOwnPinSvg(),
            scaledSize: new G.Size(26, 26),
            anchor: new G.Point(13, 13),
          },
          zIndex: 10,
        });
        const listener = m.addListener('click', () => onPinClick(g));
        created.push({ m, listener });
      } else if (g.unlocked) {
        const color = pinColorForScore(g.topScore);
        const size = isActive ? 26 : 22;
        const m = new G.Marker({
          position: g.position,
          map,
          title: g.name,
          icon: {
            url: makePinSvg(color, isActive),
            scaledSize: new G.Size(size, size),
            anchor: new G.Point(size / 2, size / 2),
          },
          zIndex: isActive ? 6 : 2,
        });
        const listener = m.addListener('click', () => onPinClick(g));
        created.push({ m, listener });

        // 写真ピンへの非同期昇格: グループの先頭記事の cover を canvas で
        // 円形マーカー化し、ロード成功時に setIcon で差し替える。
        // 失敗 / CORS NG / 遅延 5s 超 のときはカラーピンのまま。
        // Google Maps JS API 内部 URL は <img> でロード不可なのでスキップ。
        const photoUrlRaw = g.articles?.[0]?.coverImageUrl;
        const photoUrl =
          photoUrlRaw &&
          !photoUrlRaw.includes('PhotoService.GetPhoto') &&
          !photoUrlRaw.includes('maps.googleapis.com/maps/api/place/js/')
            ? photoUrlRaw
            : null;
        if (photoUrl) {
          const photoSize = isActive ? 52 : 44;
          makePhotoMarkerPng({ photoUrl, borderColor: color }).then(
            (dataUrl) => {
              if (!dataUrl) return;
              try {
                m.setIcon({
                  url: dataUrl,
                  scaledSize: new G.Size(photoSize, photoSize),
                  anchor: new G.Point(photoSize / 2, photoSize / 2),
                });
              } catch {
                /* setIcon failed; marker already unmounted */
              }
            },
          );
        }
      }
    });

    return () => {
      created.forEach((x) => {
        x.listener?.remove?.();
        x.m?.setMap(null);
      });
    };
  }, [map, groups, activeKey, onPinClick]);
  return null;
}

/** map 操作用の小さな bridge: 親から activeGroup が来たら pan する */
function MapPanController({
  target,
}: {
  target: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
  }, [map, target]);
  return null;
}

function MapBody({
  spots,
  articles,
  purchasedArticleIds,
  myArticleIds,
}: Omit<MapInnerProps, 'apiKey'>) {
  const groups = useMemo(() => buildGroups(spots, articles), [spots, articles]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeHexId, setActiveHexId] = useState<string | null>(null);

  const [localPurchases, setLocalPurchases] = useState<Set<string>>(
    () => new Set(),
  );
  useEffect(() => {
    setLocalPurchases(new Set(Purchases.list()));
  }, []);
  const purchasedSet = useMemo(() => {
    const s = new Set(localPurchases);
    for (const id of purchasedArticleIds ?? []) s.add(id);
    return s;
  }, [localPurchases, purchasedArticleIds]);

  const ownSet = useMemo(() => new Set(myArticleIds ?? []), [myArticleIds]);

  const groupsWithUnlock: GroupWithUnlock[] = useMemo(() => {
    return groups.map((g) => {
      const isOwn = g.articles.some((a) => ownSet.has(a.id));
      const unlocked = isOwn || g.articles.some((a) => purchasedSet.has(a.id));
      return {
        ...g,
        unlocked,
        isOwn,
        displayPosition: unlocked
          ? g.position
          : obfuscatePosition(g.position, g.key),
      };
    });
  }, [groups, purchasedSet, ownSet]);

  const hexes = useMemo(() => {
    const locked = groupsWithUnlock.filter((g) => !g.unlocked && !g.isOwn);
    return buildHexAggregates(locked);
  }, [groupsWithUnlock]);

  const activeGroup = activeKey
    ? groupsWithUnlock.find((g) => g.key === activeKey) ?? null
    : null;
  const activeHex = activeHexId
    ? hexes.find((h) => h.cellId === activeHexId) ?? null
    : null;
  const isUnlocked = useCallback(
    (a: Article) => purchasedSet.has(a.id),
    [purchasedSet],
  );
  const groupHasUnlock = activeGroup ? activeGroup.unlocked : false;

  const panTarget = activeGroup
    ? activeGroup.displayPosition
    : activeHex
      ? activeHex.center
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
        onClick={() => {
          setActiveKey(null);
          setActiveHexId(null);
        }}
      >
        <MapPanController target={panTarget} />
        <MarkersLayer
          groups={groupsWithUnlock}
          activeKey={activeKey}
          onPinClick={(g) => {
            setActiveHexId(null);
            setActiveKey(g.key);
          }}
        />
        <HexagonLayer
          hexes={hexes}
          onHexClick={(cellId) => {
            setActiveKey(null);
            setActiveHexId(cellId);
          }}
        />
      </GoogleMap>

      {/* タップしたピン / ヘキサのボトムシート (BottomNav を避けるため bottom-16) */}
      {activeGroup ? (
        <GroupBottomSheet
          group={activeGroup}
          unlocked={groupHasUnlock}
          isUnlocked={isUnlocked}
          onClose={() => setActiveKey(null)}
        />
      ) : activeHex ? (
        <HexBottomSheet hex={activeHex} onClose={() => setActiveHexId(null)} />
      ) : (
        <HintBar />
      )}
    </div>
  );
}

/**
 * デフォルト表示の薄い hint バー。
 * 地図操作の邪魔にならないよう、画面下に小さく一行だけ。
 */
function HintBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-[5] flex justify-center px-4 md:bottom-3">
      <p className="pointer-events-none rounded-full bg-card/85 px-3 py-1 text-[11px] font-medium text-foreground/55 shadow-sm ring-1 ring-border backdrop-blur">
        ピンをタップするとここに詳細が表示されます
      </p>
    </div>
  );
}

function SheetShell({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-16 z-[6] sm:inset-x-3 md:bottom-3">
      <div className="pointer-events-auto relative max-h-[55vh] overflow-y-auto rounded-2xl bg-card/95 p-4 shadow-xl ring-1 ring-border backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-foreground/60 hover:bg-primary-500/10 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function GroupBottomSheet({
  group,
  unlocked,
  isUnlocked,
  onClose,
}: {
  group: GroupWithUnlock;
  unlocked: boolean;
  isUnlocked: (a: Article) => boolean;
  onClose: () => void;
}) {
  return (
    <SheetShell onClose={onClose}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/50">
        スポット
      </p>
      {unlocked ? (
        <h4 className="mt-0.5 text-[16px] font-bold leading-snug text-foreground">
          {group.name}
        </h4>
      ) : (
        <h4 className="mt-0.5 inline-flex items-center gap-1.5 text-[16px] font-bold leading-snug text-foreground/40">
          <Lock className="h-3.5 w-3.5" />
          ?????????
        </h4>
      )}
      {unlocked && group.placeId ? (
        <a
          href={`https://www.google.com/maps/place/?q=place_id:${group.placeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-[11px] text-foreground/60 underline-offset-4 hover:underline"
        >
          Google マップで開く →
        </a>
      ) : null}

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/50">
        この場所に紐づく記事（{group.articles.length}）
      </p>
      <ul className="mt-1 space-y-2 pr-1">
        {group.articles.map((a) => {
          const ul = isUnlocked(a);
          return (
            <li key={a.id}>
              <Link
                href={`/articles/${a.id}`}
                className={
                  'flex gap-2 rounded-lg p-1.5 transition ' +
                  (ul
                    ? 'bg-primary-500/5 ring-1 ring-primary-200 hover:bg-primary-500/10'
                    : 'hover:bg-primary-500/5')
                }
              >
                <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-primary-500/10">
                  <Image
                    src={a.coverImageUrl}
                    alt={a.title}
                    fill
                    sizes="64px"
                    className={'object-cover ' + (ul ? '' : 'opacity-90')}
                  />
                  {!ul ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/30">
                      <Lock className="h-3 w-3 text-white" />
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      'line-clamp-2 text-[12px] leading-snug ' +
                      (ul
                        ? 'font-bold text-foreground'
                        : 'font-semibold text-foreground/70')
                    }
                  >
                    {a.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-[10px] text-foreground/60">
                    {ul ? (
                      <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-card">
                        Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-foreground/50">
                        <Lock className="h-2.5 w-2.5" />
                        ロック
                      </span>
                    )}
                    <span className="tabular">
                      ¥{a.priceJpy.toLocaleString('ja-JP')}
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {!unlocked ? (
        <p className="mt-3 rounded-lg bg-primary-500/5 px-2 py-1.5 text-[10px] leading-relaxed text-foreground/70">
          地図のヘキサは「この区画のどこかに記事がある」とだけ伝えます。
          購入後に、店名・住所・正確な位置・営業時間が
          <strong className="text-foreground">開きます</strong>。
        </p>
      ) : null}
    </SheetShell>
  );
}

function HexBottomSheet({
  hex,
  onClose,
}: {
  hex: HexAggregate;
  onClose: () => void;
}) {
  return (
    <SheetShell onClose={onClose}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/50">
        このエリア
      </p>
      <h4 className="mt-0.5 inline-flex items-center gap-1.5 text-[16px] font-bold leading-snug text-foreground">
        <Lock className="h-3.5 w-3.5" />
        {hex.articles.length} 件の記事
      </h4>
      <p className="mt-1 text-[11px] text-foreground/60">
        約 2.5km 四方のヘキサ。正確な場所は記事を購入すると解放されます。
      </p>

      <ul className="mt-3 space-y-2 pr-1">
        {hex.articles.map((a) => (
          <li key={a.id}>
            <Link
              href={`/articles/${a.id}`}
              className="flex gap-2 rounded-lg p-1.5 transition hover:bg-primary-500/5"
            >
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                <Image
                  src={a.coverImageUrl}
                  alt={a.title}
                  fill
                  sizes="64px"
                  className="object-cover opacity-90"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/30">
                  <Lock className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-foreground/80">
                  {a.title}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-[10px] text-foreground/60">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-foreground/50">
                    <Lock className="h-2.5 w-2.5" />
                    ロック
                  </span>
                  <span className="tabular">
                    ¥{a.priceJpy.toLocaleString('ja-JP')}
                  </span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </SheetShell>
  );
}

export function MapInner({
  spots,
  articles,
  apiKey,
  purchasedArticleIds,
  myArticleIds,
}: MapInnerProps) {
  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-primary-500/5 px-6 text-center">
        <div className="max-w-md">
          <p className="text-[14px] font-semibold text-foreground">
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
      <MapBody
        spots={spots}
        articles={articles}
        purchasedArticleIds={purchasedArticleIds}
        myArticleIds={myArticleIds}
      />
    </APIProvider>
  );
}
