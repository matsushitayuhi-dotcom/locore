'use client';

import { useMemo, useRef } from 'react';
import type { Spot } from '@/lib/mock';
import { buildSpotGoogleMapsUrl } from '@/lib/maps/googleMapsUrls';
import { renderArticleBodyHtml } from '@/lib/markdown/render';
import { Paywall } from '../../Paywall';
import { ArticleSpotsMap } from '../../ArticleSpotsMap';
import { SpotFavoriteButton } from '../../SpotFavoriteButton';
import { BulkSpotFavoriteButton } from '../../BulkSpotFavoriteButton';
import { ReviewFormToggle } from '../ReviewFormToggle';
import { CSS } from './placeGuideCss';
import {
  fmtDate,
  HeroNetCanvas,
  PinIcon,
  CostIcon,
  hasCoords,
  pinsEmbedUrl,
  useReveal,
  authorMeta,
} from './shared';
import {
  AuthorCard,
  RelatedArticles,
  ReviewsList,
  SpotTipBox,
  type EngagementProps,
} from './engagement';

/**
 * ブログ・場所あり（place-guide）の v2 レイアウト。
 *
 * Phase A の新デザイン本文（場所カード / ピン地図 / 場所リスト）を現行の実データ（spots）で
 * 描画しつつ、Phase B の課金（Paywall）とインタラクション（いいね/保存・スポット保存・
 * レビュー・著者・関連・地図）を新スタイルに織り込む。
 *
 * ゲート意味論（収益直結）:
 *   - unlocked 時のみ、場所カードの詳細（名前 / 住所 / description / tip / コスト /
 *     地図リンク）と body_paid・地図・レビューフォームを出す。
 *   - 未解放時は新スタイルの無料部分（ヒーロー＋導入＝article.body）だけを見せ、残りは
 *     <Paywall>（masked スポット）に委ねる。有料詳細は一切出さない。
 */
export type PlaceGuideArticleV2Props = EngagementProps & {
  region: { nameJa: string } | null;
  country: { nameJa: string } | null;
  heroActions?: React.ReactNode;
};

