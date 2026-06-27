'use client';

import { useMemo, useRef } from 'react';
import { buildSpotGoogleMapsUrl } from '@/lib/maps/googleMapsUrls';
import { renderArticleBodyHtml } from '@/lib/markdown/render';
import { Paywall } from '../../Paywall';
import { ArticleSpotsMap } from '../../ArticleSpotsMap';
import { ReviewFormToggle } from '../ReviewFormToggle';
import { CSS } from './placeGuideCss';
import {
  fmtDate,
  HeroNetCanvas,
  PinIcon,
  CostIcon,
  BulbIcon,
  hasCoords,
  useReveal,
  authorMeta,
} from './shared';
import {
  AuthorCard,
  RelatedArticles,
  ReviewsList,
  type EngagementProps,
} from './engagement';

/**
 * ブログ・場所あり（place-guide）の v2 レイアウト。
 *
 * モック（PlaceGuideMock）の見た目を正として、実データ（spots）で描画する。場所カードは
 * 写真付き（モックの .pg-prow / .pg-pphoto・左右交互）。記事レベルのいいね/保存（ヒーロー）は
 * 維持するが、スポット単位のお気に入りボタンはモックに無いため撤去。課金（Paywall）は維持。
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
                  // 写真はモック準拠で常に表示。spot 写真が無ければ記事カバーへフォールバック。
                  const photo = s.photoUrls?.[0] || article.coverImageUrl;
                  const mapHref =
                    hasCoords(s.lat, s.lng) || s.googlePlaceId
                      ? buildSpotGoogleMapsUrl({
                          placeId: s.googlePlaceId ?? null,
                          lat: s.lat,
                          lng: s.lng,
                          fallbackQuery: `${s.name} ${areaLabel}`,
                        })
                      : null;
                  // 説明は spot.description のみ。営業時間・tags の羅列ダンプは出さない
                  // （住所は下の .pg-pplace に1行で別途表示）。
                  const desc = s.description?.trim() || '';
                  return (
                    <article key={s.id} className="pg-prow pg-rev">
                      <div className="pg-pphoto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt="" loading="lazy" />
                        {s.category ? <span className="pg-pcat">{s.category}</span> : null}
                      </div>
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
                        {/* spot.tip（モック .pg-ptip 準拠の破線「コツ」・Phase C-2） */}
                        {s.tip?.trim() ? (
                          <div className="pg-ptip">
                            <BulbIcon />
                            <div>
                              <b>ローカルのコツ</b>
                              <span className="tx">{s.tip}</span>
                            </div>
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
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
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

          {/* ピン集約マップは廃止。各場所の「地図で見る」リンク＋末尾の
              「この記事で紹介したスポット」リストで個別に地図導線を提供する。 */}

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

      {/* ===== 著者カード ＋ サービス（モック .pg-authcard 準拠）===== */}
      <section className="pg-authsec">
        <div className="pg-wide">
          <AuthorCard
            writer={writer}
            authorServices={authorServices}
            variant="pg"
          />
        </div>
      </section>

      {/* ===== レビュー一覧 ===== */}
      <section className="pg-listsec" style={{ padding: '0 0 8px' }}>
        <div className="pg-wrap">
          <ReviewsList reviews={reviews} />
        </div>
      </section>

      {/* ===== 関連記事 ===== */}
      <RelatedArticles related={related} variant="pg" />

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
