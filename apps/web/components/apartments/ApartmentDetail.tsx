'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ApplyButton } from '@/components/community/ApplyButton';
import { OwnerControls } from '@/app/apartments/[id]/OwnerControls';
import {
  APARTMENT_AMENITIES,
  APARTMENT_LISTING_TYPE_LABEL,
  type ApartmentListingType,
  type ApartmentMetadata,
} from '@/lib/community/constants';
import { CSS } from './apptDetailCss';

/**
 * /apartments/[id] — Airbnb 風 住居詳細ページ (クライアント)。
 *
 * ★ CSS は apptDetailCss.ts の文字列を生 <style dangerouslySetInnerHTML> で描画。
 *   styled-jsx / :global() は SSR 初回で当たらないため使わない (.apt- プレフィックス)。
 *
 * 偽データは出さない:
 *   - ★評価 / レビュー件数 / 満足度バーは一切表示しない (実データ無し)。
 *   - 右カラムは「予約」ではなく「問い合わせ」型。日付予約・偽の手数料計算は作らない。
 *     内訳は家賃 + 管理費 = 月額合計（敷金は退去時精算の注記）の素直な合算のみ。
 */

export type ApartmentDetailData = {
  id: string;
  title: string;
  body: string; // markdown → html 済み
  status: 'active' | 'closed' | 'expired';
  photos: string[];
  locationText: string | null;
  cityNameJa: string | null;
  priceAmount: number | null;
  priceCurrency: string;
  metadata: ApartmentMetadata;
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
  contactEmail: string | null;
  authorId: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  authorBio: string | null;
  authorResidencyYears: number | null;
  authorVerified: boolean;
};

type Props = {
  post: ApartmentDetailData;
  viewerUserId: string | null;
  isOwner: boolean;
};

// ----- インライン SVG (lucide 互換のストロークアイコン) -----
const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const Ic = {
  share: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M12 21s-7-4.6-9.4-8.5C1 9.6 2.4 6 6 6c2 0 3.2 1.2 4 2.3C10.8 7.2 12 6 14 6c3.6 0 5 3.6 3.4 6.5C19 16.4 12 21 12 21z" /></svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.6}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" /></svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.5}><path d="M9 6l6 6-6 6" /></svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.2}><path d="M5 12l5 5L20 7" /></svg>
  ),
  verified: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.4}><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 17.7l.9-5.4L4.2 8.5l5.4-.8z" /></svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" /></svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M3 11l9-8 9 8M5 10v10h14V10M9 20v-6h6v6" /></svg>
  ),
  sofa: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" /><path d="M2 12a2 2 0 0 1 4 0v3h12v-3a2 2 0 0 1 4 0v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" /><path d="M6 19v2M18 19v2" /></svg>
  ),
  train: (
    <svg viewBox="0 0 24 24" {...stroke}><rect x="5" y="3" width="14" height="13" rx="3" /><path d="M5 11h14M9 20l-2 2M15 20l2 2M8 16h.01M16 16h.01" /></svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" {...stroke}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
  ),
  zap: (
    <svg viewBox="0 0 24 24" {...stroke}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
  ),
  mapPin: (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
  ),
};

