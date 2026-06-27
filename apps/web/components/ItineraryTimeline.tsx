'use client';

import { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bookmark, Clock, ExternalLink, Lock, MapPin } from '@locore/ui/icons';
import {
  Footprints,
  TrainFront,
  Train,
  Bus,
  Car,
  Bike,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ArticleItineraryBlock, PhotoEntry, Spot } from '../lib/mock';
import { Purchases } from '../lib/storage/local';
import {
  bookmarkSpot,
  unbookmarkSpot,
  type FolderSummary,
} from '@/lib/spotFavorites/actions';
import { buildSpotGoogleMapsUrl } from '@/lib/maps/googleMapsUrls';

type TransportKey =
  | 'walk'
  | 'metro'
  | 'bus'
  | 'taxi'
  | 'bike'
  | 'train'
  | 'other';

const TRANSPORT_LABEL: Record<TransportKey, string> = {
  walk: '徒歩',
  metro: 'メトロ',
  bus: 'バス',
  train: '電車',
  taxi: 'タクシー',
  bike: '自転車',
  other: '移動',
};

const TRANSPORT_ICON: Record<TransportKey, LucideIcon> = {
  walk: Footprints,
  metro: TrainFront,
  bus: Bus,
  train: Train,
  taxi: Car,
  bike: Bike,
  other: ArrowDown,
};

