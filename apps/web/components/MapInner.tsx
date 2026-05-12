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
import { Lock } from '@locore/ui/icons';
import type { Article, Spot } from '../lib/mock';
import { Purchases } from '../lib/storage/local';
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
  /** サーバ側で取得した購入済み記事 ID（DB の purchases テーブル由来） */
  purchasedArticleIds?: string[];
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

/** ロック中スポット用のグレー鍵アイコン（白丸 + 中央に鍵マーク） */
function makeLockedPinSvg(): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">` +
    `<circle cx="12" cy="12" r="10" fill="#9CA3AF" stroke="white" stroke-width="2" fill-opacity="0.85"/>` +
    `<path d="M9.5 11V9.5a2.5 2.5 0 0 1 5 0V11M8 11h8v5H8z" fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 文字列から決定論的な疑似乱数を 0-1 で返す。
 * spotGroup の key からズラし座標を生成する用。
 */
function seededRandom01(seedStr: string): number {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000000) / 1000000;
}

/**
 * Airbnb 風の位置ぼかし。決定論的に 150〜250m 範囲でずらす。
 * 同じ key からは常に同じズレが生成される（再読込で位置が変わらない）。
 */
function obfuscatePosition(
  pos: { lat: number; lng: number },
  seedKey: string,
): { lat: number; lng: number } {
  const r1 = seededRandom01(seedKey);
  const r2 = seededRandom01(seedKey + ':angle');
  const radiusM = 150 + r1 * 100; // 150〜250m
  const angle = r2 * Math.PI * 2;
  const dLat = (Math.cos(angle) * radiusM) / 111_000;
  const dLng =
    (Math.sin(angle) * radiusM) /
    (111_000 * Math.cos((pos.lat * Math.PI) / 180));
  return { lat: pos.lat + dLat, lng: pos.lng + dLng };
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

  // 各グループの記事を「公開日降順」で並べる（最近公開された順 ≈ 最近クリエイターが出した記事順）
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
  /** 描画用座標（locked のときは obfuscated）*/
  displayPosition: { lat: number; lng: number };
};

function MarkersLayer({
  groups,
  onPinClick,
}: {
  groups: GroupWithUnlock[];
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
      circle?: { setMap: (m: unknown) => void };
      listener?: { remove?: () => void };
    }> = [];

    groups.forEach((g) => {
      if (g.unlocked) {
        // 解放済み: ピン色は localScore、正確な座標、ホバーで名前表示
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
        created.push({ m, listener });
      } else {
        // ロック中: Airbnb 風のぼかし円 + 中央にグレー鍵ピン
        // 円は半径 280m、薄いグレー塗り
        const circle = new G.Circle({
          center: g.displayPosition,
          radius: 280,
          map,
          strokeWeight: 1.5,
          strokeColor: '#6B7280',
          strokeOpacity: 0.45,
          fillColor: '#9CA3AF',
          fillOpacity: 0.18,
          clickable: false,
        });
        created.push({ circle });

        const m = new G.Marker({
          position: g.displayPosition,
          map,
          // ⚠️ title を設定しない or 汎用 → ホバーで実名が出ないように
          title: 'ロック中（このエリアに記事あり）',
          icon: {
            url: makeLockedPinSvg(),
            scaledSize: new G.Size(24, 24),
            anchor: new G.Point(12, 12),
          },
          opacity: 0.92,
          zIndex: 1, // 解放済みピンより下に
        });
        const listener = m.addListener('click', () => onPinClick(g));
        created.push({ m, listener });
      }
    });

    return () => {
      created.forEach((x) => {
        x.listener?.remove?.();
        x.m?.setMap(null);
        x.circle?.setMap(null);
      });
    };
  }, [map, groups, onPinClick]);
  return null;
}

function MapBody({
  spots,
  articles,
  showHeatmap,
  purchasedArticleIds,
}: Omit<MapInnerProps, 'apiKey'>) {
  const groups = useMemo(() => buildGroups(spots, articles), [spots, articles]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // 購入状態：サーバ由来 + クライアントの localStorage を合算
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

  // 各グループに unlocked と表示用座標を計算してくっつける。
  // locked なときは Airbnb 風に 150〜250m ずらしたぼかし座標を使う。
  const groupsWithUnlock: GroupWithUnlock[] = useMemo(() => {
    return groups.map((g) => {
      const unlocked = g.articles.some((a) => purchasedSet.has(a.id));
      return {
        ...g,
        unlocked,
        displayPosition: unlocked
          ? g.position
          : obfuscatePosition(g.position, g.key),
      };
    });
  }, [groups, purchasedSet]);

  const activeGroup = activeKey
    ? groupsWithUnlock.find((g) => g.key === activeKey) ?? null
    : null;
  const isUnlocked = (a: Article) => purchasedSet.has(a.id);
  const groupHasUnlock = activeGroup ? activeGroup.unlocked : false;

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
          groups={groupsWithUnlock}
          onPinClick={(g) => setActiveKey(g.key)}
        />
        {activeGroup ? (
          <InfoWindow
            position={activeGroup.displayPosition}
            pixelOffset={[0, -18]}
            onCloseClick={() => setActiveKey(null)}
          >
            <div className="min-w-[280px] max-w-[340px] p-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary-700">
                スポット
              </p>
              {/* スポット名：いずれかの記事を購入していれば本物 + ハイライト、
                  していなければマスクして「??????」+ ロック表示 */}
              {groupHasUnlock ? (
                <h4 className="mt-0.5 inline-block bg-primary-50 px-1.5 py-0.5 text-[15px] font-extrabold leading-snug text-primary-900">
                  {activeGroup.name}
                </h4>
              ) : (
                <h4 className="mt-0.5 inline-flex items-center gap-1.5 text-[15px] font-bold leading-snug text-foreground/40">
                  <Lock className="h-3.5 w-3.5" />
                  ?????????
                </h4>
              )}
              {groupHasUnlock && activeGroup.placeId ? (
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${activeGroup.placeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-[11px] text-primary-700 underline-offset-4 hover:underline"
                >
                  Google マップで見る →
                </a>
              ) : null}

              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/50">
                この場所に紐づく記事（{activeGroup.articles.length}）
              </p>
              <ul className="mt-1 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                {activeGroup.articles.map((a) => {
                  const unlocked = isUnlocked(a);
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/articles/${a.id}`}
                        className={
                          'flex gap-2 rounded-md p-1.5 transition ' +
                          (unlocked
                            ? 'bg-primary-50/60 ring-1 ring-primary-200 hover:bg-primary-50'
                            : 'hover:bg-primary-50/30')
                        }
                      >
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-primary-50">
                          <Image
                            src={a.coverImageUrl}
                            alt={a.title}
                            fill
                            sizes="64px"
                            className={
                              'object-cover ' +
                              (unlocked ? '' : 'opacity-90')
                            }
                          />
                          {!unlocked ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/30">
                              <Lock className="h-3 w-3 text-white" />
                            </div>
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={
                              'line-clamp-2 text-[12px] leading-snug ' +
                              (unlocked
                                ? 'font-extrabold text-primary-900'
                                : 'font-semibold text-foreground/70')
                            }
                          >
                            {a.title}
                          </p>
                          <p className="mt-0.5 flex items-center gap-2 text-[10px] text-foreground/60">
                            {unlocked ? (
                              <span className="rounded-full bg-primary-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
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

              {!groupHasUnlock ? (
                <p className="mt-3 rounded-md bg-accent-50 px-2 py-1.5 text-[10px] leading-relaxed text-foreground/70">
                  地図上のグレーの円は <strong>おおよそのエリア（半径 280m）</strong> を示しています。記事を購入すると、正確な位置・店舗名・住所・営業時間が
                  <strong className="ml-0.5 text-primary-700">アンロック</strong>
                  されます。
                </p>
              ) : null}
            </div>
          </InfoWindow>
        ) : null}
      </GoogleMap>
    </div>
  );
}

export function MapInner({
  spots,
  articles,
  showHeatmap,
  apiKey,
  purchasedArticleIds,
}: MapInnerProps) {
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
      <MapBody
        spots={spots}
        articles={articles}
        showHeatmap={showHeatmap}
        purchasedArticleIds={purchasedArticleIds}
      />
    </APIProvider>
  );
}