// ----- 設備アイコン -----
const AmenIc: Record<string, JSX.Element> = {
  wifi: <svg viewBox="0 0 24 24" {...stroke}><path d="M5 12.5a10 10 0 0114 0M8 16a5 5 0 018 0M12 20h.01" /></svg>,
  kitchen: <svg viewBox="0 0 24 24" {...stroke}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M7 4v6" /></svg>,
  washer: <svg viewBox="0 0 24 24" {...stroke}><rect x="4" y="2" width="16" height="20" rx="2" /><circle cx="12" cy="14" r="4" /><path d="M8 6h.01M11 6h.01" /></svg>,
  dryer: <svg viewBox="0 0 24 24" {...stroke}><rect x="4" y="2" width="16" height="20" rx="2" /><circle cx="12" cy="13" r="5" /><path d="M10 11c1 1 3 1 4 0" /></svg>,
  heating: <svg viewBox="0 0 24 24" {...stroke}><path d="M4 8h16M6 8V6a2 2 0 012-2h8a2 2 0 012 2v2M8 12v6M16 12v6M12 12v6" /></svg>,
  aircon: <svg viewBox="0 0 24 24" {...stroke}><rect x="3" y="5" width="18" height="9" rx="2" /><path d="M7 18h.01M12 18h.01M17 18h.01" /></svg>,
  fridge: <svg viewBox="0 0 24 24" {...stroke}><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M6 10h12M9 5v2M9 13v3" /></svg>,
  microwave: <svg viewBox="0 0 24 24" {...stroke}><rect x="2" y="5" width="20" height="14" rx="2" /><rect x="5" y="8" width="9" height="8" rx="1" /><path d="M18 9v6" /></svg>,
  dishwasher: <svg viewBox="0 0 24 24" {...stroke}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M4 7h16M8 4.5h.01M11 4.5h.01M9 11c1.5 2 1.5 4 0 6" /></svg>,
  elevator: <svg viewBox="0 0 24 24" {...stroke}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7h6M9 11h6M9 15h4" /></svg>,
  bathtub: <svg viewBox="0 0 24 24" {...stroke}><path d="M4 12h16v3a4 4 0 01-4 4H8a4 4 0 01-4-4zM6 12V6a2 2 0 012-2h.5" /><path d="M6 19l-1 2M18 19l1 2" /></svg>,
  shower: <svg viewBox="0 0 24 24" {...stroke}><path d="M4 4l5 5M14 6a4 4 0 016 4H10a4 4 0 014-4zM10 17v.01M13 19v.01M16 17v.01" /></svg>,
  balcony: <svg viewBox="0 0 24 24" {...stroke}><path d="M3 10h18M5 10V5a7 7 0 0114 0v5M4 14v6M9 14v6M14 14v6M19 14v6M3 14h18" /></svg>,
  bike: <svg viewBox="0 0 24 24" {...stroke}><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M6 17l4-8h5l2 8M10 9l3 0" /></svg>,
  bath_dryer: <svg viewBox="0 0 24 24" {...stroke}><path d="M5 12h14v3a4 4 0 01-4 4H9a4 4 0 01-4-4z" /><path d="M9 4c1 1 1 2 0 3M15 4c1 1 1 2 0 3" /></svg>,
  trash: <svg viewBox="0 0 24 24" {...stroke}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14" /></svg>,
  tv: <svg viewBox="0 0 24 24" {...stroke}><rect x="2" y="5" width="20" height="13" rx="2" /><path d="M8 21h8M12 18v3" /></svg>,
  workspace: <svg viewBox="0 0 24 24" {...stroke}><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></svg>,
};