/** 分を「X時間Y分」形式に。60 分未満は「Y分」のみ。0/負は空文字。 */
function formatDuration(min: number | null | undefined): string {
  if (!min || min <= 0) return '';
  if (min < 60) return `${min}分`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

type Props = {
  articleId: string;
  blocks: ArticleItineraryBlock[];
  /** 該当 spotId を解決するためのスポット配列 */
  spots: Spot[];
  /** サーバ側で判定済みの購入状態（DB の purchases 由来）。未ログインなら false */
  defaultUnlocked: boolean;
  /**
   * 写真フォールバック。`spot.photoUrls[0]` (Google Places 由来) が
   * 空の場合に、駐在員がアップした写真エントリ (`spotId` 指定あり) を
   * 使ってカード写真を埋める。
   */
  photoEntries?: PhotoEntry[] | null;
  /** 写真がまったく無いときの最終フォールバック (記事のカバー画像) */
  fallbackCoverImageUrl?: string | null;
  /** ログインユーザーのフォルダ一覧。アクション「お気に入り」で利用 */
  folders?: FolderSummary[];
  /** 既にお気に入り登録されている spot id 集合 */
  bookmarkedSpotIds?: Set<string>;
  /** ログイン状態（未ログインなら favorite ボタンが /auth/login に飛ばす） */
  viewerLoggedIn?: boolean;
  /** 「地図」アイコンの jump 先 anchor id（ページ内 ArticleSpotsMap の id） */
  mapAnchorId?: string;
};

/**
 * 旅程プラン記事の構造化タイムライン（縦タイムライン版）。
 *
 * スポットを大きめのカードで縦に並べ、カードとカードの間を点線で繋ぐ。
 * 点線の横に「徒歩 15 分」「メトロ 8 分 (Line 4)」のような移動手段ピルを置く。
 *
 * 未購入時は:
 *   - スポット名はマスク（??????）
 *   - 写真は blur + grayscale
 *   - 時刻 / 移動手段 / 所要時間は表示（流れだけは見える）
 *   - 末尾に「購入で全公開」CTA を出す
 */
export function ItineraryTimeline({
  articleId,
  blocks,
  spots,
  defaultUnlocked,
  photoEntries,
  fallbackCoverImageUrl,
  bookmarkedSpotIds,
  viewerLoggedIn = false,
  mapAnchorId,
}: Props) {
  const [unlocked, setUnlocked] = useState(defaultUnlocked);
  useEffect(() => {
    if (defaultUnlocked) return;
    if (Purchases.has(articleId)) setUnlocked(true);
  }, [articleId, defaultUnlocked]);

  const spotsById = new Map(spots.map((s) => [s.id, s]));

  // spotId → 駐在員由来の写真 URL マップ。
  // photoEntries は spotId 指定がある順に走査して最初の 1 件を採用。
  const writerPhotoBySpot = new Map<string, string>();
  for (const e of photoEntries ?? []) {
    if (!e.spotId) continue;
    if (!writerPhotoBySpot.has(e.spotId) && e.imageUrl) {
      writerPhotoBySpot.set(e.spotId, e.imageUrl);
    }
  }
  // spotId に紐付かない写真エントリは、写真の無いカードの最終フォールバック用。
  const orphanPhotos = (photoEntries ?? [])
    .filter((e) => !e.spotId && e.imageUrl)
    .map((e) => e.imageUrl);

  if (blocks.length === 0) return null;

  return (
    <section className="rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-[20px] font-bold tracking-tight">旅程</h3>
        {!unlocked ? (
          <span
            aria-label="購入で解放"
            title="購入で解放"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-foreground/50"
          >
            <Lock className="h-3 w-3" />
          </span>
        ) : null}
      </div>

      <ol className="relative">
        {/* IIFE で `let orphanIdx` を抱えて、spotId に紐付かない写真を
            上から順にカードへ割り当てる。 */}
        {(() => {
          let orphanIdx = 0;
          return blocks.map((b, idx) => {
          const isLast = idx === blocks.length - 1;
          const spot = b.spotId ? spotsById.get(b.spotId) : undefined;
          const isFreeBlock = !spot;
          const placeName = unlocked
            ? (spot?.name ?? b.freeName ?? 'スポット未設定')
            : '★★★★★★★';
          const address = spot?.address;
          // 写真フォールバック順:
          //   1. spot.photoUrls[0] (Google Places autocomplete 由来)
          //   2. photoEntries で spotId が一致する写真 (駐在員アップ)
          //   3. spotId に紐付かない photoEntries を idx 順に消費
          //   4. それも無ければ最終手段で記事カバー画像
          let photo: string | null = spot?.photoUrls?.[0] ?? null;
          if (!photo && spot) {
            photo = writerPhotoBySpot.get(spot.id) ?? null;
          }
          if (!photo && orphanPhotos[orphanIdx]) {
            photo = orphanPhotos[orphanIdx] ?? null;
            orphanIdx += 1;
          }
          // 最終フォールバックは最初のカードに限定。全カードに同じカバー画像が
          // 並ぶと違和感が大きいので、2 枚目以降は「写真なし」プレースホルダのまま。
          if (!photo && idx === 0 && fallbackCoverImageUrl) {
            photo = fallbackCoverImageUrl;
          }

          const transportKey = (b.transportToNext ?? null) as TransportKey | null;
          const TransportIcon = transportKey
            ? TRANSPORT_ICON[transportKey] ?? ArrowDown
            : ArrowDown;
          const showConnector =
            !isLast &&
            (b.transportToNext || b.travelMinutesAfter || b.transportNote);

          return (
            <li key={b.id ?? idx} className="relative">
              {/* ============ スポットカード ============ */}
              <div
                className={
                  'relative overflow-hidden rounded-xl border border-border bg-background ' +
                  'border-l-[3px] border-l-primary-500 ' +
                  (isFreeBlock ? 'border-l-foreground/20 ' : '') +
                  'shadow-sm'
                }
              >
                {/* 時刻バッジ。カード上部に小さく */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-2">
                  <p className="inline-flex items-center gap-1.5 text-[12px] font-bold tabular text-primary-300">
                    <Clock className="h-3.5 w-3.5" />
                    {b.startTime}
                    {b.endTime ? (
                      <span className="text-foreground/50">
                        {' '}
                        – {b.endTime}
                      </span>
                    ) : null}
                  </p>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40 tabular">
                    #{idx + 1}
                  </span>
                </div>

                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:gap-4">
                  {/* 写真サムネ（spot 由来のときのみ） */}
                  {!isFreeBlock ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-muted sm:w-44 sm:shrink-0">
                      {photo ? (
                        <Image
                          src={photo}
                          alt={unlocked ? placeName : '購入後に表示'}
                          fill
                          sizes="(min-width: 640px) 176px, 100vw"
                          className={
                            'object-cover transition ' +
                            (unlocked ? '' : 'scale-110 blur-md grayscale')
                          }
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] text-foreground/40">
                          {unlocked ? '写真なし' : 'ロック中'}
                        </div>
                      )}
                      {!unlocked ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-foreground/10">
                          <Lock className="h-5 w-5 text-white drop-shadow" />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* 内容列 */}
                  <div className="min-w-0 flex-1">
                    <h4
                      className={
                        'flex items-start gap-1.5 text-[16px] font-bold leading-snug tracking-tight ' +
                        (unlocked ? 'text-foreground' : 'text-foreground/40')
                      }
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                      <span className={unlocked ? '' : 'tracking-[0.2em]'}>
                        {placeName}
                      </span>
                    </h4>
                    {unlocked && address ? (
                      <p className="mt-1 truncate text-[11px] text-foreground/60">
                        {address}
                      </p>
                    ) : null}
                    {spot?.category ? (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary-500/5 px-2 py-0.5 text-[10px] font-semibold text-primary-300">
                        {spot.category}
                      </p>
                    ) : null}
                    {b.notes ? (
                      <p
                        className={
                          'mt-2 whitespace-pre-line text-[13px] leading-relaxed ' +
                          (unlocked ? 'text-foreground/80' : 'text-foreground/30')
                        }
                      >
                        {unlocked ? b.notes : 'メモは購入後に表示されます'}
                      </p>
                    ) : null}

                    {/* スポットの説明（spot.description）。block notes とは別に、
                        場所そのものの紹介文として表示する。unlocked 時のみ。 */}
                    {unlocked && spot?.description?.trim() ? (
                      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-foreground/80">
                        {spot.description}
                      </p>
                    ) : null}

                    {/* スポットのコツ（spot.tip）= ライムの破線ボックス。unlocked 時のみ。 */}
                    {unlocked && spot?.tip?.trim() ? (
                      <div
                        className="mt-2 rounded-md border border-dashed px-3 py-2"
                        style={{ borderColor: '#A8E01C', background: '#F3FBE0' }}
                      >
                        <p className="mb-0.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#5E8B0E]">
                          <span aria-hidden>✨</span>
                          コツ
                        </p>
                        <p className="whitespace-pre-line text-[13px] leading-relaxed text-foreground/80">
                          {spot.tip}
                        </p>
                      </div>
                    ) : null}

                    {/* スポット紐付きカードのみ、unlocked のときアクション行を出す */}
                    {unlocked && !isFreeBlock && spot ? (
                      <SpotActionRow
                        spot={spot}
                        initiallyBookmarked={
                          bookmarkedSpotIds?.has(spot.id) ?? false
                        }
                        viewerLoggedIn={viewerLoggedIn}
                        mapAnchorId={mapAnchorId}
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* ============ 移動手段の点線コネクタ ============ */}
              {showConnector ? (
                <div className="my-1 flex items-stretch gap-3 px-4 sm:gap-4">
                  {/* 縦点線 */}
                  <div
                    aria-hidden
                    className="ml-2 flex w-0 flex-col items-center"
                  >
                    <span className="block min-h-[44px] flex-1 border-l-2 border-dashed border-foreground/25" />
                  </div>
                  {/* 移動手段ピル */}
                  <div className="flex flex-1 flex-wrap items-center gap-2 py-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold text-foreground/75">
                      <TransportIcon className="h-3.5 w-3.5 text-primary-300" />
                      {transportKey
                        ? TRANSPORT_LABEL[transportKey]
                        : '移動'}
                      {b.travelMinutesAfter
                        ? (
                          <>
                            <span className="text-foreground/30">・</span>
                            <span className="tabular">
                              {formatDuration(b.travelMinutesAfter)}
                            </span>
                          </>
                        )
                        : null}
                    </span>
                    {b.transportNote ? (
                      <span className="text-[11px] text-foreground/60">
                        {b.transportNote}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* 連続するブロック間の余白（コネクタが無いときの最小スペース） */}
              {!isLast && !showConnector ? (
                <div className="h-3" />
              ) : null}
            </li>
          );
          });
        })()}
      </ol>

      {/* 末尾に控えめな解放 CTA — 説明文は刈り込み、最短のひとこと */}
      {!unlocked ? (
        <div className="mt-5 rounded-md border border-dashed border-primary-300/60 bg-primary-500/5 px-4 py-3 text-center">
          <p className="text-[12px] font-bold text-primary-300">
            <Lock className="mr-1 inline h-3 w-3" />
            続きは購入後
          </p>
        </div>
      ) : null}
    </section>
  );
}

/**
 * タイムラインカード右下に並ぶアクション 3 ボタン（h-7 w-7 円形）:
 *   1. お気に入り — クリックで未分類フォルダに即追加 / 解除（簡易トグル）。
 *      フォルダ選択 UI は出さず、追加先は「未分類」固定にしてコンパクト化。
 *   2. 地図 — 同一ページ内 ArticleSpotsMap への anchor jump (scrollIntoView)。
 *   3. Google マップで開く — buildSpotGoogleMapsUrl で外部リンク（新タブ）。
 *
 * 文字ラベルは出さず、aria-label / title で識別する。
 */
function SpotActionRow({
  spot,
  initiallyBookmarked,
  viewerLoggedIn,
  mapAnchorId,
}: {
  spot: Spot;
  initiallyBookmarked: boolean;
  viewerLoggedIn: boolean;
  mapAnchorId?: string;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initiallyBookmarked);
  const [isPending, startTransition] = useTransition();

  const onToggleBookmark = () => {
    if (!viewerLoggedIn) {
      router.push(
        `/auth/login?redirectTo=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }
    startTransition(async () => {
      if (bookmarked) {
        const res = await unbookmarkSpot({ spotId: spot.id });
        if (res.ok) {
          setBookmarked(false);
          toast.success('お気に入りから外しました');
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await bookmarkSpot({ spotId: spot.id, folderId: null });
        if (res.ok) {
          setBookmarked(true);
          toast.success(`「${spot.name}」を未分類に追加しました`);
        } else {
          toast.error(res.error);
        }
      }
    });
  };

  const onJumpToMap = () => {
    if (!mapAnchorId) return;
    const el = document.getElementById(mapAnchorId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const googleMapsUrl = buildSpotGoogleMapsUrl({
    placeId: spot.googlePlaceId,
    lat: spot.lat,
    lng: spot.lng,
    fallbackQuery: spot.name + ' ' + (spot.address ?? ''),
  });

  const baseBtn =
    'inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 transition';

  return (
    <div className="mt-3 flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={onToggleBookmark}
        disabled={isPending}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? 'お気に入りから外す' : 'お気に入りに追加'}
        title={bookmarked ? 'お気に入り済み' : 'お気に入りに追加'}
        className={
          baseBtn +
          ' ' +
          (bookmarked
            ? 'bg-primary-700 text-white ring-primary-700 hover:bg-primary-500'
            : 'bg-card text-primary-300 ring-border hover:bg-primary-500/10 hover:ring-primary-300')
        }
      >
        <Bookmark
          className="h-3.5 w-3.5"
          fill={bookmarked ? 'currentColor' : 'none'}
        />
      </button>
      {mapAnchorId ? (
        <button
          type="button"
          onClick={onJumpToMap}
          aria-label="地図で見る"
          title="地図で見る"
          className={
            baseBtn +
            ' bg-card text-primary-300 ring-border hover:bg-primary-500/10 hover:ring-primary-300'
          }
        >
          <MapPin className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Google マップで開く"
        title="Google マップで開く"
        className={
          baseBtn +
          ' bg-card text-primary-300 ring-border hover:bg-primary-500/10 hover:ring-primary-300'
        }
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