export function PlaceGuideArticleV2(props: PlaceGuideArticleV2Props) {
  const {
    article,
    writer,
    spots,
    reviews,
    related,
    region,
    country,
    unlocked,
    purchasedOrOwner,
    isOwner,
    viewerLoggedIn,
    folders,
    bookmarkedSpotIds,
    myReview,
    previewMode,
    authorServices,
    heroActions,
  } = props;

  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, '.pg-rev');

  const areaLabel = region?.nameJa ?? article.area ?? '';
  const countryLabel = country?.nameJa ?? '';
  const introHtml = useMemo(
    () => (article.body?.trim() ? renderArticleBodyHtml(article.body) : ''),
    [article.body],
  );
  const paidHtml = useMemo(
    () =>
      article.bodyPaid?.trim() ? renderArticleBodyHtml(article.bodyPaid) : '',
    [article.bodyPaid],
  );

  const mapPts = useMemo(
    () =>
      spots
        .filter((s) => hasCoords(s.lat, s.lng))
        .map((s) => ({ lat: s.lat, lng: s.lng })),
    [spots],
  );
  const hasMap = mapPts.length > 0;

  // spot 説明の構造化フォールバック（description 未入力時のみ・Phase C-2 フォールバック維持）
  const spotFallbackDesc = (s: Spot): string => {
    const bits: string[] = [];
    if (s.address) bits.push(s.address);
    if (s.openingHours) bits.push(s.openingHours);
    if (s.tags?.length) bits.push(s.tags.map((t) => `#${t}`).join(' '));
    return bits.join(' / ');
  };

  return (
    <div className="pg" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== HERO ===== */}
      <header className="pg-hero">
        <div className="pg-hbg" style={{ backgroundImage: `url('${article.coverImageUrl}')` }} />
        <HeroNetCanvas className="pg-hnet" />
        <div className="pg-hshade" />
        <div className="pg-hinner">
          <span className="pg-hkick">
            PLACE GUIDE{countryLabel ? ` · ${countryLabel}` : ''}
            {areaLabel ? ` · ${areaLabel}` : ''}
          </span>
          <h1>{article.title}</h1>
          {writer ? (
            <div className="pg-hauthor">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={writer.avatarUrl} alt="" />
              <div>
                <div className="nm">{writer.name}</div>
                <div className="meta">{authorMeta(writer)}</div>
              </div>
            </div>
          ) : null}
          <div className="pg-hmeta">
            <span className="pg-pill">
              紹介 <b>{spots.length}か所</b>
            </span>
            {areaLabel ? (
              <span className="pg-pill">
                エリア <b>{areaLabel}</b>
              </span>
            ) : null}
            <span className="pg-pill">
              順番 <b>なし（順不同）</b>
            </span>
          </div>
          {heroActions ? <div className="pg-heroact">{heroActions}</div> : null}
        </div>
        <div className="pg-scroll">
          読む
          <span className="ln" />
        </div>
      </header>

      {/* ===== 導入（無料 body）===== */}
      {introHtml ? (
        <section className="pg-intro pg-rev">
          <div className="pg-wrap">
            <span className="pg-kicker">— Intro</span>
            <div
              className="pg-intro-body"
              dangerouslySetInnerHTML={{ __html: introHtml }}
            />
          </div>
        </section>
      ) : null}

      {!unlocked ? (
        /* ===== 未解放: Paywall（有料詳細は一切出さない）===== */
        <section className="pg-listsec">
          <div className="pg-wrap">
            <Paywall
              article={article}
              bodyAfter={paidHtml ? article.bodyPaid! : ''}
              spots={spots}
              folders={folders}
              bookmarkedSpotIds={bookmarkedSpotIds}
              viewerLoggedIn={viewerLoggedIn}
              alreadyPurchased={purchasedOrOwner}
            />
          </div>
        </section>
      ) : (
        <>
          {/* ===== 場所紹介（順不同・解放時のみ）===== */}
          <section className="pg-places">
            <div className="pg-wide">
              <div className="pg-placeshead pg-rev">
                <span className="pg-kicker">— The places</span>
                <h2>場所を、ひとつずつ</h2>
                <p>各場所は独立。気になったところから。全{spots.length}か所。</p>
              </div>
              <div className="pg-prich">
                {spots.map((s, i) => {
                  const photo = s.photoUrls?.[0];
                  const mapHref =
                    hasCoords(s.lat, s.lng) || s.googlePlaceId
                      ? buildSpotGoogleMapsUrl({
                          placeId: s.googlePlaceId ?? null,
                          lat: s.lat,
                          lng: s.lng,
                          fallbackQuery: `${s.name} ${areaLabel}`,
                        })
                      : null;
                  const desc = s.description?.trim() || spotFallbackDesc(s);
                  return (
                    <article
                      key={s.id}
                      className={`pg-prow pg-rev${photo ? '' : ' nophoto'}`}
                    >
                      {photo ? (
                        <div className="pg-pphoto">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo} alt="" loading="lazy" />
                          {s.category ? <span className="pg-pcat">{s.category}</span> : null}
                        </div>
                      ) : null}
                      <div className="pg-pbody">
                        <div className="pg-pname">
                          <span className="pg-pidx">{String(i + 1).padStart(2, '0')}</span>
                          <h3>{s.name}</h3>
                        </div>
                        {s.address ? (
                          <div className="pg-pplace">
                            <PinIcon />
                            {s.address}
                          </div>
                        ) : null}
                        {desc ? <p className="pg-ptxt">{desc}</p> : null}
                        {s.tip?.trim() ? (
                          <div style={{ marginTop: 12 }}>
                            <SpotTipBox tip={s.tip} />
                          </div>
                        ) : null}
                        <div className="pg-pextras">
                          {s.priceEstimate ? (
                            <span className="pg-cost">
                              <CostIcon />
                              {s.priceEstimate}
                            </span>
                          ) : null}
                          {mapHref ? (
                            <a
                              className="pg-maplink"
                              href={mapHref}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <PinIcon />
                              地図で見る
                            </a>
                          ) : null}
                          <SpotFavoriteButton
                            spotId={s.id}
                            spotName={s.name}
                            bookmarked={bookmarkedSpotIds?.has(s.id) ?? false}
                            folders={folders}
                            viewerLoggedIn={viewerLoggedIn}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {spots.length > 0 ? (
                <div className="pg-placeshead pg-rev" style={{ marginTop: 20 }}>
                  <div className="pg-heroact" style={{ marginTop: 0 }}>
                    <BulkSpotFavoriteButton
                      spotIds={spots.map((s) => s.id)}
                      folders={folders}
                      viewerLoggedIn={viewerLoggedIn}
                      bookmarkedSpotIds={bookmarkedSpotIds}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* ===== 有料パート本文（body_paid・解放時のみ）===== */}
          {paidHtml ? (
            <section className="pg-intro" style={{ paddingTop: 8 }}>
              <div className="pg-wrap">
                <div
                  aria-hidden
                  style={{
                    textAlign: 'center',
                    letterSpacing: '.6em',
                    color: 'var(--bd2)',
                    margin: '8px 0 24px',
                  }}
                >
                  ◆ ◆ ◆
                </div>
                {previewMode ? (
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <span className="pg-kicker">有料パート（プレビュー解除中）</span>
                  </div>
                ) : null}
                <div
                  className="pg-ptxt"
                  style={{ fontSize: 16, lineHeight: 1.95 }}
                  dangerouslySetInnerHTML={{ __html: paidHtml }}
                />
              </div>
            </section>
          ) : null}

          {/* ===== ピン集約マップ（自動生成・解放時のみ）===== */}
          {hasMap ? (
            <section className="pg-mapsec">
              <div className="glow" />
              <div className="pg-wide">
                <div className="pg-maphead pg-rev">
                  <span className="pg-kicker">— Map</span>
                  <h2>全{mapPts.length}か所のピン</h2>
                  <p>
                    各場所の位置から自動生成。順路ではなく、ピンとして散らした集約マップです。
                  </p>
                </div>
                <div className="pg-mapframe pg-rev">
                  <span className="pg-mapbadge">Google マップ連携</span>
                  <iframe
                    title="場所紹介マップ"
                    src={pinsEmbedUrl(mapPts)}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </section>
          ) : null}

          {/* ===== 縦並び場所リスト（解放時のみ）===== */}
          <section className="pg-listsec">
            <div className="pg-wrap">
              <div className="pg-listhead pg-rev">
                <span className="pg-kicker">— Index</span>
                <h2>この記事で紹介したスポット</h2>
              </div>
              <div className="pg-list">
                {spots.map((s) => {
                  const photo = s.photoUrls?.[0];
                  const mapHref =
                    hasCoords(s.lat, s.lng) || s.googlePlaceId
                      ? buildSpotGoogleMapsUrl({
                          placeId: s.googlePlaceId ?? null,
                          lat: s.lat,
                          lng: s.lng,
                          fallbackQuery: `${s.name} ${areaLabel}`,
                        })
                      : null;
                  return (
                    <div key={s.id} className="pg-lrow pg-rev">
                      {photo ? (
                        <div className="pg-lthumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo} alt="" loading="lazy" />
                        </div>
                      ) : null}
                      <div className="pg-lbody">
                        {s.category ? <div className="pg-lcat">{s.category}</div> : null}
                        <h3>{s.name}</h3>
                        {s.address ? <div className="pg-lplace">{s.address}</div> : null}
                      </div>
                      {mapHref ? (
                        <a
                          className="pg-lgo"
                          href={mapHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <PinIcon />
                          地図
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ===== スポット地図（解放時のみ）===== */}
          <section className="pg-mapsec" style={{ paddingTop: 8 }}>
            <div className="pg-wide">
              <div id="article-spots-map" className="scroll-mt-20 pg-rev">
                <ArticleSpotsMap
                  spots={spots}
                  articleType={article.articleType}
                  itineraryBlocks={article.itineraryBlocks ?? null}
                  photoEntries={article.photoEntries ?? null}
                  unlocked={unlocked}
                  fallbackPhotoUrl={article.coverImageUrl ?? null}
                />
              </div>
            </div>
          </section>

          {/* ===== レビュー投稿（購入読者のみ。preview / owner では出さない）===== */}
          {!previewMode && !isOwner ? (
            <section className="pg-listsec" style={{ padding: '8px 0 0' }}>
              <div className="pg-wrap">
                <ReviewFormToggle articleId={article.id} initial={myReview} />
              </div>
            </section>
          ) : null}
        </>
      )}

      {/* ===== 著者カード ＋ サービス ===== */}
      <section className="pg-authsec">
        <div className="pg-wide">
          <AuthorCard writer={writer} authorServices={authorServices} />
        </div>
      </section>

      {/* ===== レビュー一覧 ===== */}
      <section className="pg-listsec" style={{ padding: '0 0 8px' }}>
        <div className="pg-wrap">
          <ReviewsList reviews={reviews} />
        </div>
      </section>

      {/* ===== 関連記事 ===== */}
      <RelatedArticles related={related} />

      {/* ===== 日付フッター ===== */}
      <section className="pg-dates">
        <div className="pg-wide">
          <div className="pg-dateline pg-rev">
            <span>
              公開 <b>{fmtDate(article.publishedAt)}</b>
            </span>
            <i />
            <span>
              最終更新 <b>{fmtDate(article.publishedAt)}</b>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