function fmtDate(d?: string | null): string | null {
  if (!d) return null;
  const date = new Date(d.length === 10 ? d + 'T00:00:00Z' : d);
  if (isNaN(date.getTime())) return d;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function currencySymbol(cur: string): string {
  if (cur === 'EUR') return '€';
  if (cur === 'JPY') return '¥';
  if (cur === 'USD') return '$';
  if (cur === 'GBP') return '£';
  return cur + ' ';
}

export function ApartmentDetail({ post, viewerUserId, isOwner }: Props) {
  const [saved, setSaved] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAllAmen, setShowAllAmen] = useState(false);

  const meta = post.metadata ?? {};
  const lt = meta.listing_type as ApartmentListingType | undefined;
  const sym = currencySymbol(post.priceCurrency);

  const photos = post.photos ?? [];
  const hasPhotos = photos.length > 0;
  const galleryClass =
    photos.length === 1
      ? ' one'
      : photos.length === 2
        ? ' two'
        : photos.length === 3
          ? ' three'
          : '';

  const rent = meta.rent_monthly ?? post.priceAmount ?? null;
  const charges = meta.charges_monthly ?? null;
  const deposit = meta.deposit ?? null;
  const total = rent != null ? rent + (charges ?? 0) : null;
  const availFrom = fmtDate(meta.available_from);

  const locLabel = post.locationText || post.cityNameJa || null;
  const hostName = post.authorName ?? '貸主';

  // 間取りラベル: bedrooms から推定。0=スタジオ
  const layoutLabel =
    typeof meta.bedrooms === 'number'
      ? meta.bedrooms === 0
        ? 'スタジオ'
        : `${meta.bedrooms}寝室`
      : null;

  // overview specs (データのある項目のみ)
  const ovrSpecs: string[] = [];
  if (typeof meta.bedrooms === 'number')
    ovrSpecs.push(meta.bedrooms === 0 ? 'スタジオ' : `${meta.bedrooms}寝室`);
  if (typeof meta.size_sqm === 'number') ovrSpecs.push(`${meta.size_sqm}㎡`);

  // ハイライト (metadata から自動生成、最大4件)
  const highlights: { ic: keyof typeof Ic; b: string; p?: string }[] = [];
  if (meta.furnished)
    highlights.push({ ic: 'sofa', b: '家具・家電付きですぐ入居可', p: '到着後すぐに生活を始められます' });
  if (meta.nearest_station)
    highlights.push({ ic: 'train', b: `${meta.nearest_station} 最寄`, p: '駅近で移動に便利な立地' });
  if (availFrom)
    highlights.push({ ic: 'calendar', b: `${availFrom}から入居可`, p: 'スケジュールに合わせて入居できます' });
  if (meta.utilities_included)
    highlights.push({ ic: 'zap', b: '光熱費込み', p: '水道・電気・ガス等が家賃に含まれます' });
  const topHighlights = highlights.slice(0, 4);

  // 物件概要テーブル (値のある項目のみ) — 元の compact な dl 形式で描画
  const specRows: { k: string; v: string; small?: string; icon?: JSX.Element }[] = [];
  if (rent != null)
    specRows.push({ k: '家賃', v: `${sym}${rent.toLocaleString()}`, small: '/ 月' });
  if (charges != null)
    specRows.push({ k: '管理費', v: `${sym}${charges.toLocaleString()}`, small: '/ 月' });
  if (deposit != null)
    specRows.push({ k: '敷金', v: `${sym}${deposit.toLocaleString()}`, small: '（退去時精算）' });
  if (availFrom) specRows.push({ k: '入居可能日', v: `${availFrom}〜`, icon: Ic.calendar });
  if (layoutLabel || typeof meta.size_sqm === 'number')
    specRows.push({
      k: '間取り / 広さ',
      v: layoutLabel ?? '—',
      small: typeof meta.size_sqm === 'number' ? `/ ${meta.size_sqm}㎡` : undefined,
      icon: Ic.home,
    });
  if (meta.nearest_station)
    specRows.push({ k: '最寄駅', v: meta.nearest_station, icon: Ic.train });
  if (lt) specRows.push({ k: '契約形態', v: APARTMENT_LISTING_TYPE_LABEL[lt] });
  if (meta.arrondissement)
    specRows.push({ k: 'エリア', v: meta.arrondissement, icon: Ic.mapPin });
  else if (post.cityNameJa)
    specRows.push({ k: 'エリア', v: post.cityNameJa, icon: Ic.mapPin });

  // 設備一覧: amenities (キー) を APARTMENT_AMENITIES でラベル+アイコン化
  const amenityItems = APARTMENT_AMENITIES.filter((a) =>
    post.amenities.includes(a.key),
  ).map((a) => ({ key: a.key, label: a.label, off: false }));
  // ペット不可 / 喫煙不可 を打消しで併記
  const negItems: { key: string; label: string; off: true }[] = [];
  if (meta.pets_ok === false)
    negItems.push({ key: 'no_pets', label: 'ペット不可', off: true });
  if (meta.smoking_ok === false)
    negItems.push({ key: 'no_smoking', label: '喫煙不可', off: true });
  const allAmen = [...amenityItems, ...negItems];
  const hasAmen = allAmen.length > 0;
  const visibleAmen = showAllAmen ? allAmen : allAmen.slice(0, 16);

  // ===== 地図 (ぼかし円) =====
  // 座標は約100mグリッドに丸めて真の番地が復元されないようにする (小数3桁≒111m)。
  const roundCoord = (n: number) => Math.round(n * 1000) / 1000;
  const hasGeo = post.latitude != null && post.longitude != null;
  const lat = hasGeo ? roundCoord(post.latitude as number) : null;
  const lng = hasGeo ? roundCoord(post.longitude as number) : null;
  const zoom = 16;
  // 円の見かけサイズを ~100m 相当に。mpp = 156543.03 * cos(lat) / 2^zoom
  const mpp = hasGeo
    ? (156543.03392 * Math.cos(((lat as number) * Math.PI) / 180)) /
      Math.pow(2, zoom)
    : 1;
  const circlePx = hasGeo ? Math.max(80, Math.min(220, Math.round(200 / mpp))) : 120;

  const mapQuery = hasGeo
    ? `${lat},${lng}`
    : post.cityNameJa
      ? post.cityNameJa
      : post.locationText || null;
  const mapSrc = mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=${
        hasGeo ? zoom : 14
      }&output=embed`
    : null;

  const closed = post.status !== 'active';

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('リンクをコピーしました');
      }
    } catch {
      /* キャンセル等は無視 */
    }
  };

  const initial = hostName[0]?.toUpperCase() ?? 'L';

  return (
    <div className="apt">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="apt-wrap">
        {/* breadcrumb */}
        <div className="apt-crumb">
          <Link href="/expat">コミュニティ</Link> ／{' '}
          <Link href="/apartments">住居</Link>
          {locLabel ? <> ／ {locLabel}</> : null}
        </div>

        {/* ===== title ===== */}
        <div className="apt-head">
          <h1>{post.title}</h1>
          <div className="apt-sub">
            {closed ? (
              <span className="apt-status closed">
                {post.status === 'closed' ? '成約済み' : '掲載終了'}
              </span>
            ) : (
              <span className="apt-status live">
                <i />
                募集中
              </span>
            )}
            {lt ? (
              <>
                <span className="apt-dot">·</span>
                <span className="apt-tag">{APARTMENT_LISTING_TYPE_LABEL[lt]}</span>
              </>
            ) : null}
            {locLabel ? (
              <>
                <span className="apt-dot">·</span>
                <span className="apt-loc">{locLabel}</span>
              </>
            ) : null}
            <div className="apt-acts">
              <button type="button" onClick={handleShare}>
                {Ic.share}共有
              </button>
              <button
                type="button"
                className={saved ? 'on' : ''}
                onClick={() => {
                  setSaved((v) => !v);
                  toast.success(saved ? '保存を解除しました' : '保存しました');
                }}
                aria-pressed={saved}
              >
                {Ic.heart}
                {saved ? '保存済み' : '保存'}
              </button>
            </div>
          </div>
        </div>

        {/* ===== gallery ===== */}
        {hasPhotos ? (
          <div className={`apt-gallery${galleryClass}`}>
            {photos.slice(0, 5).map((url, i) => (
              <button
                key={url + i}
                type="button"
                className={`cell${i === 0 ? ' big' : ''}`}
                onClick={() => setLightbox(true)}
                aria-label={`写真 ${i + 1} を拡大`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${post.title} の写真 ${i + 1}`} />
              </button>
            ))}
            {photos.length > 4 ? (
              <button
                type="button"
                className="apt-allphotos"
                onClick={() => setLightbox(true)}
              >
                {Ic.grid}すべての写真を表示（{photos.length}枚）
              </button>
            ) : null}
          </div>
        ) : (
          <div className="apt-gallery one">
            <div className="cell big">
              <div className="apt-ph">{Ic.image}</div>
            </div>
          </div>
        )}

        {/* status banner (closed/expired) */}
        {closed ? (
          <div className="apt-banner">
            {Ic.lock}
            <div>
              <b>{post.status === 'closed' ? '成約済み' : '掲載終了'}</b>
              <p>この物件は現在募集していません。</p>
            </div>
          </div>
        ) : null}

        {/* owner controls */}
        {isOwner ? (
          <div className="apt-owner">
            <p>あなたの投稿です。ステータスを変更できます。</p>
            <OwnerControls postId={post.id} status={post.status} />
          </div>
        ) : null}

        {/* ===== two-column (概要・ハイライト・説明 ＋ 右の問い合わせカード) ===== */}
        <div className="apt-cols">
          {/* LEFT */}
          <div>
            {/* overview */}
            <div className="apt-sec">
              <div className="apt-ovr">
                <div>
                  <div className="ttl">
                    {hostName} さんが貸し出す アパートメント全体
                  </div>
                  {ovrSpecs.length > 0 ? (
                    <div className="specs">
                      {ovrSpecs.map((s, i) => (
                        <span key={i}>
                          {i > 0 ? <span className="apt-dot">·</span> : null}
                          <b>{s}</b>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {post.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="ava" src={post.authorAvatarUrl} alt="" />
                ) : (
                  <div className="avaf">{initial}</div>
                )}
              </div>
            </div>

            {/* highlights */}
            {topHighlights.length > 0 ? (
              <div className="apt-sec">
                <ul className="apt-hl">
                  {topHighlights.map((h, i) => (
                    <li key={i}>
                      <span className="ic">{Ic[h.ic]}</span>
                      <div>
                        <b>{h.b}</b>
                        {h.p ? <p>{h.p}</p> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* description */}
            {post.body ? (
              <div className="apt-sec">
                <div
                  className={`apt-lead${expanded ? '' : ' clamp'}`}
                  dangerouslySetInnerHTML={{ __html: post.body }}
                />
                {!expanded ? (
                  <button
                    type="button"
                    className="apt-morebtn"
                    onClick={() => setExpanded(true)}
                  >
                    続きを読む{Ic.chevron}
                  </button>
                ) : null}
              </div>
            ) : null}

          </div>

          {/* RIGHT: inquiry card (sticky) */}
          <aside>
            <div className="apt-book">
              <div className="price">
                {rent != null && rent > 0 ? (
                  <>
                    <b>
                      {sym}
                      {rent.toLocaleString()}
                    </b>
                    <span>/ 月</span>
                  </>
                ) : rent === 0 ? (
                  <b className="free">無料</b>
                ) : (
                  <b className="free">応相談</b>
                )}
              </div>

              {availFrom ? (
                <div className="avail">
                  {Ic.check}
                  {availFrom}から入居可能
                </div>
              ) : null}

              {/* 内訳 (家賃 + 管理費 = 月額合計。偽の手数料計算はしない) */}
              {rent != null && rent > 0 ? (
                <div className="brk">
                  <div className="row">
                    <span>
                      家賃 <span className="mu">月額</span>
                    </span>
                    <span>
                      {sym}
                      {rent.toLocaleString()}
                    </span>
                  </div>
                  {charges != null ? (
                    <div className="row">
                      <span>
                        管理費 <span className="mu">月額</span>
                      </span>
                      <span>
                        {sym}
                        {charges.toLocaleString()}
                      </span>
                    </div>
                  ) : null}
                  {deposit != null ? (
                    <div className="row">
                      <span>
                        敷金 <span className="mu">退去時精算</span>
                      </span>
                      <span>
                        {sym}
                        {deposit.toLocaleString()}
                      </span>
                    </div>
                  ) : null}
                  <div className="row sum">
                    <span>月額合計</span>
                    <span>
                      {sym}
                      {(total ?? rent).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : null}

              {closed ? (
                <div className="closed">この物件は現在募集していません</div>
              ) : (
                <div className="ctawrap">
                  <ApplyButton
                    postId={post.id}
                    postTitle={post.title}
                    applyLabel="この物件について問い合わせる"
                    viewerLoggedIn={!!viewerUserId}
                    isOwnPost={isOwner}
                    closed={closed}
                    contactEmail={post.contactEmail}
                  />
                </div>
              )}

              <button
                type="button"
                className={`save${saved ? ' on' : ''}`}
                onClick={() => {
                  setSaved((v) => !v);
                  toast.success(saved ? '保存を解除しました' : '保存しました');
                }}
              >
                {saved ? '♥ 保存済み' : '♡ 保存する'}
              </button>

              <div className="note">
                {Ic.shield}
                <span>
                  送金前に必ず内見または本人確認を。Locore
                  外での前払い要求は詐欺の可能性があります。
                </span>
              </div>
            </div>
          </aside>

          {/* ===== 全幅セクション（概要以降は2カラムをまたいで中央・全幅） ===== */}
          <div className="apt-below">
            {/* spec table — 元のフォーマット (compact dl) */}
            {specRows.length > 0 ? (
              <div className="apt-sec">
                <h2>物件の概要</h2>
                <dl className="grid grid-cols-2 gap-y-3 rounded-xl bg-card p-4 text-[12px] ring-1 ring-border sm:grid-cols-3">
                  {specRows.map((r, i) => (
                    <div key={i}>
                      <dt className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50">
                        {r.icon ? (
                          <span className="inline-flex [&>svg]:h-3 [&>svg]:w-3">{r.icon}</span>
                        ) : null}
                        {r.k}
                      </dt>
                      <dd className="mt-0.5 text-[13px] font-medium text-foreground/85">
                        {r.v}
                        {r.small ? (
                          <span className="ml-1 font-normal text-foreground/55">{r.small}</span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {/* amenities */}
            {hasAmen ? (
              <div className="apt-sec">
                <h2>この物件の設備</h2>
                <div className="apt-amen">
                  {visibleAmen.map((a) => (
                    <div key={a.key} className={a.off ? 'off' : ''}>
                      {a.off ? Ic.check : AmenIc[a.key] ?? Ic.check}
                      <span>{a.label}</span>
                    </div>
                  ))}
                </div>
                {allAmen.length > 16 ? (
                  <button
                    type="button"
                    className="apt-amenbtn"
                    onClick={() => setShowAllAmen((v) => !v)}
                  >
                    {showAllAmen
                      ? '設備を折りたたむ'
                      : `設備をすべて表示（${allAmen.length}件）`}
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* map (blurred approximate area) */}
            {mapSrc ? (
              <div className="apt-sec">
                <h2>エリア</h2>
                <div className="apt-mapframe">
                  <iframe
                    title="物件のおおよそのエリア"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapSrc}
                  />
                  {/* 中心を覆うふんわり円。ピンを隠し正確な番地を秘匿 */}
                  <div
                    className="apt-mapcircle"
                    style={{ width: circlePx, height: circlePx }}
                  />
                </div>
                <div className="apt-maploc">
                  <b>
                    {locLabel ? `${locLabel} 周辺` : 'おおよそのエリア'}
                  </b>
                  <p>
                    おおよそのエリア（半径約100m）｜正確な住所は問い合わせ後にお伝えします。
                  </p>
                </div>
              </div>
            ) : null}

            {/* host */}
            <div className="apt-sec">
              <h2>貸主について</h2>
              <div className="apt-hostcard">
                {post.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="ava" src={post.authorAvatarUrl} alt="" />
                ) : (
                  <div className="avaf">{initial}</div>
                )}
                <div>
                  <div className="nm">
                    {hostName}
                    {post.authorVerified ? (
                      <span className="badge">{Ic.verified}本人確認済み</span>
                    ) : null}
                  </div>
                  {(post.cityNameJa || post.authorResidencyYears) ? (
                    <div className="meta">
                      {[
                        post.cityNameJa ? `${post.cityNameJa}在住` : null,
                        post.authorResidencyYears
                          ? `在住${post.authorResidencyYears}年`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  ) : null}
                  {post.authorBio ? (
                    <div className="bio">{post.authorBio}</div>
                  ) : null}
                  <Link href={`/users/${post.authorId}`} className="link">
                    プロフィールを見る{Ic.chevron}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* fraud notice */}
        <div className="apt-fraud">
          <div className="ft">
            {Ic.alert}
            問い合わせの前に — 詐欺の典型例
          </div>
          <ul>
            <li>
              内見せず契約：必ず実際に部屋を見てから契約してください。海外在住を理由に内見を拒む相手は要警戒。
            </li>
            <li>
              契約前送金 / 保証金前払い：正規の賃貸借契約書（contrat de
              bail）と引き換えに支払うのが原則です。
            </li>
            <li>
              相場より極端に安い物件：同じエリア・広さの相場と照らし、不自然に安い物件は釣り広告の可能性があります。
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>
            不審な点があれば <Link href="/contact">運営に通報</Link> してください。
          </p>
        </div>
      </div>

      {/* ===== lightbox ===== */}
      {lightbox && hasPhotos ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="写真一覧"
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(15,15,12,.92)',
            overflowY: 'auto',
            padding: '48px 16px',
          }}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="閉じる"
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              background: '#fff',
              border: 0,
              borderRadius: 10,
              padding: '8px 14px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            閉じる ✕
          </button>
          <div
            style={{
              maxWidth: 880,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url + i}
                src={url}
                alt={`${post.title} の写真 ${i + 1}`}
                style={{ width: '100%', borderRadius: 14 }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
